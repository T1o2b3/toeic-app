/**
 * Sinh các bộ tài liệu + câu hỏi cho Part 3, 4, 6, 7 (D37): sinh → kiểm định chéo → âm thanh (Part 3/4) → ghi.
 *
 * Chạy:
 *   node --env-file=.env pipeline/build-sets.js --part 6 --target 4
 *   node --env-file=.env pipeline/build-sets.js --part 7 --variant single --target 10
 *   node --env-file=.env pipeline/build-sets.js --part 3 --target 13
 *   node --env-file=.env pipeline/build-sets.js --part 3 --no-generate     # chỉ sinh nốt âm thanh + ghi file
 *
 * Part 7 có 3 dạng (single/double/triple) chạy riêng nhưng GHI CHUNG một file public/content/sets-part7.json.
 * Tiến độ lưu sau MỖI lô (quy tắc số 6): dừng giữa chừng chạy lại là tiếp tục đúng chỗ dở.
 */
import { buildSetPrompt, buildSetVerifyPrompt, SET_PROMPT_VERSION } from './lib/prompt-sets.js';
import { isWellFormedSet, setKey, crossCheckSets, assembleSet } from './lib/set-check.js';
import { parseVocabResponse } from './lib/prompt-vocab.js';
import { sleep } from './lib/ai-provider.js';
import { createModelPair, aiStep, rejectionSummary, QUOTA_MESSAGE } from './lib/model-pair.js';
import { openWorkCache, nextId } from './lib/cache.js';
import { writeBank } from './lib/validate-deck.js';
import { renderClips, AUDIO_FAILED_MESSAGE } from './lib/tts.js';
import { removeOrphanAudio } from './lib/audio-files.js';
import { projectPath, today, flagValue, flagNumber, hasFlag } from './lib/cli.js';


/** Chủ đề gợi ý để các bộ trong cùng lô không trùng ý. Xoay theo số bộ đã có. */
const TOPICS = [
  'office equipment repair', 'hiring and interviews', 'a delayed shipment', 'a client meeting reschedule',
  'business travel booking', 'a budget approval', 'a product launch', 'a facility maintenance notice',
  'employee training session', 'a restaurant catering order', 'a software update', 'a conference registration',
  'an expense report problem', 'a supplier contract renewal', 'a customer complaint', 'a new store opening',
  'a parking or building access change', 'a survey or feedback request', 'a warehouse inventory count', 'a promotion announcement',
];

function parseArgs(argv) {
  const part = flagNumber(argv, '--part', NaN);
  if (![3, 4, 6, 7].includes(part)) throw new Error('Cần --part 3|4|6|7');
  const variant = part === 7 ? flagValue(argv, '--variant', 'single') : undefined;
  if (part === 7 && !['single', 'double', 'triple'].includes(variant)) throw new Error('--variant phải là single|double|triple');
  const defaults = { 3: 13, 4: 10, 6: 4, 7: { single: 10, double: 2, triple: 3 }[variant] };
  const batchDefaults = { 3: 5, 4: 5, 6: 4, 7: { single: 5, double: 2, triple: 2 }[variant] };
  return {
    part, variant,
    target: flagNumber(argv, '--target', defaults[part]),
    batchSize: flagNumber(argv, '--batch-size', batchDefaults[part]),
    generate: !hasFlag(argv, '--no-generate'),
  };
}

