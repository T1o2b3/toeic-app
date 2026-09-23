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
import {
  buildQuestionPrompt, buildVerifyPrompt, crossCheck, questionKey, balanceAnswers, ERROR_TYPES, QUESTION_PROMPT_VERSION,
} from './lib/prompt-question.js';
import { parseVocabResponse } from './lib/prompt-vocab.js';
import { isVietnameseOrEmpty } from './lib/prompt-listening.js';
import { sleep } from './lib/ai-provider.js';
import { createModelPair, aiStep, QUOTA_MESSAGE } from './lib/model-pair.js';
import { openWorkCache, nextId } from './lib/cache.js';
import { createValidator } from './lib/validate-deck.js';
import { projectPath, today, flagNumber } from './lib/cli.js';

const OUTPUT = projectPath('public/content/questions-part5.json');
const CACHE = projectPath('pipeline/.cache/questions-part5.json');
const VOCAB = projectPath('public/content/vocab-toeic-tsl.json');

function parseArgs(argv) {
  return { target: flagNumber(argv, '--target', 200), batchSize: flagNumber(argv, '--batch-size', 20) };
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
  const { cache, published } = openWorkCache(CACHE, OUTPUT);

  const pair = createModelPair();
  console.log(`Đã có sẵn: ${cache.size()} câu. Mục tiêu: ${target} câu.`);
  console.log(`Model sinh đề: ${pair.models[0]} · model kiểm định: ${pair.models[1]}`);

  while (cache.size() < target) {
    if (pair.exhausted()) {
      console.log(QUOTA_MESSAGE);
      break;
    }

    const counts = {};
    for (const value of Object.values(cache.snapshot())) {
      counts[value.errorType] = (counts[value.errorType] ?? 0) + 1;
    }

    const need = Math.min(batchSize, target - cache.size());
    const writer = pair.provider('writer');
    const solver = pair.provider('solver');

    const draft = await aiStep({
      pair, role: 'writer', provider: writer,
      run: () => writer.generate(buildQuestionPrompt({
        errorTypes: pickErrorTypes(counts),
        words: sampleWords(need),
        count: need,
      })),
      parse: (text) => parseVocabResponse(text).filter((q) => q?.stem && q?.options && q?.answer),
    });
    if (draft.status === 'quota') continue;
    if (draft.status === 'error') break;
    const drafted = draft.value;

    // Bỏ câu trùng và câu có lời giải không phải tiếng Việt trước khi tốn một request kiểm định.
    const seen = new Set(Object.values(cache.snapshot()).map(questionKey));
    const fresh = drafted.filter((q) => !seen.has(questionKey(q))
      && isVietnameseOrEmpty(q.explanation) && isVietnameseOrEmpty(q.trap));

    const check = await aiStep({
      pair, role: 'solver', provider: solver,
      run: () => solver.generate(buildVerifyPrompt(fresh)),
      parse: parseVocabResponse,
    });
    if (check.status === 'quota') continue;
    if (check.status === 'error') break;
    const solved = check.value;

    const { agreed, rejected } = crossCheck(fresh, solved);
    for (const { question, solvedAnswer } of agreed) {
      const id = nextId('p5-', Object.keys(cache.snapshot()));
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
        gen: { model: writer.model, promptVersion: QUESTION_PROMPT_VERSION, batch: today(), date: today() },
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

  const entries = balanceAnswers(Object.values(cache.snapshot())
    .filter((q) => published.has(q.id) || q.explanation.length >= 20)
    .sort((a, b) => a.id.localeCompare(b.id)), published);

  if (entries.length === 0) {
    console.error('Chưa có câu nào đạt — không ghi file.');
    process.exitCode = 1;
    return;
  }

  const bank = { set: 'part5-core', part: 5, version: 1, entries };
  const validate = createValidator(projectPath('schemas/question.schema.json'));
  const { valid, errors } = validate(bank);
  if (!valid) {
    console.error('Bộ câu hỏi KHÔNG hợp lệ, không ghi file:');
    for (const error of errors.slice(0, 20)) console.error('  -', error);
    process.exitCode = 1;
    return;
  }

  mkdirSync(projectPath('public/content'), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(bank, null, 2)}\n`);
  console.log(`\nĐã ghi ${entries.length} câu vào public/content/questions-part5.json`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
