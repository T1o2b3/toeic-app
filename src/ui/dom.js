/**
 * Vài hàm tiện dụng để dựng DOM. Chỉ dùng trong src/ui/.
 */

/**
 * Tạo phần tử.
 * @param {string} tag
 * @param {object} [props] - class, text, html, onClick, và thuộc tính data-*
 * @param {Array<Node|string>} [children]
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key === 'onClick') node.addEventListener('click', value);
    else node.setAttribute(key, value);
  }
  appendChildren(node, children);
  return node;
}

/**
 * Gắn con vào một nút, LÀM PHẲNG mảng lồng và bỏ qua null/undefined/false.
 *
 * Vì sao phải làm phẳng: viết `cond ? [a, b] : []` giữa danh sách con là cách tự nhiên để chèn
 * hai phần tử có điều kiện, nhưng nếu không làm phẳng thì cả mảng bị `String()` và người dùng
 * đọc được chữ "[object HTMLDivElement]" ngay trên màn hình (đã xảy ra ở màn kết quả thi).
 * Bỏ qua null/false cũng vì lý do đó: `cond && el(...)` không được in ra chữ "false".
 */
function appendChildren(node, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) { appendChildren(node, child); continue; }
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }
}

/**
 * Thay toàn bộ nội dung của một phần tử.
 * @param {HTMLElement} root
 * @param {...Node} nodes
 */
export function replace(root, ...nodes) {
  root.replaceChildren(...nodes);
}

/** Chuyển sang màn khác bằng cách đổi hash trên URL. */
export function goTo(path) {
  window.location.hash = path;
}

/**
 * Về đầu trang khi SANG MỤC MỚI (bộ kế, câu kế). Trình duyệt giữ nguyên chỗ cuộn nếu nội dung mới vẫn
 * đủ dài, nên bấm "Bộ tiếp theo" ở cuối một bộ Part 7 sẽ rơi vào giữa bài mới nếu không gọi hàm này.
 * Kiểm `scrollY` trước cũng là cách tránh gọi `scrollTo` trong jsdom (luôn 0, và jsdom chưa cài hàm này).
 */
export function scrollToTop() {
  if (window.scrollY !== 0) window.scrollTo(0, 0);
}
