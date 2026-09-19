/**
 * Sinh ngân hàng câu hỏi Part 5, có kiểm định 2 bước (D12).
 *
 * Chạy:
 *   node --env-file=.env pipeline/build-questions.js --target 200
 *   node --env-file=.env pipeline/build-questions.js --target 40 --batch-size 20
 *
 * Bước 1: model A sinh câu kèm đáp án.
 * Bước 2: model B (KHÁC model A) tự giải, không thấy đáp án. Lệch -> loại câu đó.
 * Chỉ câu được cả hai đồng ý mới vào file. Cache giữ câu đã đạt để chạy lại không mất.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { buildQuestionPrompt, buildVerifyPrompt, crossCheck, questionKey, ERROR_TYPES, QUESTION_PROMPT_VERSION } from './lib/prompt-question.js';
import { parseVocabResponse } from './lib/prompt-vocab.js';
import { createGeminiProvider, withRetry, sleep, isDailyQuotaError, DEFAULT_GEMINI_MODELS } from './lib/ai-provider.js';
import { openCache } from './lib/cache.js';
import { createValidator } from './lib/validate-deck.js';

const ROOT = new URL('..', import.meta.url);
const path = (relative) => new URL(relative, ROOT).pathname;

const OUTPUT = path('public/content/questions-part5.json');
const CACHE = path('pipeline/.cache/questions-part5.json');
const VOCAB = path('public/content/vocab-toeic-tsl.json');

function parseArgs(argv) {
  const get = (flag, fallback) => {
    const index = argv.indexOf(flag);
    return index === -1 ? fallback : Number.parseInt(argv[index + 1], 10);
  };
  return { target: get('--target', 200), batchSize: get('--batch-size', 20) };
}

/** Lấy ngẫu nhiên một ít từ trong deck để câu hỏi bám sát từ vựng đang học. */
function sampleWords(count) {
  if (!existsSync(VOCAB)) return [];
  const deck = JSON.parse(readFileSync(VOCAB, 'utf8'));
  const picked = new Set();
  while (picked.size < count && picked.size < deck.entries.length) {
    picked.add(deck.entries[Math.floor(Math.random() * deck.entries.length)].word);
  }
  return [...picked];
}

/** Chọn loại kiến thức còn ít câu nhất, để ngân hàng câu phủ đều. */
function pickErrorTypes(counts, howMany = 4) {
  return [...ERROR_TYPES]
    .sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0))
    .slice(0, howMany);
}

async function main() {
  const { target, batchSize } = parseArgs(process.argv.slice(2));
  const cache = openCache(CACHE);
  const today = new Date().toISOString().slice(0, 10);

  const models = (process.env.GEMINI_MODELS ?? DEFAULT_GEMINI_MODELS.join(','))
    .split(',').map((m) => m.trim()).filter(Boolean);
  if (models.length < 2) throw new Error('Cần ít nhất 2 model: một để sinh, một để kiểm định (D12)');

  console.log(`Đã có sẵn: ${cache.size()} câu. Mục tiêu: ${target} câu.`);
  console.log(`Model sinh đề: ${models[0]} · model kiểm định: ${models[1]}`);

  let writerIndex = 0;
  let solverIndex = 1;

  while (cache.size() < target) {
    if (writerIndex >= models.length || solverIndex >= models.length) {
      console.log('\nHết hạn mức của các model hôm nay. Chạy lại ngày mai để làm tiếp.');
      break;
    }

    const counts = {};
    for (const value of Object.values(cache.snapshot())) {
      counts[value.errorType] = (counts[value.errorType] ?? 0) + 1;
    }

    const need = Math.min(batchSize, target - cache.size());
    const writer = createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: models[writerIndex] });
    const solver = createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: models[solverIndex] });

    let drafted;
    try {
      const text = await withRetry(() => writer.generate(buildQuestionPrompt({
        errorTypes: pickErrorTypes(counts),
        words: sampleWords(need),
        count: need,
      })));
      drafted = parseVocabResponse(text).filter((q) => q?.stem && q?.options && q?.answer);
    } catch (error) {
      if (isDailyQuotaError(error)) { console.log(`${writer.model} hết hạn mức ngày → đổi model sinh đề`); writerIndex += 1; if (writerIndex === solverIndex) writerIndex += 1; continue; }
      console.error(`Sinh đề lỗi: ${error.message.slice(0, 160)}`);
      break;
    }

    // Bỏ câu trùng với câu đã có trước khi tốn một request kiểm định.
    const seen = new Set(Object.values(cache.snapshot()).map(questionKey));
    const fresh = drafted.filter((q) => !seen.has(questionKey(q)));

    let solved;
    try {
      const text = await withRetry(() => solver.generate(buildVerifyPrompt(fresh)));
      solved = parseVocabResponse(text);
    } catch (error) {
      if (isDailyQuotaError(error)) { console.log(`${solver.model} hết hạn mức ngày → đổi model kiểm định`); solverIndex += 1; if (solverIndex === writerIndex) solverIndex += 1; continue; }
      console.error(`Kiểm định lỗi: ${error.message.slice(0, 160)}`);
      break;
    }

    const { agreed, rejected } = crossCheck(fresh, solved);
    for (const { question, solvedAnswer } of agreed) {
      const id = `p5-${String(cache.size() + 1).padStart(4, '0')}`;
      cache.set(id, {
        id,
        set: 'part5-core',
        part: 5,
        status: 'active',
        stem: question.stem,
        options: question.options,
        answer: question.answer,
        errorType: ERROR_TYPES.includes(question.errorType) ? question.errorType : 'vocabulary',
        explanation: String(question.explanation ?? '').trim(),
        ...(question.trap ? { trap: String(question.trap).trim() } : {}),
        gen: { model: writer.model, promptVersion: QUESTION_PROMPT_VERSION, batch: today, date: today },
        verify: { model: solver.model, answer: solvedAnswer, agreed: true },
      });
    }
    cache.save();
    const why = {};
    for (const item of rejected) why[item.reason] = (why[item.reason] ?? 0) + 1;
    const whyText = Object.entries(why).map(([reason, count]) => `${count} ${reason}`).join(', ') || 'không loại câu nào';
    console.log(`+${agreed.length} câu đạt · loại: ${whyText} · trùng ${drafted.length - fresh.length} · tổng ${cache.size()}/${target}`);

    if (cache.size() < target) await sleep(4000);
  }

  const entries = Object.values(cache.snapshot())
    .filter((q) => q.explanation.length >= 20)
    .sort((a, b) => a.id.localeCompare(b.id));

  if (entries.length === 0) {
    console.error('Chưa có câu nào đạt — không ghi file.');
    process.exitCode = 1;
    return;
  }

  const bank = { set: 'part5-core', part: 5, version: 1, entries };
  const validate = createValidator(path('schemas/question.schema.json'));
  const { valid, errors } = validate(bank);
  if (!valid) {
    console.error('Bộ câu hỏi KHÔNG hợp lệ, không ghi file:');
    for (const error of errors.slice(0, 20)) console.error('  -', error);
    process.exitCode = 1;
    return;
  }

  mkdirSync(path('public/content'), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(bank, null, 2)}\n`);
  console.log(`\nĐã ghi ${entries.length} câu vào public/content/questions-part5.json`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
