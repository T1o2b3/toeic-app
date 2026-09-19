/**
 * Định dạng dữ liệu cho người đọc. Hàm thuần, không đụng DOM.
 */

/**
 * Đổi một khoảng thời gian thành chữ tiếng Việt ngắn gọn.
 * Dùng trên nút đánh giá ("Tốt · 3 ngày") nên ưu tiên ngắn hơn là chính xác tuyệt đối.
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  if (ms < 60_000) return 'dưới 1 phút';

  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} phút`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} giờ`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} ngày`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} tháng`;

  return `${(days / 365).toFixed(1).replace('.0', '')} năm`;
}

/**
 * Ước lượng thời lượng một phiên học, để báo trước cho người học (RESEARCH.md R1).
 * Con số dựa trên nhịp thực tế: ôn một thẻ đã biết ~8 giây, học một thẻ mới ~20 giây.
 * @param {number} reviewCount
 * @param {number} newCount
 * @returns {string} vd "~6 phút"
 */
export function estimateSessionTime(reviewCount, newCount) {
  const seconds = reviewCount * 8 + newCount * 20;
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `~${minutes} phút`;
}

/**
 * Đếm số lượng theo nhóm để hiện ở màn tổng quan (RESEARCH.md R2).
 * @param {Array<{isNew: boolean}>} queue
 * @returns {{total: number, fresh: number, due: number}}
 */
export function summarizeQueue(queue) {
  const fresh = queue.filter((item) => item.isNew).length;
  return { total: queue.length, fresh, due: queue.length - fresh };
}
