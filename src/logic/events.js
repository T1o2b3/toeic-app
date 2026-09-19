/**
 * Nhật ký sự kiện append-only (DECISIONS.md D23).
 * Mọi hoạt động học của người dùng được ghi thành sự kiện bất biến;
 * trạng thái (lịch ôn, từ hay sai, thống kê) được tính lại từ nhật ký này.
 * Các hàm ở đây là hàm thuần: id/ts có thể truyền vào để test được.
 */

/** Các loại sự kiện đã biết. Thêm loại mới ở đây trước khi dùng. */
export const EVENT_TYPES = Object.freeze([
  'vocab.triaged',
  'vocab.reviewed',
  'vocab.bookmarked',
  'question.answered',
  'question.reported',
  'session.started',
  'session.ended',
]);

/**
 * Tạo một sự kiện mới, bất biến.
 * @param {object} input
 * @param {string} input.type - một giá trị trong EVENT_TYPES
 * @param {string} input.deviceId - id thiết bị tạo ra sự kiện
 * @param {object} [input.payload] - dữ liệu riêng của loại sự kiện
 * @param {string} [input.id] - uuid; mặc định sinh tự động
 * @param {number} [input.ts] - mốc thời gian ms; mặc định là hiện tại
 * @returns {Readonly<{id: string, deviceId: string, ts: number, type: string, payload: object}>}
 */
export function createEvent({ type, deviceId, payload = {}, id, ts }) {
  if (!EVENT_TYPES.includes(type)) {
    throw new Error(`Loại sự kiện không hợp lệ: ${type}`);
  }
  if (typeof deviceId !== 'string' || deviceId.length === 0) {
    throw new Error('deviceId bắt buộc và phải là chuỗi khác rỗng');
  }
  return Object.freeze({
    id: id ?? crypto.randomUUID(),
    deviceId,
    ts: ts ?? Date.now(),
    type,
    payload: Object.freeze({ ...payload }),
  });
}

/**
 * Gộp nhiều nhật ký sự kiện thành một, bỏ trùng theo id và sắp xếp theo thời gian.
 * Dùng khi đồng bộ giữa các thiết bị (D23: trao đổi sự kiện còn thiếu, không xung đột).
 * Khi trùng ts thì sắp xếp thêm theo id để kết quả ổn định trên mọi máy.
 * @param {...Array<object>} logs
 * @returns {Array<object>} nhật ký đã gộp
 */
export function mergeEventLogs(...logs) {
  const byId = new Map();
  for (const log of logs) {
    for (const event of log) {
      if (!byId.has(event.id)) byId.set(event.id, event);
    }
  }
  return [...byId.values()].sort((a, b) => a.ts - b.ts || a.id.localeCompare(b.id));
}
