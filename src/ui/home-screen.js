/**
 * Màn hình tạm của M1: xác nhận khung app chạy được trên mọi thiết bị.
 * Sẽ được thay bằng router + màn học thật ở M3.
 */
import { createEvent } from '../logic/events.js';
import { getDeviceId } from '../data/device.js';

/**
 * Vẽ màn hình chào vào phần tử gốc.
 * @param {HTMLElement} root
 */
export function renderHomeScreen(root) {
  const deviceId = getDeviceId();
  const event = createEvent({ type: 'session.started', deviceId });

  root.innerHTML = `
    <h1>TOEIC app</h1>
    <p class="subtitle">Ôn Listening &amp; Reading — bản cá nhân</p>
    <div class="card">
      <h2>Trạng thái khung app</h2>
      <p class="status">Chạy được ✓</p>
      <p>Thiết bị này: <code>${deviceId}</code></p>
      <p>Sự kiện mẫu vừa tạo (chưa lưu, sẽ lưu vào IndexedDB ở M3):</p>
      <pre>${JSON.stringify(event, null, 2)}</pre>
    </div>
  `;
}
