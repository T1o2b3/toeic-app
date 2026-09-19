/**
 * Tự tải lại trang khi service worker cài xong bản mới.
 *
 * Vì sao cần: registerSW chỉ đăng ký service worker, không tải lại trang. Bản mới chỉ
 * có tác dụng từ LẦN MỞ SAU — nên sau khi deploy, mở app lần đầu vẫn thấy bản cũ.
 * Lỗi này đã gặp thật: bản sửa bộ đếm đã deploy nhưng máy vẫn hiện bản cũ.
 */

/** Gắn cơ chế tự tải lại. Gọi một lần lúc khởi động app. */
export function watchForUpdate() {
  const container = globalThis.navigator?.serviceWorker;
  if (!container) return;

  // Lần cài đầu tiên cũng làm controller thay đổi — lúc đó KHÔNG được tải lại,
  // vì trang đang hiển thị đã là bản mới nhất rồi.
  const hadController = Boolean(container.controller);
  let reloading = false;

  container.addEventListener('controllerchange', () => {
    if (!hadController || reloading) return;
    reloading = true;
    globalThis.location.reload();
  });
}
