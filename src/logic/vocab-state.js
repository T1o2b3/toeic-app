/**
 * Gấp nhật ký sự kiện thành trạng thái hiện tại của từng từ (D23).
 * Nhật ký là nguồn sự thật duy nhất; mọi thứ ở đây đều tính lại được.
 * Hàm thuần: không đụng DOM, không đọc giờ hệ thống trừ khi được truyền vào.
 */
import { createNewCard, reviewCard, isDue, isNew } from './scheduler.js';

/**
 * Trạng thái khởi đầu của một từ chưa có sự kiện nào.
 * @param {string} wordId
 * @param {Date} now
 * @returns {object}
 */
function blankState(wordId, now) {
  return {
    wordId,
    triaged: false,     // Huy đã phân loại biết/chưa biết chưa
    known: false,       // đánh dấu "đã biết" -> không đưa vào hàng đợi học
    card: createNewCard(now),
    reviews: 0,
    lapses: 0,          // số lần bấm "quên" -> dùng để highlight từ hay sai
    lastGrade: null,
    lastReviewTs: null,
    bookmarked: false,
  };
}

/**
 * Gấp toàn bộ nhật ký thành bảng trạng thái theo từ.
 * Sự kiện lạ hoặc thiếu wordId bị bỏ qua, không làm hỏng cả nhật ký.
 * @param {Array<{type: string, ts: number, payload: object}>} events - đã sắp xếp theo ts
 * @param {{now?: Date}} [options]
 * @returns {Map<string, object>}
 */
export function reduceVocabState(events, { now = new Date() } = {}) {
  const states = new Map();

  const ensure = (wordId, ts) => {
    if (!states.has(wordId)) states.set(wordId, blankState(wordId, new Date(ts ?? now)));
    return states.get(wordId);
  };

  for (const event of events ?? []) {
    const wordId = event?.payload?.wordId;
    if (typeof wordId !== 'string' || wordId === '') continue;

    switch (event.type) {
      case 'vocab.triaged': {
        const state = ensure(wordId, event.ts);
        state.triaged = true;
        state.known = event.payload.known === true;
        break;
      }
      case 'vocab.reviewed': {
        const state = ensure(wordId, event.ts);
        const grade = event.payload.grade;
        try {
          state.card = reviewCard(state.card, grade, new Date(event.ts));
        } catch {
          continue; // mức đánh giá lạ: bỏ qua sự kiện, giữ nguyên trạng thái
        }
        state.reviews += 1;
        if (grade === 'again') state.lapses += 1;
        state.lastGrade = grade;
        state.lastReviewTs = event.ts;
        // Ôn một từ tức là đang học nó, kể cả khi trước đó đánh dấu "đã biết".
        state.known = false;
        break;
      }
      case 'vocab.bookmarked': {
        const state = ensure(wordId, event.ts);
        state.bookmarked = event.payload.bookmarked !== false;
        break;
      }
      default:
        break;
    }
  }

  return states;
}

/**
 * Trạng thái của một từ, kể cả khi nó chưa có sự kiện nào.
 * @param {Map<string, object>} states
 * @param {string} wordId
 * @param {{now?: Date}} [options]
 * @returns {object}
 */
export function getWordState(states, wordId, { now = new Date() } = {}) {
  return states.get(wordId) ?? blankState(wordId, now);
}

/**
 * Những từ chưa được phân loại biết/chưa biết — đầu vào cho màn triage.
 * Giữ nguyên thứ tự deck (đã sắp theo tần suất) để học từ phổ biến trước.
 * @param {Array<{id: string}>} entries
 * @param {Map<string, object>} states
 * @param {number} [limit]
 * @returns {Array<{id: string}>}
 */
export function triageQueue(entries, states, limit = Infinity) {
  const out = [];
  for (const entry of entries) {
    if (states.get(entry.id)?.triaged) continue;
    out.push(entry);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Hàng đợi ôn tập: từ đến hạn trước (quá hạn lâu nhất lên đầu), rồi mới đến từ mới.
 * Từ đã đánh dấu "đã biết" không vào hàng đợi (D03: giữ hàng đợi nhẹ).
 * @param {Array<{id: string}>} entries - deck
 * @param {Map<string, object>} states
 * @param {object} [options]
 * @param {Date} [options.now]
 * @param {number} [options.maxNew] - số từ MỚI tối đa mỗi phiên, mặc định 10
 * @param {number} [options.maxTotal] - tổng số thẻ tối đa, mặc định 40
 * @returns {Array<{entry: object, state: object, isNew: boolean}>}
 */
export function reviewQueue(entries, states, { now = new Date(), maxNew = 10, maxTotal = 40 } = {}) {
  const due = [];
  const fresh = [];

  for (const entry of entries) {
    const state = states.get(entry.id);
    if (!state || state.known) continue;          // chưa triage hoặc đã biết -> bỏ
    if (isNew(state.card)) fresh.push({ entry, state, isNew: true });
    else if (isDue(state.card, now)) due.push({ entry, state, isNew: false });
  }

  due.sort((a, b) => new Date(a.state.card.due) - new Date(b.state.card.due));
  return [...due, ...fresh.slice(0, maxNew)].slice(0, maxTotal);
}

/**
 * Những từ hay sai nhất — để highlight cho Huy biết lỗ hổng của mình.
 * @param {Map<string, object>} states
 * @param {number} [limit]
 * @returns {Array<object>} sắp xếp theo số lần quên giảm dần
 */
export function weakWords(states, limit = 20) {
  return [...states.values()]
    .filter((state) => state.lapses > 0)
    .sort((a, b) => b.lapses - a.lapses || (b.lastReviewTs ?? 0) - (a.lastReviewTs ?? 0))
    .slice(0, limit);
}
