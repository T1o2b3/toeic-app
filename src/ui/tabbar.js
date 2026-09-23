/**
 * Điều hướng chính (D36, dựng lại ở D43): **cột bên trái trên màn rộng, thanh dưới đáy trên điện thoại**.
 *
 * Bốn mục: Tổng quan · Từ vựng (gồm cả Tra từ) · Bài thi · Sao lưu. Cùng một phần tử `<nav>`, CSS đổi chỗ:
 * máy tính có chỗ nên để menu cố định bên trái như một trang web thật; iPhone thì thanh dưới đáy vẫn hợp tay hơn.
 *
 * Trong một phiên học (phân loại, ôn thẻ, luyện câu, nghe, thi thử) thanh dưới đáy bị ẩn vì các màn đó có hàng
 * nút chấm dính đáy; còn cột bên trái thì vẫn hiện — màn rộng không thiếu chỗ. Đánh dấu bằng lớp `in-session`
 * để CSS quyết, thay vì thuộc tính `hidden` (hidden là ẩn ở mọi khổ màn hình).
 *
 * Nằm NGOÀI #app để mỗi lần vẽ lại màn không làm nháy menu.
 */
import { el } from './dom.js';
import { icon } from './blocks.js';

/** Mỗi mục và các màn thuộc về nó (để tô sáng đúng mục khi đang ở màn con). */
const TABS = Object.freeze([
  { key: 'home', label: 'Tổng quan', icon: 'home', href: '#/', screens: ['home'] },
  { key: 'vocab', label: 'Từ vựng', icon: 'book', href: '#/vocab', screens: ['vocab', 'words', 'weak', 'lookup'] },
  { key: 'exams', label: 'Bài thi', icon: 'exam', href: '#/exams', screens: ['exams'] },
  { key: 'sync', label: 'Sao lưu', icon: 'sync', href: '#/sync', screens: ['sync'] },
]);

/** Màn phiên học: ẩn thanh dưới đáy. Màn lạ không có trong TABS lẫn danh sách này thì vẫn hiện, không tô mục nào. */
const SESSION_SCREENS = Object.freeze(['triage', 'review', 'practice', 'quiz', 'listen', 'dictation', 'sets', 'exam']);

/**
 * Mục nào đang sáng.
 * @param {string} screen
 * @returns {string|null}
 */
function activeTab(screen) {
  return TABS.find((tab) => tab.screens.includes(screen))?.key ?? null;
}

/**
 * Thanh dưới đáy có hiện ở màn này không (cột bên trái thì luôn hiện).
 * @param {string} screen
 * @returns {boolean}
 */
function showTabBar(screen) {
  return !SESSION_SCREENS.includes(screen);
}

/**
 * Tạo phần tử <nav> (một lần) — cập nhật bằng `updateTabBar`.
 * @returns {HTMLElement}
 */
export function createTabBar() {
  return el('nav', { class: 'tabbar in-session', 'aria-label': 'Điều hướng chính' });
}

/**
 * Vẽ lại các mục theo màn hiện tại và bật/tắt thanh dưới đáy.
 * @param {HTMLElement} nav
 * @param {string} screen
 */
export function updateTabBar(nav, screen) {
  const visible = showTabBar(screen);
  nav.classList.toggle('in-session', !visible);
  document.body.classList.toggle('has-tabbar', visible);

  const current = activeTab(screen);
  nav.replaceChildren(
    el('div', { class: 'nav-brand', text: 'TOEIC 950' }),
    ...TABS.map((tab) => {
      const link = el('a', {
        class: tab.key === current ? 'tab active' : 'tab',
        href: tab.href,
      }, [icon(tab.icon), el('span', { text: tab.label })]);
      if (tab.key === current) link.setAttribute('aria-current', 'page');
      return link;
    }),
  );
}
