/**
 * Tuỳ chọn của người dùng. Hàm thuần — phần đọc/ghi localStorage nằm ở src/data/.
 * Hiện chỉ lưu trên từng máy; đồng bộ cài đặt là việc sau (D23: cài đặt dùng last-write-wins).
 */

/** Các lựa chọn số câu mỗi lượt luyện. */
export const ROUND_SIZES = Object.freeze([10, 15, 20]);

/** Mặc định: lượt vừa phải, hợp nhịp học 1–2 giờ/tuần (D03). */
export const DEFAULT_ROUND_SIZE = 15;

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
