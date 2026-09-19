/**
 * Dựng cả app (jsdom + IndexedDB giả + deck/câu hỏi nhỏ) cho các test giao diện.
 * Mỗi file test chạy trong một cửa sổ jsdom riêng nên mỗi file gọi bootApp() đúng MỘT lần
 * (mountApp gắn listener lên window, gắn hai lần thì mỗi phím bị xử lý hai lần).
 */
import { IDBFactory } from 'fake-indexeddb';
import { createStore } from '../../src/data/store.js';
import { mountApp } from '../../src/ui/app.js';

const WORD_COUNT = 60;
const DECK = {
  deck: 'toeic-tsl',
  version: 1,
  attribution: { source: 'TSL 1.2', authors: 'B&C', license: 'CC BY-SA 4.0', url: 'https://x.test' },
  entries: Array.from({ length: WORD_COUNT }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return {
      id: `tsl-00${n}`, word: `w${n}x`, rank: i + 1, deck: 'toeic-tsl', pos: ['noun'],
      vi: `nghĩa số ${n}`, examples: [{ en: `Example ${n}.`, vi: `Ví dụ ${n}.` }],
    };
  }),
};
// Từ giả w01x… chứa chữ số nên bộ tách từ (chỉ nhận chữ cái) không gạt được; từ số 45 đổi thành từ thật.
DECK.entries[44].word = 'ledger';

const QUESTIONS = {
  set: 'part5', part: 5, version: 1,
  entries: [{
    id: 'p5-9001', set: 'part5-core', part: 5, status: 'active',
    stem: 'The council will ---- the ledger rules and zoning laws quickly.',
    options: { A: 'amend', B: 'abolish', C: 'enforce', D: 'suspend' },
    answer: 'A', errorType: 'vocabulary', explanation: 'Giải thích.', trap: 'Bẫy.',
  }],
};

/** @returns {Promise<object>} store, root và các hàm thao tác/đọc màn hình */
export async function bootApp() {
  const fetchImpl = async (url) => {
    const data = String(url).includes('vocab-toeic-tsl') ? DECK
      : String(url).includes('questions-part5') ? QUESTIONS : null;
    return data ? { ok: true, status: 200, json: async () => data } : { ok: false, status: 404 };
  };
  const store = await createStore({ factory: new IDBFactory(), fetchImpl });
  document.body.innerHTML = '<div id="app"></div>';
  const root = document.getElementById('app');
  mountApp(root, store);

  const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));
  const button = (matcher, scope = root) =>
    [...scope.querySelectorAll('button')].find((b) => matcher(b.textContent));

  return {
    store, root, tick, button,
    go: async (hash) => { window.location.hash = hash; await tick(50); },
    key: async (k) => { window.dispatchEvent(new KeyboardEvent('keydown', { key: k })); await tick(); },
    text: () => root.textContent.replace(/\s+/g, ' '),
    word: () => root.querySelector('.word')?.textContent,
    click: async (matcher, scope) => {
      const target = button(matcher, scope);
      if (!target) throw new Error(`không thấy nút (${matcher})`);
      target.click();
      await tick();
    },
    levelOf: (w) => store.states.get(store.entries.find((e) => e.word === w).id)?.level,
  };
}
