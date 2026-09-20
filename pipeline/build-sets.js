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
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { buildSetPrompt, buildSetVerifyPrompt, SET_PROMPT_VERSION } from './lib/prompt-sets.js';
import { isWellFormedSet, setKey, crossCheckSets, assembleSet } from './lib/set-check.js';
import { parseVocabResponse } from './lib/prompt-vocab.js';
import { sleep } from './lib/ai-provider.js';
import { createModelPair, aiStep, QUOTA_MESSAGE } from './lib/model-pair.js';
import { openCache } from './lib/cache.js';
import { createValidator } from './lib/validate-deck.js';
import { synthesize, runLimited } from './lib/tts.js';
import { removeOrphanAudio } from './lib/audio-files.js';

const ROOT = new URL('..', import.meta.url);
const path = (relative) => new URL(relative, ROOT).pathname;
const PUBLIC = path('public/');
const EDGE_TTS = path('pipeline/.venv/bin/edge-tts');

/** Chủ đề gợi ý để các bộ trong cùng lô không trùng ý. Xoay theo số bộ đã có. */
const TOPICS = [
  'office equipment repair', 'hiring and interviews', 'a delayed shipment', 'a client meeting reschedule',
  'business travel booking', 'a budget approval', 'a product launch', 'a facility maintenance notice',
  'employee training session', 'a restaurant catering order', 'a software update', 'a conference registration',
  'an expense report problem', 'a supplier contract renewal', 'a customer complaint', 'a new store opening',
  'a parking or building access change', 'a survey or feedback request', 'a warehouse inventory count', 'a promotion announcement',
];

function parseArgs(argv) {
  const value = (flag, fallback) => { const i = argv.indexOf(flag); return i === -1 ? fallback : argv[i + 1]; };
  const part = Number.parseInt(value('--part', ''), 10);
  if (![3, 4, 6, 7].includes(part)) throw new Error('Cần --part 3|4|6|7');
  const variant = part === 7 ? value('--variant', 'single') : undefined;
  if (part === 7 && !['single', 'double', 'triple'].includes(variant)) throw new Error('--variant phải là single|double|triple');
  const defaults = { 3: 13, 4: 10, 6: 4, 7: { single: 10, double: 2, triple: 3 }[variant] };
  const batchDefaults = { 3: 5, 4: 5, 6: 4, 7: { single: 5, double: 2, triple: 2 }[variant] };
  return {
    part, variant,
    target: Number.parseInt(value('--target', String(defaults[part])), 10),
    batchSize: Number.parseInt(value('--batch-size', String(batchDefaults[part])), 10),
    generate: !argv.includes('--no-generate'),
  };
}

/** Sinh + kiểm định tới đủ mục tiêu (đếm theo dạng) hoặc hết hạn mức. */
async function generate({ part, variant, target, batchSize, cache }) {
  const today = new Date().toISOString().slice(0, 10);
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
      const id = `p${part}-${String(cache.size() + 1).padStart(4, '0')}`;
      cache.set(id, {
        id, set: `part${part}-core`, part, status: 'active', kind: item.kind ?? (part === 7 ? variant : undefined) ?? defaultKind(part),
        title: String(item.title ?? '').trim(),
        ...(item.script ? { script: item.script.map((t) => ({ speaker: String(t.speaker).trim(), text: String(t.text).trim() })) } : {}),
        ...(item.passages ? { passages: item.passages.map((p) => ({ label: String(p.label ?? 'Document').trim(), text: String(p.text).trim() })) } : {}),
        questions: item.questions,
        gen: { model: writer.model, promptVersion: SET_PROMPT_VERSION, batch: today, date: today },
        verify: { model: solver.model, agreed: true },
      });
    }
    cache.save();
    stalls = agreed.length > 0 ? 0 : stalls + 1;

    const why = {};
    for (const r of rejected) why[r.reason] = (why[r.reason] ?? 0) + 1;
    const whyText = Object.entries(why).map(([r, c]) => `${c} ${r}`).join(', ') || 'không loại bộ nào';
    console.log(`+${agreed.length} bộ đạt · loại: ${whyText} · tổng ${ofVariant().length}/${target}`);
    if (ofVariant().length < target) await sleep(4000);
  }
}

const defaultKind = (part) => ({ 3: 'conversation', 4: 'talk', 6: 'text-completion', 7: 'single' })[part];

async function main() {
  const { part, variant, target, batchSize, generate: shouldGenerate } = parseArgs(process.argv.slice(2));
  const cache = openCache(path(`pipeline/.cache/sets-part${part}.json`));
  if (shouldGenerate) await generate({ part, variant, target, batchSize, cache });

  // Ghi file: mọi bộ trong cache (Part 7 gồm cả ba dạng), sắp theo id. Giọng/đáp án gán theo thứ tự nên id phải ổn định.
  const drafts = Object.values(cache.snapshot()).sort((a, b) => a.id.localeCompare(b.id));
  if (drafts.length === 0) { console.error('Chưa có bộ nào đạt — không ghi file.'); process.exitCode = 1; return; }

  let offset = 0;
  const assembled = drafts.map((draft, index) => {
    const result = assembleSet(draft, { part, index, questionOffset: offset });
    offset += draft.questions.length;
    return result;
  });

  const clips = assembled.flatMap((a) => a.clips);
  if (clips.length > 0) {
    console.log(`\nSinh âm thanh cho ${clips.length} đoạn (${drafts.length} bộ)...`);
    if (!existsSync(EDGE_TTS)) throw new Error('Chưa cài edge-tts: python3 -m venv pipeline/.venv && pipeline/.venv/bin/pip install edge-tts');
    let created = 0; let existed = 0; let failed = 0;
    await runLimited(clips, 4, async (clip) => {
      try {
        const r = await synthesize({ text: clip.text, voice: clip.voice, outFile: `${PUBLIC}${clip.path}`, command: EDGE_TTS });
        if (r === 'created') created += 1; else existed += 1;
      } catch (error) {
        failed += 1;
        console.error(`  ✗ ${error.message.slice(0, 160)}`);
      }
    });
    console.log(`Âm thanh: ${created} mới, ${existed} đã có, ${failed} lỗi.`);
    if (failed > 0) { console.error('Có đoạn âm thanh lỗi — không ghi file nội dung. Chạy lại lệnh cũ.'); process.exitCode = 1; return; }
  }

  const bank = { set: `part${part}-core`, part, version: 1, entries: assembled.map((a) => a.entry) };
  const { valid, errors } = createValidator(path('schemas/set.schema.json'))(bank);
  if (!valid) {
    console.error('Bộ KHÔNG hợp lệ, không ghi file:');
    for (const error of errors.slice(0, 20)) console.error('  -', error);
    process.exitCode = 1;
    return;
  }
  mkdirSync(path('public/content'), { recursive: true });
  writeFileSync(path(`public/content/sets-part${part}.json`), `${JSON.stringify(bank, null, 2)}\n`);
  const questionCount = bank.entries.reduce((s, e) => s + e.questions.length, 0);
  console.log(`Đã ghi ${bank.entries.length} bộ (${questionCount} câu) vào public/content/sets-part${part}.json`);

  // Xoá MP3 không còn được dùng bởi BẤT KỲ bộ nghe nào (Part 2, 3, 4) — không xoá file của phần khác.
  if (clips.length > 0) {
    const removed = removeOrphanAudio(PUBLIC);
    if (removed.length > 0) console.log(`Đã xoá ${removed.length} file âm thanh không còn được dùng.`);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
