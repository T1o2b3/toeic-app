/**
 * Tạo sự kiện nhật ký cho test logic. Chín file test từng tự chép một bản `const ev = …` (kèm `T0`, `at`, `answered`).
 * Reducer không lọc theo id sự kiện nên id chỉ cần không trùng; điều quan trọng là GIỜ mặc định — chỉnh bằng `step`.
 */

/** Mốc giờ chung của test logic: 19/9/2026 10:00 UTC. */
export const T0 = Date.UTC(2026, 8, 19, 10, 0, 0);

/** Giờ địa phương, mặc định giữa trưa — để múi giờ máy chạy test không kéo lệch ngày. */
export const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime();

/**
 * @param {{base?: number, step?: number}} [options] - giờ mặc định của sự kiện thứ n = base + step × n
 *   (step 0: mọi sự kiện cùng một giờ; step 1: mỗi sự kiện sau 1 ms — giữ đúng thứ tự)
 * @returns {(type: string, payload: object, ts?: number) => object}
 */
export function eventMaker({ base = T0, step = 0 } = {}) {
  let seq = 0;
  return (type, payload, ts = base + step * seq) => ({ id: `e-${seq++}`, deviceId: 'mac', ts, type, payload });
}

/**
 * Sự kiện "đã trả lời một câu hỏi", dựng bằng một `ev` từ eventMaker.
 * @param {ReturnType<typeof eventMaker>} ev
 */
export const answeredWith = (ev) => (questionId, correct, ts, errorType = 'wh-who') =>
  ev('question.answered', { questionId, choice: 'A', correct, errorType }, ts);
