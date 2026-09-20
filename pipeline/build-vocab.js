/**
 * Sinh deck từ vựng TOEIC từ danh sách TSL 1.2 (D10: chạy trên máy, không gọi AI lúc dùng app).
 *
 * Chạy:
 *   node --env-file=.env pipeline/build-vocab.js                 # deck nền TSL (1250 từ)
 *   node --env-file=.env pipeline/build-vocab.js --list bsl      # deck cao cấp BSL (D30)
 *   node --env-file=.env pipeline/build-vocab.js --limit 20      # thử 20 từ đầu
 *   node --env-file=.env pipeline/build-vocab.js --no-ipa        # bỏ bước tra IPA cho nhanh
 *
 * KHÔNG chạy hai danh sách cùng lúc nếu chúng dùng chung file cache (xem WORDLISTS).
 *
 * Chạy lại nhiều lần được: từ nào đã có trong pipeline/.cache/ thì không gọi AI lại.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseTslCsv, WORDLISTS } from './lib/wordlists.js';
import { buildEntry } from './lib/vocab-entry.js';
import { buildVocabPrompt, parseVocabResponse, matchVocabResponse, VOCAB_PROMPT_VERSION } from './lib/prompt-vocab.js';
import { createGeminiProvider, withRetry, sleep, isDailyQuotaError, DEFAULT_GEMINI_MODELS } from './lib/ai-provider.js';
import { fetchIpaManyWiktionary } from './lib/ipa-wiktionary.js';
import { openCache, chunk, readCachedAi } from './lib/cache.js';
import { createDeckValidator, findDuplicateIds } from './lib/validate-deck.js';
import { projectPath, today, flagValue, flagNumber, hasFlag } from './lib/cli.js';

/**
 * Đọc tham số dòng lệnh.
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const name = flagValue(argv, '--list', 'tsl');
  const list = WORDLISTS[name];
  if (!list) {
    throw new Error(`--list không hợp lệ: "${name}". Chọn một trong: ${Object.keys(WORDLISTS).join(', ')}`);
  }
  return {
    list,
    limit: flagNumber(argv, '--limit', Infinity),
    batchSize: flagNumber(argv, '--batch-size', 50),
    withIpa: !hasFlag(argv, '--no-ipa'),
  };
}

/**
 * Đọc danh sách từ của một wordlist, đã bỏ phần trùng với danh sách nền.
 * @param {object} list - một mục trong WORDLISTS
 * @returns {Array<{word: string, rank: number}>}
 */
function readWords(list) {
  const words = parseTslCsv(readFileSync(projectPath(list.csv), 'utf8'), { rankColumn: list.rankColumn });
  if (!list.excludeFrom) return words;

  const base = WORDLISTS[list.excludeFrom];
  const seen = new Set(
    parseTslCsv(readFileSync(projectPath(base.csv), 'utf8'), { rankColumn: base.rankColumn })
      .map((w) => w.word),
  );
  const kept = words.filter((w) => !seen.has(w.word));
  console.log(`Bỏ ${words.length - kept.length} từ đã có trong deck ${base.deck}.`);
  return kept;
}

