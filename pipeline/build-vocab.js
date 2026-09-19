/**
 * Sinh deck từ vựng TOEIC từ danh sách TSL 1.2 (D10: chạy trên máy, không gọi AI lúc dùng app).
 *
 * Chạy:
 *   node --env-file=.env pipeline/build-vocab.js            # làm toàn bộ 1250 từ
 *   node --env-file=.env pipeline/build-vocab.js --limit 20 # thử 20 từ đầu
 *   node --env-file=.env pipeline/build-vocab.js --no-ipa   # bỏ bước tra IPA cho nhanh
 *
 * Chạy lại nhiều lần được: từ nào đã có trong pipeline/.cache/ thì không gọi AI lại.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { parseTslCsv, TSL_ATTRIBUTION } from './lib/tsl.js';
import { buildEntry } from './lib/vocab-entry.js';
import { buildVocabPrompt, parseVocabResponse, matchVocabResponse, VOCAB_PROMPT_VERSION } from './lib/prompt-vocab.js';
import { createGeminiProvider, withRetry, sleep, isDailyQuotaError, DEFAULT_GEMINI_MODELS } from './lib/ai-provider.js';
import { fetchIpa } from './lib/ipa.js';
import { openCache, chunk, readCachedAi } from './lib/cache.js';
import { createDeckValidator, findDuplicateIds } from './lib/validate-deck.js';

const ROOT = new URL('..', import.meta.url);
const path = (relative) => new URL(relative, ROOT).pathname;

const OUTPUT = path('public/content/vocab-toeic-tsl.json');
const AI_CACHE = path('pipeline/.cache/vocab-ai.json');
const IPA_CACHE = path('pipeline/.cache/ipa.json');

/**
 * Đọc tham số dòng lệnh.
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const limitFlag = argv.indexOf('--limit');
  const batchFlag = argv.indexOf('--batch-size');
  return {
    limit: limitFlag === -1 ? Infinity : Number.parseInt(argv[limitFlag + 1], 10),
    batchSize: batchFlag === -1 ? 25 : Number.parseInt(argv[batchFlag + 1], 10),
    withIpa: !argv.includes('--no-ipa'),
  };
}

async function main() {
  const { limit, batchSize, withIpa } = parseArgs(process.argv.slice(2));

  const csv = readFileSync(path('pipeline/data/TSL_12_stats.csv'), 'utf8');
  const allWords = parseTslCsv(csv);
  const words = Number.isFinite(limit) ? allWords.slice(0, limit) : allWords;
  console.log(`Danh sách TSL 1.2: ${allWords.length} từ, phiên này xử lý ${words.length} từ.`);

  const aiCache = openCache(AI_CACHE);
  const ipaCache = openCache(IPA_CACHE);
  const todo = words.filter((w) => !aiCache.has(w.word));
  console.log(`Đã có sẵn trong cache: ${words.length - todo.length} từ. Cần gọi AI: ${todo.length} từ.`);

  const models = (process.env.GEMINI_MODELS ?? DEFAULT_GEMINI_MODELS.join(','))
    .split(',').map((m) => m.trim()).filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);

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
            aiCache.set(item.word, { ai: item.ai, model: provider.model, promptVersion: VOCAB_PROMPT_VERSION, date: today });
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
    for (const [index, { word }] of need.entries()) {
      const ipa = await fetchIpa(word);
      // undefined = lỗi tạm thời: KHÔNG cache, để lần chạy sau tra lại.
      if (ipa === undefined) transient += 1;
      else ipaCache.set(word, ipa);
      if (index % 25 === 24) {
        ipaCache.save();
        console.log(`  ...${index + 1}/${need.length}`);
      }
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
      entries.push(buildEntry({ word, rank, ai: cached.ai, ipa: ipaCache.get(word) ?? undefined, gen }));
    } catch (error) {
      skipped.push(`${word}: ${error.message}`);
    }
  }

  if (entries.length === 0) {
    console.error('Không dựng được mục nào — chưa có dữ liệu AI. Dừng, không ghi đè file cũ.');
    process.exitCode = 1;
    return;
  }

  const deck = { deck: 'toeic-tsl', version: 1, attribution: { ...TSL_ATTRIBUTION }, entries };

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

  mkdirSync(path('public/content'), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(deck, null, 2)}\n`);
  console.log(`\nĐã ghi ${entries.length} từ vào public/content/vocab-toeic-tsl.json`);
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
