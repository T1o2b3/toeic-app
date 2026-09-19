/**
 * Tiến độ của một LƯỢT học — dùng chung cho MỌI màn có bộ đếm
 * (luyện Part 5, phân loại từ, ôn thẻ). Hàm thuần, không đụng DOM.
 *
 * ┌─ ĐỌC KỸ TRƯỚC KHI THÊM BỘ ĐẾM Ở BẤT KỲ MÀN NÀO ──────────────────────────┐
 * │ Lỗi này đã xảy ra HAI lần (Part 5 đứng yên ở 20, phân loại đứng yên ở 20, │
 * │ ôn thẻ đứng yên ở 10). Cùng một nguyên nhân:                              │
 * │                                                                          │
 * │   Hàng đợi là CỬA SỔ TRƯỢT, không phải phần việc còn lại.                 │
 * │                                                                          │
 * │ `quizQueue`, `triageQueue`, `reviewQueue` đều cắt lấy đúng N mục từ một   │
 * │ kho lớn hơn nhiều. Làm xong một mục thì mục kế tiếp trong kho lấp ngay    │
 * │ vào chỗ trống, nên `queue.length` KHÔNG BAO GIỜ GIẢM — bộ đếm đứng yên.   │
 * │                                                                          │
 * │ Quy tắc: số việc còn lại phải tính từ SỐ VIỆC ĐÃ LÀM (đếm ngược từ        │
 * │ hạn mức của lượt), không bao giờ lấy `.length` của hàng đợi đã bị cắt.    │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

/**
 * Lượt có số mục CỐ ĐỊNH biết trước (luyện Part 5, phân loại từ).
 *
 * @param {object} input
 * @param {number} input.roundSize - số mục mỗi lượt
 * @param {number} input.doneCount - số mục đã làm trong lượt này (kể cả mục đang hiện trên màn)
 * @param {number} input.availableCount - số mục còn lấy được từ kho
 * @param {boolean} [input.locked] - đang xem kết quả/giải thích của mục vừa làm
 * @returns {{remaining: number, finished: boolean}} remaining tính cả mục đang hiện trên màn hình
 */
export function roundProgress({ roundSize, doneCount, availableCount, locked = false }) {
  const left = Math.max(0, roundSize - doneCount);
  const finished = left === 0 && !locked;
  const remaining = locked
    ? Math.min(left, availableCount) + 1
    : Math.min(left, availableCount);
  return { remaining, finished };
}

/**
 * Lượt ôn thẻ — số mục KHÔNG cố định, vì gồm hai nguồn khác nhau:
 *   - thẻ đến hạn: lấy hết, bao nhiêu cũng phải ôn (quên một từ đã học tốn công hơn học từ mới);
 *   - từ mới: có hạn mức mỗi lượt để không nhồi quá nhiều thứ mới một lúc (D03).
 *
 * `dueCount` và `newAvailable` phải là số ĐẦY ĐỦ (dùng `reviewCounts`), không phải
 * độ dài `reviewQueue` — hàng đợi đó đã bị cắt bởi maxNew/maxTotal.
 *
 * Con số này lên xuống trong một lượt là ĐÚNG, không phải lỗi: chấm "Quên" đẩy thẻ
 * về hạn vài phút sau, nên lát nữa nó đến hạn trở lại và phải ôn thật.
 *
 * @param {object} input
 * @param {number} input.dueCount - số thẻ đang đến hạn ngay lúc này
 * @param {number} input.newAvailable - số từ mới còn lấy được
 * @param {number} input.newPerRound - hạn mức từ mới mỗi lượt
 * @param {number} input.newDoneCount - số từ mới đã đưa ra trong lượt này
 * @returns {{remaining: number, newRemaining: number, finished: boolean}}
 */
export function reviewProgress({ dueCount, newAvailable, newPerRound, newDoneCount }) {
  const newLeft = Math.max(0, newPerRound - newDoneCount);
  const newRemaining = Math.min(Math.max(0, newAvailable), newLeft);
  const remaining = Math.max(0, dueCount) + newRemaining;
  return { remaining, newRemaining, finished: remaining === 0 };
}
