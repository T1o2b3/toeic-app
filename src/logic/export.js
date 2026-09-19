/**
 * Đóng gói dữ liệu người dùng để xuất ra file (D25: free tier Supabase không có backup tự động).
 * Hàm thuần — phần tải file do UI làm.
 */

/** Phiên bản định dạng file xuất, để sau này đọc lại biết cách hiểu. */
export const EXPORT_FORMAT = 1;

/**
 * Dựng nội dung file sao lưu.
 * @param {object} input
 * @param {Array<object>} input.events - toàn bộ nhật ký sự kiện
 * @param {string} input.deviceId
 * @param {Date} [input.now]
 * @returns {object}
 */
export function buildExport({ events, deviceId, now = new Date() }) {
  return {
    format: EXPORT_FORMAT,
    app: 'toeic-app',
    exportedAt: now.toISOString(),
    deviceId,
    eventCount: events.length,
    events,
  };
}

/**
 * Tên file sao lưu, có ngày giờ để nhiều bản không đè nhau.
 * @param {Date} [now]
 * @returns {string}
 */
export function exportFileName(now = new Date()) {
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return `toeic-app-backup-${stamp}.json`;
}

/**
 * Đọc lại file sao lưu, kiểm tra đúng định dạng trước khi nhập.
 * @param {unknown} data
 * @returns {Array<object>} danh sách sự kiện
 */
export function readExport(data) {
  if (data?.app !== 'toeic-app') throw new Error('Không phải file sao lưu của app này');
  if (data.format !== EXPORT_FORMAT) throw new Error(`Định dạng lạ: ${data.format}`);
  if (!Array.isArray(data.events)) throw new Error('File thiếu danh sách sự kiện');
  return data.events;
}
