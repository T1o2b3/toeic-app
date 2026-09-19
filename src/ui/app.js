/**
 * Lắp ráp app: router + store + bàn phím. Mỗi khi trạng thái đổi thì vẽ lại màn hiện tại.
 */
import { el, replace } from './dom.js';
import { startRouter } from './router.js';
import { renderHome } from './home-screen.js';
import { renderTriage, handleTriageKey } from './triage-screen.js';
import { renderReview, handleReviewKey, resetReview } from './review-screen.js';
import { renderWeak } from './weak-screen.js';

const SCREENS = {
  home: renderHome,
  triage: renderTriage,
  review: renderReview,
  weak: renderWeak,
};

const KEY_HANDLERS = {
  triage: handleTriageKey,
  review: handleReviewKey,
};

/**
 * Gắn app vào DOM.
 * @param {HTMLElement} root
 * @param {object} store
 */
export function mountApp(root, store) {
  let current = { name: 'home', params: new URLSearchParams() };

  const draw = () => {
    const render = SCREENS[current.name] ?? renderHome;
    try {
      replace(root, render(store));
    } catch (error) {
      replace(root, renderError(error));
    }
  };

  startRouter((route) => {
    if (route.name !== current.name) resetReview();
    current = route;
    draw();
  });

  store.subscribe(draw);

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    KEY_HANDLERS[current.name]?.(store, event);
  });
}

/** Màn báo lỗi: thà hiện lỗi rõ ràng còn hơn trang trắng. */
function renderError(error) {
  return el('div', {}, [
    el('h1', { text: 'Có lỗi' }),
    el('p', { class: 'empty', text: String(error?.message ?? error) }),
    el('button', { class: 'secondary', onClick: () => window.location.reload() }, [
      el('span', { text: 'Tải lại' }),
    ]),
  ]);
}
