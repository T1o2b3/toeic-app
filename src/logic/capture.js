/**
 * "Gạt từ lạ": đang làm Part 5 gặp một từ chưa biết thì đánh dấu nó vào danh sách cần học,
 * KHÔNG hiện nghĩa lúc đó để khỏi đứt mạch làm bài (D34).
 *
 * Từ được gạt có hai kiểu:
 *   - đã có trong deck (kể cả biến thể: raised → raise) → vào thẳng hàng đợi học;
 *   - chưa có trong deck → chỉ ghi lại, vì không gọi AI lúc chạy app (ràng buộc #2) nên chưa có nghĩa
 *     để làm thẻ. Danh sách này là đầu vào cho một bước pipeline sau (xem PLAN.md, Backlog).
 *
 * Hàm thuần, không đụng DOM.
 */
import { LEVELS, payloadForLevel } from './vocab-levels.js';

/** Từ ngắn hơn số này (so, of, to, in…) không đáng đưa vào danh sách học. */
const MIN_WORD_LENGTH = 3;

const WORD_PATTERN = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

/**
 * Chuẩn hoá một từ đọc từ câu hỏi: chữ thường, bỏ đuôi sở hữu, bỏ dấu câu dính vào.
 * @param {string} raw
 * @returns {string} rỗng nếu không phải từ đáng gạt
 */
export function normalizeWord(raw) {
  const word = String(raw ?? '')
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/'s$/, '')
    .replace(/^[^a-z]+|[^a-z]+$/g, '');
  return word.replace(/[^a-z]/g, '').length >= MIN_WORD_LENGTH ? word : '';
}

/**
 * Tách một câu thành các mảnh: từ (bấm/kéo được) và phần còn lại (dấu câu, khoảng trắng, chỗ trống ----).
 * @param {string} text
 * @returns {Array<{text: string, word: string|null}>} nối các `text` lại được đúng câu gốc
 */
export function tokenize(text) {
  const source = String(text ?? '');
  const tokens = [];
  let cursor = 0;
  for (const match of source.matchAll(WORD_PATTERN)) {
    if (match.index > cursor) tokens.push({ text: source.slice(cursor, match.index), word: null });
    tokens.push({ text: match[0], word: normalizeWord(match[0]) || null });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) tokens.push({ text: source.slice(cursor), word: null });
  return tokens;
}

/**
 * Chỉ mục từ → mục deck, dựng một lần để tra nhanh (deck có ~2400 từ).
 * @param {Array<object>} entries
 * @returns {Map<string, object>}
 */
export function buildWordIndex(entries) {
  const index = new Map();
  for (const entry of entries ?? []) {
    if (entry.status === 'retired') continue;
    const key = String(entry.word ?? '').toLowerCase();
    if (key && !index.has(key)) index.set(key, entry);
  }
  return index;
}

const isVowel = (ch) => 'aeiou'.includes(ch);

/**
 * Các dạng gốc có thể có của một từ đã chia (raised → raise, stopped → stop, studies → study).
 * Chỉ là đoán theo đuôi: thứ tự ưu tiên từ khả dĩ nhất; không có trong deck thì tra tiếp cái sau.
 * @param {string} word
 * @returns {string[]}
 */
export function baseForms(word) {
  const out = [];
  const add = (form) => { if (form.length >= MIN_WORD_LENGTH && !out.includes(form)) out.push(form); };
  const doubled = (stem) => stem.length >= 2 && stem.at(-1) === stem.at(-2) && !isVowel(stem.at(-1));

  if (word.endsWith('ies')) add(`${word.slice(0, -3)}y`);
  if (word.endsWith('ied')) add(`${word.slice(0, -3)}y`);
  if (word.endsWith('es')) add(word.slice(0, -2));
  if (word.endsWith('s') && !word.endsWith('ss')) add(word.slice(0, -1));
  if (word.endsWith('ed')) {
    const stem = word.slice(0, -2);
    add(stem);
    add(word.slice(0, -1));                 // raised → raise
    if (doubled(stem)) add(stem.slice(0, -1)); // stopped → stop
  }
  if (word.endsWith('ing')) {
    const stem = word.slice(0, -3);
    add(stem);
    add(`${stem}e`);                         // rising → rise
    if (doubled(stem)) add(stem.slice(0, -1)); // running → run
  }
  if (word.endsWith('ly')) add(word.slice(0, -2));
  return out;
}

/**
 * Tìm mục deck ứng với một từ: khớp đúng trước, rồi mới thử các dạng gốc.
 * @param {string} word - đã chuẩn hoá
 * @param {Map<string, object>} index
 * @returns {object|null}
 */
