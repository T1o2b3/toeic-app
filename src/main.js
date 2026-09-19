import './ui/style.css';
import { createStore } from './data/store.js';
import { mountApp } from './ui/app.js';
import { el, replace } from './ui/dom.js';

const root = document.querySelector('#app');

createStore()
  .then((store) => mountApp(root, store))
  .catch((error) => {
    replace(root, el('div', {}, [
      el('h1', { text: 'Không khởi động được' }),
      el('p', { class: 'empty', text: String(error?.message ?? error) }),
      el('p', { class: 'footnote', text: 'Nếu là lần đầu mở, thử tải lại trang.' }),
    ]));
  });
