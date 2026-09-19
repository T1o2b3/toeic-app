/**
 * Định danh thiết bị. Mỗi máy (2 Mac + iPhone) có một id riêng, tạo một lần
 * rồi lưu localStorage, dùng để gắn vào mọi sự kiện (D23).
 */
const STORAGE_KEY = 'toeic-app.deviceId';

/**
 * Lấy id thiết bị hiện tại, tạo mới nếu chưa có.
 * @returns {string}
 */
export function getDeviceId() {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