export function lookupDeckEntry(word, index) {
  if (index.has(word)) return index.get(word);
  for (const form of baseForms(word)) {
    if (index.has(form)) return index.get(form);
  }
  return null;
}

/**
 * Gom các sự kiện `vocab.captured` thành danh sách từ đã gạt.
 * @param {Array<{type: string, ts: number, payload: object}>} events
 * @returns {Map<string, {word: string, wordId: string|null, count: number, questionIds: string[], firstTs: number, lastTs: number}>}
 */
export function reduceCaptured(events) {
  const captured = new Map();
  for (const event of events ?? []) {
    if (event?.type !== 'vocab.captured') continue;
    const word = normalizeWord(event.payload?.word);
    if (!word) continue;

    const item = captured.get(word) ?? { word, wordId: null, count: 0, questionIds: [], firstTs: event.ts, lastTs: event.ts };
    item.count += 1;
    item.lastTs = event.ts;
    if (typeof event.payload.wordId === 'string' && event.payload.wordId) item.wordId = event.payload.wordId;
    const questionId = event.payload.questionId;
    if (typeof questionId === 'string' && !item.questionIds.includes(questionId)) item.questionIds.push(questionId);
    captured.set(word, item);
  }
  return captured;
}

/**
 * Phân các từ đã gạt thành: đã có mục deck (kể cả deck mới thêm sau lúc gạt) và chưa có.
 * Tra lại theo deck HIỆN TẠI chứ không tin `wordId` lúc gạt: pipeline có thể đã sinh từ đó sau này.
 * @param {Map<string, object>} captured
 * @param {Map<string, object>} index
 * @returns {{entryIds: Set<string>, unmatched: Array<object>}}
 */
export function splitCaptured(captured, index) {
  const entryIds = new Set();
  const unmatched = [];
  for (const item of captured.values()) {
    const entry = lookupDeckEntry(item.word, index);
    if (entry) entryIds.add(entry.id);
    else unmatched.push(item);
  }
  return { entryIds, unmatched };
}

/**
 * Cần ghi những sự kiện gì khi gạt một từ, và báo gì cho người dùng.
 *
 * Luôn ghi `vocab.captured` (nhật ký "gặp từ này ở câu nào"). Riêng từ đã có trong deck thì ghi thêm
 * một sự kiện phân loại để nó vào hàng đợi học:
 *   chưa phân loại → "không biết" (học từ đầu); đang "thành thạo" → hạ xuống "đoán được"
 *   (Huy vừa tự nói là chưa nắm chắc); đang học sẵn → không đổi gì, lịch FSRS giữ nguyên.
 *
 * @param {string} word - đã chuẩn hoá
 * @param {object} context
 * @param {string} [context.questionId]
 * @param {Map<string, object>} context.index - buildWordIndex
 * @param {Map<string, object>} context.states - trạng thái từ vựng
 * @param {Map<string, object>} [context.captured]
 * @returns {{events: Array<{type: string, payload: object}>, notice: string, entry: object|null}}
 */
export function planCapture(word, { questionId, index, states, captured = new Map() }) {
  const previous = captured.get(word);
  if (questionId && previous?.questionIds.includes(questionId)) {
    return { events: [], entry: null, notice: `“${word}” đã được thêm từ câu này rồi.` };
  }

  const entry = lookupDeckEntry(word, index);
  const payload = { word };
  if (questionId) payload.questionId = questionId;
  if (entry) payload.wordId = entry.id;
  const events = [{ type: 'vocab.captured', payload }];

  if (!entry) {
    return {
      events, entry: null,
      notice: `Đã ghi “${word}” — chưa có trong deck, xem ở Kho từ vựng › Đã gạt.`,
    };
  }

  const label = entry.word.toLowerCase() === word ? `“${word}”` : `“${word}” (từ gốc “${entry.word}”)`;
  const state = states.get(entry.id);
  if (!state?.triaged) {
    events.push({ type: 'vocab.triaged', payload: payloadForLevel(entry.id, LEVELS.UNKNOWN) });
    return { events, entry, notice: `Đã thêm ${label} vào danh sách học.` };
  }
  if (state.known) {
    events.push({ type: 'vocab.triaged', payload: payloadForLevel(entry.id, LEVELS.CONTEXT) });
    return { events, entry, notice: `Đã đưa ${label} từ “thành thạo” về danh sách học.` };
  }
  return { events, entry, notice: `${label} đã có trong danh sách học — ghi thêm một lần gặp.` };
}
