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
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import {
  buildPart2Prompt, buildPart2VerifyPrompt, part2Key, isWellFormedPart2, PART2_TYPES, PART2_PROMPT_VERSION,
} from './lib/prompt-listening.js';
import { crossCheck } from './lib/prompt-question.js';
import { parseVocabResponse } from './lib/prompt-vocab.js';
import { sleep } from './lib/ai-provider.js';
import { createModelPair, aiStep, QUOTA_MESSAGE } from './lib/model-pair.js';
import { openCache } from './lib/cache.js';
import { createValidator } from './lib/validate-deck.js';
import { assembleEntry } from './lib/listening-assemble.js';
import { synthesize, runLimited } from './lib/tts.js';
import { removeOrphanAudio } from './lib/audio-files.js';
import { projectPath, today, flagNumber, hasFlag } from './lib/cli.js';

const OUTPUT = projectPath('public/content/listening-part2.json');
const CACHE = projectPath('pipeline/.cache/listening-part2.json');
const PUBLIC = projectPath('public/');
const EDGE_TTS = projectPath('pipeline/.venv/bin/edge-tts');

function parseArgs(argv) {
  return {
    target: flagNumber(argv, '--target', 72),
    batchSize: flagNumber(argv, '--batch-size', 24),
    generate: !hasFlag(argv, '--no-generate'),
  };
}

/** Chọn các dạng câu còn ít nhất, để bộ câu phủ đều. */
function pickTypes(counts, howMany = 6) {
  return [...PART2_TYPES].sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0)).slice(0, howMany);
}

/** Sinh + kiểm định cho tới đủ mục tiêu hoặc hết hạn mức. Trả về khi xong hoặc phải dừng. */
async function generate({ target, batchSize, cache }) {
  const pair = createModelPair();
  console.log(`Đã có sẵn: ${cache.size()} câu. Mục tiêu: ${target} câu.`);

  while (cache.size() < target) {
    if (pair.exhausted()) {
      console.log(QUOTA_MESSAGE);
      return;
    }
    const counts = {};
    for (const value of Object.values(cache.snapshot())) counts[value.errorType] = (counts[value.errorType] ?? 0) + 1;

    const need = Math.min(batchSize, target - cache.size());
    const writer = pair.provider('writer');
    const solver = pair.provider('solver');

    const draft = await aiStep({
      pair, role: 'writer', provider: writer,
      run: () => writer.generate(buildPart2Prompt({ types: pickTypes(counts), count: need })),
      parse: (text) => parseVocabResponse(text).filter(isWellFormedPart2),
    });
    if (draft.status === 'quota') continue;
    if (draft.status === 'error') return;
    const drafted = draft.value;

    const seen = new Set(Object.values(cache.snapshot()).map(part2Key));
    const fresh = drafted.filter((item) => !seen.has(part2Key(item)));
    if (fresh.length === 0) { console.log('Lô này không có câu mới hợp lệ, thử lô khác.'); await sleep(4000); continue; }

    const check = await aiStep({
      pair, role: 'solver', provider: solver,
      run: () => solver.generate(buildPart2VerifyPrompt(fresh)),
      parse: parseVocabResponse,
    });
    if (check.status === 'quota') continue;
    if (check.status === 'error') return;
    const solved = check.value;

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
        gen: { model: writer.model, promptVersion: PART2_PROMPT_VERSION, batch: today(), date: today() },
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
  const { valid, errors } = createValidator(projectPath('schemas/listening.schema.json'))(bank);
  if (!valid) {
    console.error('Bộ câu nghe KHÔNG hợp lệ, không ghi file:');
    for (const error of errors.slice(0, 20)) console.error('  -', error);
    process.exitCode = 1;
    return;
  }

  mkdirSync(projectPath('public/content'), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(bank, null, 2)}\n`);
  console.log(`Đã ghi ${bank.entries.length} câu vào public/content/listening-part2.json`);

  // Xoá MP3 không còn file nội dung nghe nào dùng (dùng chung cho Part 2, 3, 4: xem lib/audio-files.js).
  const removed = removeOrphanAudio(PUBLIC);
  if (removed.length > 0) console.log(`Đã xoá ${removed.length} file âm thanh không còn được dùng.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
