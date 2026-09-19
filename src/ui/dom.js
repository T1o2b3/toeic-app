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
  for (const child of children) {
    node.append(child instanceof Node ? child : document.createTextNode(child));
  }
  return node;
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
