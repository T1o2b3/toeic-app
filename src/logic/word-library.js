/**
 * Kho từ vựng: lọc, tìm kiếm và đếm — logic của màn "xem lại từ đã phân loại".
 *
 * Màn phân loại chỉ cho lướt MỘT CHIỀU (chấm xong là qua từ khác), nên phải có nơi khác để
 * nhìn lại từ đã chấm, và sửa mức khi lỡ tay hoặc khi thấy mình đã quên. Hàm thuần, không đụng DOM.
 */
import { LEVEL_ORDER } from './vocab-levels.js';

/** Bộ lọc đặc biệt ngoài 4 mức. Giá trị được dùng trong địa chỉ (#/words?f=...). */
export const FILTERS = Object.freeze({
  ALL: 'all',
  UNTRIAGED: 'untriaged',
  BOOKMARKED: 'bookmarked',
});

/** Thứ tự nút lọc trên màn hình: tất cả, chưa phân loại, 4 mức từ yếu đến vững, đánh dấu. */
export const FILTER_ORDER = Object.freeze([
  FILTERS.ALL, FILTERS.UNTRIAGED, ...LEVEL_ORDER, FILTERS.BOOKMARKED,
]);

/**
 * Chuẩn hoá giá trị bộ lọc đọc từ địa chỉ; giá trị lạ thì về "tất cả".
 * @param {string|null|undefined} value
 * @returns {string}
 */
export function normalizeFilter(value) {
  return FILTER_ORDER.includes(value) ? value : FILTERS.ALL;
}

/**
 * Bỏ dấu tiếng Việt và chữ hoa để gõ "quan ly" vẫn tìm ra "quản lý".
 * @param {string} text
 * @returns {string}
 */
export function fold(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .trim();
}

/**
 * Mục này thuộc bộ lọc nào? Một từ có thể thuộc hai nhóm (vd "thành thạo" và "đánh dấu").
 * @param {object|undefined} state - trạng thái của từ, undefined nếu chưa có sự kiện nào
 * @param {string} filter
 * @returns {boolean}
 */
export function matchesFilter(state, filter) {
  const triaged = state?.triaged === true;
  switch (filter) {
    case FILTERS.ALL: return true;
    case FILTERS.UNTRIAGED: return !triaged;
    case FILTERS.BOOKMARKED: return state?.bookmarked === true;
    default: return triaged && state.level === filter;
  }
}

/**
 * Lọc deck theo bộ lọc + từ khoá tìm kiếm. Giữ nguyên thứ tự deck (theo tần suất).
 * @param {Array<object>} entries
 * @param {Map<string, object>} states
 * @param {{filter?: string, query?: string}} [options]
 * @returns {Array<object>}
 */
export function filterWords(entries, states, { filter = FILTERS.ALL, query = '' } = {}) {
  const needle = fold(query);
  return entries.filter((entry) => {
    if (entry.status === 'retired') return false;
    if (!matchesFilter(states.get(entry.id), filter)) return false;
    if (needle === '') return true;
    return fold(entry.word).includes(needle) || fold(entry.vi).includes(needle);
  });
}

/**
 * Đếm số từ của MỌI bộ lọc trong một lượt duyệt — để nút lọc hiện đúng con số.
 * Đây là số ĐẦY ĐỦ, không bị cắt bởi phân trang hay tìm kiếm.
 * @param {Array<object>} entries
 * @param {Map<string, object>} states
 * @returns {Record<string, number>} luôn đủ mọi khoá trong FILTER_ORDER
 */
export function countByFilter(entries, states) {
  const counts = Object.fromEntries(FILTER_ORDER.map((key) => [key, 0]));
  for (const entry of entries) {
    if (entry.status === 'retired') continue;
    const state = states.get(entry.id);
    counts[FILTERS.ALL] += 1;
    if (state?.triaged) counts[state.level] = (counts[state.level] ?? 0) + 1;
    else counts[FILTERS.UNTRIAGED] += 1;
    if (state?.bookmarked) counts[FILTERS.BOOKMARKED] += 1;
  }
  return counts;
}