/** Sinh + kiểm định tới đủ mục tiêu (đếm theo dạng) hoặc hết hạn mức. */
async function generate({ part, variant, target, batchSize, cache }) {
  const pair = createModelPair();
  const ofVariant = () => Object.values(cache.snapshot()).filter((s) => (part !== 7 || s.kind === variant));
  console.log(`Part ${part}${variant ? ` (${variant})` : ''}: đã có ${ofVariant().length} bộ. Mục tiêu: ${target}.`);
  let stalls = 0;

  while (ofVariant().length < target) {
    if (pair.exhausted()) {
      console.log(QUOTA_MESSAGE);
      return;
    }
    if (stalls >= 4) { console.log('\n4 lô liền không thêm được bộ nào — dừng để khỏi đốt hạn mức. Chạy lại sau.'); return; }

    const need = Math.min(batchSize, target - ofVariant().length);
    const writer = pair.provider('writer');
    const solver = pair.provider('solver');
    const offset = cache.size();
    const topics = Array.from({ length: need }, (_, i) => TOPICS[(offset + i) % TOPICS.length]);

    const draft = await aiStep({
      pair, role: 'writer', provider: writer,
      run: () => writer.generate(buildSetPrompt({ part, count: need, variant, topics })),
      parse: (text) => parseVocabResponse(text).filter((item) => isWellFormedSet(part, variant, item)),
    });
    if (draft.status === 'quota') continue;
    if (draft.status === 'error') { stalls += 1; await sleep(4000); continue; }
    const drafted = draft.value;

    const seen = new Set(Object.values(cache.snapshot()).map(setKey));
    const fresh = drafted.filter((item) => !seen.has(setKey(item)));
    if (fresh.length === 0) { console.log('Lô này không có bộ mới hợp lệ.'); stalls += 1; await sleep(4000); continue; }

    const check = await aiStep({
      pair, role: 'solver', provider: solver,
      run: () => solver.generate(buildSetVerifyPrompt(fresh)),
      parse: parseVocabResponse,
    });
    if (check.status === 'quota') continue;
    if (check.status === 'error') { stalls += 1; continue; }
    const solved = check.value;

    const { agreed, rejected } = crossCheckSets(fresh, solved);
    for (const item of agreed) {
      const id = nextId(`p${part}-`, Object.keys(cache.snapshot()));
      cache.set(id, {
        id, set: `part${part}-core`, part, status: 'active', kind: item.kind ?? (part === 7 ? variant : undefined) ?? defaultKind(part),
        title: String(item.title ?? '').trim(),
        ...(item.script ? { script: item.script.map((t) => ({ speaker: String(t.speaker).trim(), text: String(t.text).trim() })) } : {}),
        ...(item.passages ? { passages: item.passages.map((p) => ({ label: String(p.label ?? 'Document').trim(), text: String(p.text).trim() })) } : {}),
        questions: item.questions,
        gen: { model: writer.model, promptVersion: SET_PROMPT_VERSION, batch: today(), date: today() },
        verify: { model: solver.model, agreed: true },
      });
    }
    cache.save();
    stalls = agreed.length > 0 ? 0 : stalls + 1;

    console.log(`+${agreed.length} bộ đạt · loại: ${rejectionSummary(rejected, 'không loại bộ nào')} · tổng ${ofVariant().length}/${target}`);
    if (ofVariant().length < target) await sleep(4000);
  }
}

const defaultKind = (part) => ({ 3: 'conversation', 4: 'talk', 6: 'text-completion', 7: 'single' })[part];

async function main() {
  const { part, variant, target, batchSize, generate: shouldGenerate } = parseArgs(process.argv.slice(2));
  const output = projectPath(`public/content/sets-part${part}.json`);
  const { cache, published } = openWorkCache(projectPath(`pipeline/.cache/sets-part${part}.json`), output);
  if (shouldGenerate) await generate({ part, variant, target, batchSize, cache });

  // Ghi file: mọi bộ trong cache (Part 7 gồm cả ba dạng), sắp theo id. Giọng/đáp án gán theo thứ tự nên id phải ổn định.
  const drafts = Object.values(cache.snapshot()).sort((a, b) => a.id.localeCompare(b.id));
  if (drafts.length === 0) { console.error('Chưa có bộ nào đạt — không ghi file.'); process.exitCode = 1; return; }

  let offset = 0;
  const assembled = drafts.map((draft, index) => {
    // Bộ đã phát hành giữ nguyên (D62); vẫn cộng số câu vào offset để bộ mới xếp đáp án đúng như trước.
    const result = published.has(draft.id) ? { entry: draft, clips: [] } : assembleSet(draft, { part, index, questionOffset: offset });
    offset += draft.questions.length;
    return result;
  });

  // Part 6/7 không có âm thanh: renderClips thấy danh sách rỗng thì trả về ngay, không đòi edge-tts.
  const clips = assembled.flatMap((a) => a.clips);
  const audio = await renderClips(clips, { label: `${drafts.length} bộ` });
  if (audio.failed > 0) { console.error(AUDIO_FAILED_MESSAGE); process.exitCode = 1; return; }

  const bank = { set: `part${part}-core`, part, version: 1, entries: assembled.map((a) => a.entry) };
  if (!writeBank(output, bank, projectPath('schemas/set.schema.json'))) return;
  const questionCount = bank.entries.reduce((s, e) => s + e.questions.length, 0);
  console.log(`Đã ghi ${bank.entries.length} bộ (${questionCount} câu) vào public/content/sets-part${part}.json`);

  // Xoá MP3 không còn được dùng bởi BẤT KỲ bộ nghe nào (Part 2, 3, 4) — không xoá file của phần khác.
  if (clips.length > 0) {
    const removed = removeOrphanAudio();
    if (removed.length > 0) console.log(`Đã xoá ${removed.length} file âm thanh không còn được dùng.`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
