/**
 * Hash router tự viết (D21): địa chỉ dạng #/review, #/triage.
 * Dùng hash thay vì đường dẫn thật để host tĩnh (Cloudflare) không cần cấu hình gì thêm (D27).
 */

/**
 * Đọc màn hình hiện tại từ URL.
 * @param {string} hash - vd "#/review?deck=x"
 * @returns {{name: string, params: URLSearchParams}}
 */
export function parseRoute(hash) {
  const raw = (hash ?? '').replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  return { name: path === '' ? 'home' : path, params: new URLSearchParams(query) };
}

/**
 * Gắn router vào cửa sổ trình duyệt.
 * @param {(route: {name: string, params: URLSearchParams}) => void} onChange
 * @returns {() => void} hàm gỡ router
 */
export function startRouter(onChange) {
  const handle = () => onChange(parseRoute(window.location.hash));
  window.addEventListener('hashchange', handle);
  handle();
  return () => window.removeEventListener('hashchange', handle);
}
