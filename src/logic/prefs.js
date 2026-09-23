/**
 * Tuỳ chọn của người dùng. Hàm thuần — phần đọc/ghi localStorage nằm ở src/data/.
 * Hiện chỉ lưu trên từng máy; đồng bộ cài đặt là việc sau (D23: cài đặt dùng last-write-wins).
 */

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
