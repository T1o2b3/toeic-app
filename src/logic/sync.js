/**
 * Logic đồng bộ hai chiều theo nhật ký sự kiện (D23).
 * Hàm thuần, không gọi mạng — phần gọi Supabase nằm ở src/data/sync.js.
 *
 * Vì sự kiện là bất biến và có id riêng, đồng bộ chỉ là "trao đổi phần còn thiếu":
 * không bao giờ có xung đột, không cần biết ai ghi trước ai ghi sau.
 */

/**
 * Tìm phần còn thiếu ở mỗi bên.
 * @param {Array<{id: string}>} local
 * @param {Array<{id: string}>} remote
 * @returns {{toPush: Array<object>, toPull: Array<object>}}
 */
export function diffEvents(local, remote) {
  const localIds = new Set((local ?? []).map((event) => event.id));
  const remoteIds = new Set((remote ?? []).map((event) => event.id));

  return {
    toPush: (local ?? []).filter((event) => !remoteIds.has(event.id)),
    toPull: (remote ?? []).filter((event) => !localIds.has(event.id)),
  };
}

/**
 * Đổi sự kiện của app thành dòng trong bảng Supabase.
 * @param {Array<object>} events
 * @param {string} userId
 * @returns {Array<object>}
 */
export function toRows(events, userId) {
  if (!userId) throw new Error('Thiếu userId — chưa đăng nhập thì không đẩy dữ liệu lên được');
  return events.map((event) => ({
    id: event.id,
    user_id: userId,
    device_id: event.deviceId,
    ts: event.ts,
    type: event.type,
    payload: event.payload ?? {},
  }));
}

/**
 * Chiều ngược lại: dòng trong bảng -> sự kiện của app.
 * Dòng hỏng bị bỏ qua thay vì làm hỏng cả lần đồng bộ.
 * @param {Array<object>} rows
 * @returns {Array<object>}
 */
export function fromRows(rows) {
  const events = [];
  for (const row of rows ?? []) {
    if (!row?.id || !row?.type || typeof row.ts !== 'number') continue;
    events.push({
      id: row.id,
      deviceId: row.device_id ?? 'khong-ro',
      ts: row.ts,
      type: row.type,
      payload: row.payload ?? {},
    });
  }
  return events;
}

/**
 * Câu tóm tắt kết quả đồng bộ để hiện cho người dùng.
 * @param {{pushed: number, pulled: number}} result
 * @returns {string}
 */
export function describeSync({ pushed, pulled }) {
  if (pushed === 0 && pulled === 0) return 'Đã đồng bộ, không có gì mới';
  const parts = [];
  if (pushed > 0) parts.push(`gửi lên ${pushed}`);
  if (pulled > 0) parts.push(`nhận về ${pulled}`);
  return `Đồng bộ xong: ${parts.join(', ')} sự kiện`;
}
