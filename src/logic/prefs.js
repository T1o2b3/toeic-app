/**
 * Tuỳ chọn của người dùng. Hàm thuần — phần đọc/ghi localStorage nằm ở src/data/.
 * Hiện chỉ lưu trên từng máy; đồng bộ cài đặt là việc sau (D23: cài đặt dùng last-write-wins).
 */

/**
 * Các lựa chọn số câu mỗi lượt luyện Part 5. 30 = ĐÚNG số câu Part 5 của đề thật (D39);
 * các mức nhỏ hơn dành cho lúc chỉ có mươi phút.
 */
export const ROUND_SIZES = Object.freeze([10, 20, 30]);

/** Mặc định 30 câu: một lượt là một mẻ Part 5 đầy đủ, mất khoảng 10 phút theo nhịp đề thật. */
export const DEFAULT_ROUND_SIZE = 30;

/**
 * Lọc giá trị đọc được về một lựa chọn hợp lệ.
 * Dữ liệu trong localStorage có thể là chuỗi, số lạ, hoặc rác — không được tin.
 * @param {unknown} value
 * @returns {number}
 */
export function normalizeRoundSize(value) {
  const size = Number.parseInt(value, 10);
  return ROUND_SIZES.includes(size) ? size : DEFAULT_ROUND_SIZE;
}

/** Mặc định HIỆN nghĩa khi phân loại: không thấy nghĩa thì tự chấm 4 mức rất dễ sai. */
export const DEFAULT_SHOW_MEANING = true;

/**
 * Lọc giá trị "có hiện nghĩa khi phân loại không" đọc từ localStorage.
 * localStorage chỉ lưu được chuỗi, nên '1'/'0' mới là thứ thực sự đọc lên.
 * @param {unknown} value
 * @returns {boolean}
 */
export function normalizeShowMeaning(value) {
  if (value === '0' || value === false) return false;
  if (value === '1' || value === true) return true;
  return DEFAULT_SHOW_MEANING;
}

/** Mặc định KHÔNG lọc tầng — không âm thầm giấu bớt từ của Huy (ràng buộc #9). */
export const DEFAULT_TIER = 'all';

/**
 * Lọc lựa chọn tầng đọc từ localStorage về một giá trị hợp lệ.
 * @param {unknown} value
 * @param {string[]} allowed - các tầng hợp lệ (TIER_ORDER)
 * @returns {string}
 */
export function normalizeTier(value, allowed) {
  return allowed.includes(value) || value === DEFAULT_TIER ? value : DEFAULT_TIER;
}
