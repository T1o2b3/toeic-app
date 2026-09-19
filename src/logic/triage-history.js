/**
 * Đi lùi / đi tới trong các từ đã chấm ở một lượt phân loại.
 *
 * Nhật ký sự kiện là append-only nên KHÔNG có "hoàn tác" thật (không xoá được sự kiện đã ghi).
 * Thay vào đó, đi lùi = xem lại từ cũ và chấm lại; sự kiện chấm mới ghi đè mức cũ (sự kiện
 * sau thắng), và cả hai còn nguyên trong nhật ký.
 *
 * Con trỏ `index`: null = đang ở từ mới nhất (đầu hàng đợi), số = đang xem lại từ thứ `index`
 * trong lịch sử. Hàm thuần, không đụng DOM.
 */

/**
 * Bấm "từ trước": lùi một bước.
 * @param {number} length - số từ đã chấm trong lượt
 * @param {number|null} index
 * @returns {number|null} vị trí mới, hoặc null nếu không lùi được nữa (đứng yên)
 */
export function stepBack(length, index) {
  const from = index ?? length;
  return from > 0 ? from - 1 : index;
}

/**
 * Chấm xong một từ đang xem lại: đi tới từ kế tiếp trong lịch sử, hết thì về từ mới nhất.
 * @param {number} length
 * @param {number|null} index
 * @returns {number|null}
 */
export function stepForward(length, index) {
  if (index === null) return null;
  return index + 1 < length ? index + 1 : null;
}

/**
 * Có lùi được không?
 * @param {number} length
 * @param {number|null} index
 * @returns {boolean}
 */
export function canStepBack(length, index) {
  return (index ?? length) > 0;
}
