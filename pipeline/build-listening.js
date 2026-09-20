/**
 * Sinh bộ câu nghe Part 2: câu hỏi + kiểm định 2 bước (D12) + âm thanh (D35).
 *
 * Chạy:
 *   node --env-file=.env pipeline/build-listening.js --target 72
 *   node --env-file=.env pipeline/build-listening.js --no-generate   # chỉ sinh nốt âm thanh + ghi file
 *
 * Bước 1: model A sinh câu kèm đáp án. Bước 2: model B (KHÁC) tự giải không thấy đáp án; lệch hoặc quá dễ
 * thì loại. Bước 3: cân bằng đáp án A/B/C, gán giọng, sinh MP3 (bỏ qua file đã có). Bước 4: validate + ghi.
 * Tiến độ lưu sau MỖI lô (quy tắc số 6): dừng giữa chừng chạy lại là tiếp tục đúng chỗ dở.
 */
import { writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import {
  buildPart2Prompt, buildPart2VerifyPrompt, part2Key, isWellFormedPart2, PART2_TYPES, PART2_PROMPT_VERSION,
} from './lib/prompt-listening.js';
import { crossCheck } from './lib/prompt-question.js';
import { parseVocabResponse } from './lib/prompt-vocab.js';
import { createGeminiProvider, withRetry, sleep, isDailyQuotaError, DEFAULT_GEMINI_MODELS } from './lib/ai-provider.js';
import { openCache } from './lib/cache.js';
import { createValidator } from './lib/validate-deck.js';
import { assembleEntry } from './lib/listening-assemble.js';
import { synthesize, runLimited } from './lib/tts.js';

const ROOT = new URL('..', import.meta.url);
const path = (relative) => new URL(relative, ROOT).pathname;

const OUTPUT = path('public/content/listening-part2.json');
const CACHE = path('pipeline/.cache/listening-part2.json');
const PUBLIC = path('public/');
const EDGE_TTS = path('pipeline/.venv/bin/edge-tts');

function parseArgs(argv) {
  const num = (flag, fallback) => {
    const index = argv.indexOf(flag);
    return index === -1 ? fallback : Number.parseInt(argv[index + 1], 10);
  };
  return { target: num('--target', 72), batchSize: num('--batch-size', 24), generate: !argv.includes('--no-generate') };
}

/** Chọn các dạng câu còn ít nhất, để bộ câu phủ đều. */
function pickTypes(counts, howMany = 6) {
  return [...PART2_TYPES].sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0)).slice(0, howMany);
}

