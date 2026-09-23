import './ui/style.css';
import './ui/shell.css';
import { createStore } from './data/store.js';
import { watchForUpdate } from './data/sw-update.js';
import { mountApp } from './ui/app.js';
import { startAutoSync } from './data/sync.js';
import { el, replace } from './ui/dom.js';

const root = document.querySelector('#app');

watchForUpdate();

createStore()
  .then((store) => {
    mountApp(root, store);
    // Tự đồng bộ (D55). Rời app cũng đồng bộ: trên iPhone đó thường là lần cuối JS còn được chạy.
    const syncNow = startAutoSync(store);
    document.addEventListener('visibilitychange', syncNow);
    window.addEventListener('online', syncNow);
  })
  .catch((error) => {
    replace(root, el('div', {}, [
      el('h1', { text: 'Không khởi động được' }),
      el('p', { class: 'empty', text: String(error?.message ?? error) }),
      el('p', { class: 'footnote', text: 'Nếu là lần đầu mở, thử tải lại trang.' }),
    ]));
  });
