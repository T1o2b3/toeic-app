/**
 * Ôn chủ động: tự chọn một nhóm từ để kiểm tra trí nhớ, không đợi lịch FSRS gọi tới.
 *
 * Khác ôn thẻ (review-screen) ở một điểm cốt lõi: KHÔNG đụng vào lịch ôn. Chấm sớm một thẻ
 * chưa đến hạn làm FSRS tính sai độ bền trí nhớ, và Huy chỉ học 1–2 giờ/tuần nên không được
 * để nó làm hàng đợi phình lên. Duy nhất một trường hợp có tác dụng thật:
 *
 *   Từ đã chấm "thành thạo" mà kiểm tra lại thì quên → hạ xuống "đoán được" (D32).
 *
 * Đó chính là chỗ tự chấm ở màn phân loại hay sai nhất — tưởng mình biết, thật ra không —
 * và từ "thành thạo" bị loại hẳn khỏi hàng đợi nên không có cách nào khác để phát hiện.
 *
 * Hàm thuần, không đụng DOM.
 */
import { LEVELS, payloadForLevel } from './vocab-levels.js';

/** Số từ mỗi lượt ôn chủ động — đủ ngắn để làm xong trong vài phút. */
export const PRACTICE_SIZE = 10;

/** Mức được hạ xuống khi quên một từ đã chấm "thành thạo". */
export const DEMOTED_LEVEL = LEVELS.CONTEXT;

/** Giá trị nhóm — đủ ổn định để dùng làm khoá. */
export const POOLS = Object.freeze({
  FLUENT: 'fluent',
  WEAK: 'weak',
  BOOKMARKED: 'bookmarked',
  LEARNING: 'learning',
});

export const POOL_ORDER = Object.freeze([POOLS.FLUENT, POOLS.WEAK, POOLS.BOOKMARKED, POOLS.LEARNING]);

export const POOL_INFO = Object.freeze({
  [POOLS.FLUENT]: {
    label: 'Kiểm tra từ đã thành thạo',
    hint: 'xem mình có thật sự còn nhớ không — quên thì đưa lại vào danh sách học',
  },
  [POOLS.WEAK]: { label: 'Từ hay sai', hint: 'những từ từng bấm "Quên" nhiều nhất' },
  [POOLS.BOOKMARKED]: { label: 'Từ đã đánh dấu ★', hint: 'những từ bạn tự đánh dấu cần để ý' },
  [POOLS.LEARNING]: { label: 'Từ đang học', hint: 'ôn thêm ngoài lịch, không làm đổi lịch' },
});

/**
 * Từ có thuộc nhóm này không?
 * @param {string} pool
 * @param {object|undefined} state
 * @returns {boolean}
 */
function inPool(pool, state) {
  if (!state) return false;
  switch (pool) {
    case POOLS.FLUENT: return state.triaged && state.known === true;
    case POOLS.WEAK: return state.lapses > 0;
    case POOLS.BOOKMARKED: return state.bookmarked === true;
    case POOLS.LEARNING: return state.triaged && state.known === false;
    default: return false;
  }
}

/**
 * Các từ thuộc một nhóm. Từ hay sai xếp theo số lần quên giảm dần; các nhóm khác giữ thứ tự deck.
 * @param {string} pool
 * @param {Array<object>} entries
 * @param {Map<string, object>} states
 * @returns {Array<object>}
 */
export function poolEntries(pool, entries, states) {
  const found = entries.filter((entry) => entry.status !== 'retired' && inPool(pool, states.get(entry.id)));
  if (pool === POOLS.WEAK) {
    found.sort((a, b) => states.get(b.id).lapses - states.get(a.id).lapses);
  }
  return found;
}

/**
 * Số từ của từng nhóm — số ĐẦY ĐỦ, không bị cắt bởi kích thước lượt.
 * @param {Array<object>} entries
 * @param {Map<string, object>} states
 * @returns {Record<string, number>} luôn đủ mọi nhóm
 */
export function countPools(entries, states) {
  const counts = Object.fromEntries(POOL_ORDER.map((pool) => [pool, 0]));
  for (const entry of entries) {
    if (entry.status === 'retired') continue;
    const state = states.get(entry.id);
    for (const pool of POOL_ORDER) if (inPool(pool, state)) counts[pool] += 1;
  }
  return counts;
}

/**
 * Chọn các từ cho MỘT lượt. Danh sách này được chốt ngay từ đầu lượt và giữ nguyên tới hết
 * lượt — không tính lại mỗi lần vẽ, vì sau khi hạ mức một từ nó sẽ rời khỏi nhóm "thành thạo"
 * và cả lượt bị xáo trộn (cùng họ với lỗi cửa sổ trượt, xem src/logic/round.js).
 *
 * Nhóm "từ hay sai" lấy đầu danh sách (sai nhiều nhất); các nhóm khác xáo ngẫu nhiên để mỗi
 * lần ôn gặp từ khác nhau.
 *
 * @param {string} pool
 * @param {Array<object>} entries
 * @param {Map<string, object>} states
 * @param {{size?: number, random?: () => number}} [options]
 * @returns {string[]} id các từ, theo thứ tự sẽ hỏi
 */
export function pickRound(pool, entries, states, { size = PRACTICE_SIZE, random = Math.random } = {}) {
  const candidates = poolEntries(pool, entries, states).map((entry) => entry.id);
  if (pool === POOLS.WEAK) return candidates.slice(0, size);

  // Fisher–Yates: xáo đều, khác với sort(() => random() - 0.5) vốn thiên lệch.
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, size);
}

/**
 * Cần ghi sự kiện gì sau khi chấm một từ? Chỉ khi QUÊN một từ đang ở mức "thành thạo".
 * Nhớ, hoặc quên từ đang học/hay sai: không ghi gì — lịch ôn giữ nguyên.
 *
 * @param {string} wordId
 * @param {object|undefined} state - trạng thái hiện tại của từ
 * @param {boolean} remembered
 * @returns {{type: string, payload: object}|null}
 */
export function eventForResult(wordId, state, remembered) {
  if (remembered) return null;
  if (!state?.triaged || state.known !== true) return null;
  return { type: 'vocab.triaged', payload: payloadForLevel(wordId, DEMOTED_LEVEL) };
}