/** Sinh + kiểm định cho tới đủ mục tiêu hoặc hết hạn mức. Trả về khi xong hoặc phải dừng. */
async function generate({ target, batchSize, cache }) {
  const today = new Date().toISOString().slice(0, 10);
  const models = (process.env.GEMINI_MODELS ?? DEFAULT_GEMINI_MODELS.join(','))
    .split(',').map((m) => m.trim()).filter(Boolean);
  if (models.length < 2) throw new Error('Cần ít nhất 2 model: một để sinh, một để kiểm định (D12)');

  console.log(`Đã có sẵn: ${cache.size()} câu. Mục tiêu: ${target} câu.`);
  let writerIndex = 0;
  let solverIndex = 1;

  while (cache.size() < target) {
    if (writerIndex >= models.length || solverIndex >= models.length) {
      console.log('\nHết hạn mức của các model hôm nay. Chạy lại ngày mai để làm tiếp.');
      return;
    }
    const counts = {};
    for (const value of Object.values(cache.snapshot())) counts[value.errorType] = (counts[value.errorType] ?? 0) + 1;

    const need = Math.min(batchSize, target - cache.size());
    const writer = createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: models[writerIndex] });
    const solver = createGeminiProvider({ apiKey: process.env.GEMINI_API_KEY, model: models[solverIndex] });

    let drafted;
    try {
      const text = await withRetry(() => writer.generate(buildPart2Prompt({ types: pickTypes(counts), count: need })));
      drafted = parseVocabResponse(text).filter(isWellFormedPart2);
    } catch (error) {
      if (isDailyQuotaError(error)) {
        console.log(`${writer.model} hết hạn mức ngày → đổi model sinh đề`);
        writerIndex += 1;
        if (writerIndex === solverIndex) writerIndex += 1;
        continue;
      }
      console.error(`Sinh đề lỗi: ${error.message.slice(0, 160)}`);
      return;
    }

    const seen = new Set(Object.values(cache.snapshot()).map(part2Key));
    const fresh = drafted.filter((item) => !seen.has(part2Key(item)));
    if (fresh.length === 0) { console.log('Lô này không có câu mới hợp lệ, thử lô khác.'); await sleep(4000); continue; }

    let solved;
    try {
      solved = parseVocabResponse(await withRetry(() => solver.generate(buildPart2VerifyPrompt(fresh))));
    } catch (error) {
      if (isDailyQuotaError(error)) {
        console.log(`${solver.model} hết hạn mức ngày → đổi model kiểm định`);
        solverIndex += 1;
        if (solverIndex === writerIndex) solverIndex += 1;
        continue;
      }
      console.error(`Kiểm định lỗi: ${error.message.slice(0, 160)}`);
      return;
    }

    const { agreed, rejected } = crossCheck(fresh, solved);
    for (const { question, solvedAnswer } of agreed) {
      const id = `l2-${String(cache.size() + 1).padStart(4, '0')}`;
      cache.set(id, {
        id, set: 'part2-core', part: 2, status: 'active',
        question: question.question.trim(),
        responses: Object.fromEntries(['A', 'B', 'C'].map((k) => [k, question.responses[k].trim()])),
        answer: question.answer,
        errorType: PART2_TYPES.includes(question.errorType) ? question.errorType : 'wh-what',
        explanation: String(question.explanation ?? '').trim(),
        ...(question.trap ? { trap: String(question.trap).trim() } : {}),
        gen: { model: writer.model, promptVersion: PART2_PROMPT_VERSION, batch: today, date: today },
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
}

async function main() {
  const { target, batchSize, generate: shouldGenerate } = parseArgs(process.argv.slice(2));
  const cache = openCache(CACHE);
  if (shouldGenerate) await generate({ target, batchSize, cache });

  const drafts = Object.values(cache.snapshot())
    .filter((item) => item.explanation.length >= 20)
    .sort((a, b) => a.id.localeCompare(b.id));
  if (drafts.length === 0) {
    console.error('Chưa có câu nào đạt — không ghi file.');
    process.exitCode = 1;
    return;
  }

  // Âm thanh: giọng và chữ cái đáp án phụ thuộc thứ tự câu, nên gán theo vị trí trong danh sách đã sắp.
  const assembled = drafts.map((draft, index) => assembleEntry(draft, index));
  const clips = assembled.flatMap((a) => a.clips);
  console.log(`\nSinh âm thanh cho ${clips.length} đoạn (${drafts.length} câu)...`);
  if (!existsSync(EDGE_TTS)) throw new Error('Chưa cài edge-tts: python3 -m venv pipeline/.venv && pipeline/.venv/bin/pip install edge-tts');

  let created = 0; let existed = 0; let failed = 0;
  await runLimited(clips, 4, async (clip) => {
    try {
      const result = await synthesize({ text: clip.text, voice: clip.voice, outFile: `${PUBLIC}${clip.path}`, command: EDGE_TTS });
      if (result === 'created') created += 1; else existed += 1;
    } catch (error) {
      failed += 1;
      console.error(`  ✗ ${error.message.slice(0, 160)}`);
    }
    const done = created + existed + failed;
    if (done % 40 === 0) console.log(`  ...${done}/${clips.length}`);
  });
  console.log(`Âm thanh: ${created} mới, ${existed} đã có, ${failed} lỗi.`);
  if (failed > 0) {
    console.error('Có đoạn âm thanh lỗi — không ghi file nội dung để khỏi có câu thiếu tiếng. Chạy lại lệnh cũ.');
    process.exitCode = 1;
    return;
  }

  const bank = { set: 'part2-core', part: 2, version: 1, entries: assembled.map((a) => a.entry) };
  const { valid, errors } = createValidator(path('schemas/listening.schema.json'))(bank);
  if (!valid) {
    console.error('Bộ câu nghe KHÔNG hợp lệ, không ghi file:');
    for (const error of errors.slice(0, 20)) console.error('  -', error);
    process.exitCode = 1;
    return;
  }

  mkdirSync(path('public/content'), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(bank, null, 2)}\n`);
  console.log(`Đã ghi ${bank.entries.length} câu vào public/content/listening-part2.json`);

  // Xoá file MP3 không còn câu nào dùng (do đổi lời hoặc sinh lại): repo không phình vì file mồ côi.
  const used = new Set(clips.map((clip) => clip.path.replace('audio/', '')));
  let removed = 0;
  for (const file of readdirSync(`${PUBLIC}audio`)) {
    if (file.endsWith('.mp3') && !used.has(file)) { unlinkSync(`${PUBLIC}audio/${file}`); removed += 1; }
  }
  if (removed > 0) console.log(`Đã xoá ${removed} file âm thanh không còn được dùng.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
