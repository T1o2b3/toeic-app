/**
 * Thanh tab dưới đáy: Tổng quan · Từ vựng · Bài thi · Tra từ (D36).
 *
 * Ẩn khi đang trong một phiên học (phân loại, ôn thẻ, luyện câu, nghe, ôn chủ động): các màn đó có hàng nút
 * chấm dính đáy và cần toàn bộ màn hình để tập trung; thoát bằng nút "←" ở đầu màn như trước.
 * Nằm NGOÀI #app để mỗi lần vẽ lại màn không làm nháy thanh tab.
 */
import { el } from './dom.js';

/** Mỗi tab và các màn thuộc về nó (để tô sáng đúng tab khi đang ở màn con). */
export const TABS = Object.freeze([
  { key: 'home', label: 'Tổng quan', icon: '◔', href: '#/', screens: ['home'] },
  { key: 'vocab', label: 'Từ vựng', icon: 'Aa', href: '#/vocab', screens: ['vocab', 'words', 'weak'] },
  { key: 'exams', label: 'Bài thi', icon: '✎', href: '#/exams', screens: ['exams'] },
  { key: 'lookup', label: 'Tra từ', icon: '⌕', href: '#/lookup', screens: ['lookup'] },
]);

/** Màn phiên học: ẩn thanh tab. Màn không có trong TABS lẫn danh sách này (vd sync) thì hiện thanh tab, không tô tab nào. */
export const SESSION_SCREENS = Object.freeze(['triage', 'review', 'practice', 'quiz', 'listen']);

/**
 * Tab nào đang sáng.
 * @param {string} screen
 * @returns {string|null}
 */
export function activeTab(screen) {
  return TABS.find((tab) => tab.screens.includes(screen))?.key ?? null;
}

/**
 * Thanh tab có hiện ở màn này không.
 * @param {string} screen
 * @returns {boolean}
 */
export function showTabBar(screen) {
  return !SESSION_SCREENS.includes(screen);
}

/**
 * Tạo phần tử <nav> (một lần) — cập nhật bằng `updateTabBar`.
 * @returns {HTMLElement}
 */
export function createTabBar() {
  return el('nav', { class: 'tabbar', 'aria-label': 'Điều hướng chính', hidden: 'hidden' });
}

/**
 * Vẽ lại các tab theo màn hiện tại và bật/tắt thanh.
 * @param {HTMLElement} nav
 * @param {string} screen
 */
export function updateTabBar(nav, screen) {
  const visible = showTabBar(screen);
  nav.hidden = !visible;
  document.body.classList.toggle('has-tabbar', visible);
  if (!visible) return;

  const current = activeTab(screen);
  nav.replaceChildren(...TABS.map((tab) => {
    const link = el('a', {
      class: tab.key === current ? 'tab active' : 'tab',
      href: tab.href,
    }, [el('span', { class: 'tab-icon', text: tab.icon }), el('span', { text: tab.label })]);
    if (tab.key === current) link.setAttribute('aria-current', 'page');
    return link;
  }));
}