async function main() {
  const { list, limit, batchSize, withIpa } = parseArgs(process.argv.slice(2));

  const allWords = readWords(list);
  const words = Number.isFinite(limit) ? allWords.slice(0, limit) : allWords;
  console.log(`${list.attribution.source}: ${allWords.length} từ cần sinh, phiên này xử lý ${words.length} từ.`);

  const aiCache = openCache(projectPath(list.aiCache));
  const ipaCache = openCache(projectPath(list.ipaCache));
  const todo = words.filter((w) => !aiCache.has(w.word));
  console.log(`Đã có sẵn trong cache: ${words.length - todo.length} từ. Cần gọi AI: ${todo.length} từ.`);

  const models = (process.env.GEMINI_MODELS ?? DEFAULT_GEMINI_MODELS.join(','))
    .split(',').map((m) => m.trim()).filter(Boolean);

  if (todo.length > 0) {
    const batches = chunk(todo, batchSize);
    console.log(`Chia thành ${batches.length} lô, mỗi lô ${batchSize} từ. Model thử theo thứ tự: ${models.join(' → ')}`);

    let modelIndex = 0;
    for (const [index, batch] of batches.entries()) {
      const label = `Lô ${index + 1}/${batches.length}`;
      let done = false;

      // Hết hạn mức ngày của model này thì chuyển sang model kế tiếp, không bỏ cuộc ngay.
      while (!done && modelIndex < models.length) {
        const provider = createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: models[modelIndex] });
        try {
          const text = await withRetry(() => provider.generate(buildVocabPrompt(batch)));
          const { matched, missing } = matchVocabResponse(batch, parseVocabResponse(text));
          for (const item of matched) {
            aiCache.set(item.word, { ai: item.ai, model: provider.model, promptVersion: VOCAB_PROMPT_VERSION, date: today() });
          }
          aiCache.save();
          console.log(`${label} [${provider.model}]: nhận ${matched.length}/${batch.length} từ${missing.length ? ` (thiếu ${missing.length})` : ''}`);
          done = true;
        } catch (error) {
          if (isDailyQuotaError(error)) {
            console.log(`${label}: ${provider.model} đã hết hạn mức NGÀY → chuyển model tiếp theo`);
            modelIndex += 1;
            continue;
          }
          if (error.status === 401 || error.status === 403) {
            console.error(`${label}: LỖI — key sai hoặc chưa bật. Kiểm tra GEMINI_API_KEY trong .env.`);
            modelIndex = models.length;
            break;
          }
          console.error(`${label} [${provider.model}]: LỖI — ${error.message.slice(0, 160)}`);
          done = true; // bỏ lô này, từ chưa có vẫn nằm trong danh sách cần làm lần chạy sau
        }
      }

      if (modelIndex >= models.length) {
        console.log(`\nHết hạn mức của mọi model trong hôm nay. Đã dừng ở ${label}.`);
        console.log('→ Hạn mức free tier đặt lại vào nửa đêm giờ Thái Bình Dương. Chạy lại lệnh cũ là tiếp tục đúng chỗ đang dở.');
        break;
      }
      if (index < batches.length - 1) await sleep(4000);
    }
  }

  if (withIpa) {
    const need = words.filter((w) => aiCache.has(w.word) && !ipaCache.has(w.word));
    console.log(`Tra IPA cho ${need.length} từ...`);
    let transient = 0;
    // Wiktionary tra theo lô 20 từ/request; dictionaryapi.dev (lib/ipa.js) hay chết nên không dùng nữa.
    const results = await fetchIpaManyWiktionary(need.map((w) => w.word), {
      onProgress: (count, total) => console.log(`  ...${count}/${total}`),
    });
    for (const [word, ipa] of results) {
      // undefined = lỗi tạm thời: KHÔNG cache, để lần chạy sau tra lại.
      if (ipa === undefined) transient += 1;
      else ipaCache.set(word, ipa);
    }
    ipaCache.save();
    if (transient > 0) {
      console.log(`  ${transient} từ chưa tra được do từ điển lỗi tạm thời — chạy lại pipeline sẽ tự tra tiếp.`);
    }
  }

  // Mục cache đời đầu chưa kèm tên model — gắn thông tin của lần chạy đầu tiên (D13).
  const legacy = { model: 'gemini-3.8-flash', promptVersion: VOCAB_PROMPT_VERSION, date: '2026-09-19' };

  const entries = [];
  const skipped = [];
  for (const { word, rank } of words) {
    const cached = readCachedAi(aiCache.get(word), legacy);
    if (!cached) continue;
    const gen = {
      model: cached.model,
      promptVersion: cached.promptVersion,
      batch: cached.date,
      date: cached.date,
    };
    try {
      entries.push(buildEntry({
        word, rank, ai: cached.ai, ipa: ipaCache.get(word) ?? undefined, gen,
        deck: list.deck, idPrefix: list.idPrefix,
      }));
    } catch (error) {
      skipped.push(`${word}: ${error.message}`);
    }
  }

  if (entries.length === 0) {
    console.error('Không dựng được mục nào — chưa có dữ liệu AI. Dừng, không ghi đè file cũ.');
    process.exitCode = 1;
    return;
  }

  const deck = { deck: list.deck, version: 1, attribution: { ...list.attribution }, entries };

  const validate = createDeckValidator();
  const { valid, errors } = validate(deck);
  const duplicates = findDuplicateIds(deck);
  if (!valid || duplicates.length > 0) {
    console.error('Deck KHÔNG hợp lệ, không ghi file:');
    for (const error of errors.slice(0, 20)) console.error('  -', error);
    if (duplicates.length) console.error('  - id trùng:', duplicates.join(', '));
    process.exitCode = 1;
    return;
  }

  mkdirSync(projectPath('public/content'), { recursive: true });
  writeFileSync(projectPath(list.output), `${JSON.stringify(deck, null, 2)}\n`);
  console.log(`\nĐã ghi ${entries.length} từ vào ${list.output}`);
  if (skipped.length) {
    console.log(`Bỏ qua ${skipped.length} từ do dữ liệu AI thiếu:`);
    for (const line of skipped.slice(0, 10)) console.log('  -', line);
  }
  console.log(`Còn thiếu ${allWords.length - entries.length}/${allWords.length} từ so với danh sách đầy đủ.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
