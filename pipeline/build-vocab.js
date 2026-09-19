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
import { createGeminiProvider, withRetry, sleep } from './lib/ai-provider.js';
import { fetchIpa } from './lib/ipa.js';
import { openCache, chunk } from './lib/cache.js';
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
    batchSize: batchFlag === -1 ? 10 : Number.parseInt(argv[batchFlag + 1], 10),
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

  if (todo.length > 0) {
    const provider = createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY });
    const batches = chunk(todo, batchSize);

    for (const [index, batch] of batches.entries()) {
      const label = `Lô ${index + 1}/${batches.length}`;
      try {
        const text = await withRetry(() => provider.generate(buildVocabPrompt(batch)));
        const { matched, missing } = matchVocabResponse(batch, parseVocabResponse(text));
        for (const item of matched) aiCache.set(item.word, item.ai);
        aiCache.save();
        console.log(`${label}: nhận ${matched.length}/${batch.length} từ${missing.length ? ` (thiếu: ${missing.join(', ')})` : ''}`);
      } catch (error) {
        console.error(`${label}: LỖI — ${error.message}`);
        if (error.status === 401 || error.status === 403) {
          console.error('→ Key sai hoặc chưa bật. Kiểm tra GEMINI_API_KEY trong .env rồi chạy lại.');
          break;
        }
      }
      // Free tier giới hạn số lượt/phút — nghỉ giữa các lô cho an toàn.
      if (index < batches.length - 1) await sleep(4000);
    }
  }

  if (withIpa) {
    const need = words.filter((w) => aiCache.has(w.word) && !ipaCache.has(w.word));
    console.log(`Tra IPA cho ${need.length} từ...`);
    for (const [index, { word }] of need.entries()) {
      ipaCache.set(word, await fetchIpa(word));
      if (index % 25 === 24) {
        ipaCache.save();
        console.log(`  ...${index + 1}/${need.length}`);
      }
    }
    ipaCache.save();
  }

  const gen = {
    model: 'gemini-2.0-flash',
    promptVersion: VOCAB_PROMPT_VERSION,
    batch: new Date().toISOString().slice(0, 10),
    date: new Date().toISOString().slice(0, 10),
  };

  const entries = [];
  const skipped = [];
  for (const { word, rank } of words) {
    if (!aiCache.has(word)) continue;
    try {
      entries.push(buildEntry({ word, rank, ai: aiCache.get(word), ipa: ipaCache.get(word) ?? undefined, gen }));
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
