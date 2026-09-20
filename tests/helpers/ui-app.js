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

function clip(n) { return `audio/${String(n).padStart(16, '0')}.mp3`; }
const LISTENING = {
  set: 'part2', part: 2, version: 1,
  entries: [
    { id: 'l2-0001', question: 'Where should I send the signed contract?', answer: 'B', errorType: 'wh-where',
      responses: { A: 'I sent it yesterday.', B: 'Ms. Park in legal has the address.', C: 'It was a long contract.' },
      explanation: 'Câu hỏi Where, câu đáp chỉ người giữ địa chỉ.', trap: 'Câu đáp lặp lại từ contract.' },
    { id: 'l2-0002', question: 'Who is responsible for the quarterly audit?', answer: 'C', errorType: 'wh-who',
      responses: { A: 'By the end of the week.', B: 'The audit was very long.', C: 'Ask the finance director.' },
      explanation: 'Câu hỏi Who, câu đáp chỉ chức danh.', trap: 'Câu đáp nói về thời gian.' },
    { id: 'l2-0003', question: 'Could you print these reports for the meeting?', answer: 'A', errorType: 'request-suggestion',
      responses: { A: 'Sure, how many copies?', B: 'The meeting room is full.', C: 'I prefer coffee.' },
      explanation: 'Lời đề nghị, câu đáp đồng ý và hỏi lại số bản.', trap: 'Câu đáp lặp lại từ meeting.' },
  ].map((item, i) => ({
    ...item, set: 'part2-core', part: 2, status: 'active',
    audio: { question: clip(i * 4 + 1), A: clip(i * 4 + 2), B: clip(i * 4 + 3), C: clip(i * 4 + 4) },
  })),
};

// Mỗi phương án kèm một từ tiếng Anh THẬT: id giả (`p6-0001-a0`) bị bộ tách từ bỏ qua vì lẫn chữ số,
// nên không có từ thật thì không test được việc gạt từ trong phương án.
const OPTION_WORD = { A: 'ledger', B: 'invoice', C: 'warehouse', D: 'deadline' };
const qs = (id, n, types = ['gist', 'detail', 'inference']) => Array.from({ length: n }, (_, i) => ({
  id: `${id}-${i + 1}`, stem: `Question ${i + 1} of ${id}?`, answer: 'BCDA'[i % 4], errorType: types[i % types.length],
  options: Object.fromEntries(['A', 'B', 'C', 'D'].map((L) => [L, `${id} ${L.toLowerCase()}${i} ${OPTION_WORD[L]}`])),
  explanation: `Giải thích câu ${i + 1} của bộ ${id}, dựa vào tài liệu.`, trap: `Bẫy của câu ${i + 1}.`,
}));
const baseSet = (id, part, kind) => ({ id, set: `part${part}-core`, part, status: 'active', kind, title: `Bộ ${id}`,
  gen: { model: 'm', promptVersion: 'sets-v1', batch: 'b', date: '2026-09-20' }, verify: { model: 'n', agreed: true } });
const SETS = {
  3: [1, 2].map((n) => ({ ...baseSet(`p3-000${n}`, 3, 'conversation'), questions: qs(`p3-000${n}`, 3),
    script: [{ speaker: 'Woman', text: `Hello Tom, the shipment number ${n} is late again.` }, { speaker: 'Man', text: 'Well, let me check the warehouse records.' }],
    audio: { clips: [clip(100 + n * 2), clip(101 + n * 2)], voices: { Woman: 'en-US-JennyNeural', Man: 'en-US-GuyNeural' } } })),
  4: [],
  6: [{ ...baseSet('p6-0001', 6, 'text-completion'), questions: qs('p6-0001', 4, ['grammar-in-context', 'vocab-in-context', 'connector-in-context', 'sentence-insertion']),
    passages: [{ label: 'Email', text: 'Dear staff, the ledger [1] updated on Friday and we [2] every report before the deadline. [3] please keep your records [4] and complete.' }] }],
  7: [{ ...baseSet('p7-0001', 7, 'single'), questions: qs('p7-0001', 2), passages: [{ label: 'Notice', text: 'Notice to all tenants: the elevator will be closed for maintenance on Monday from nine until noon.' }] },
      { ...baseSet('p7-0002', 7, 'double'), questions: qs('p7-0002', 5, ['detail', 'cross-reference']), passages: [{ label: 'Email', text: 'Hello team, please confirm your attendance at the training session next Tuesday afternoon.' }, { label: 'Reply', text: 'Thanks for the reminder; I will attend but need to leave early at four for a client meeting.' }] }],
};

/**
 * @param {{questions?: object[]}} [override] - thay ngân hàng Part 5 (mặc định chỉ 1 câu, đủ cho hầu hết test;
 *   test nào cần mặt cắt đề thật thì truyền vào một ngân hàng đủ 12 dạng)
 * @returns {Promise<object>} store, root và các hàm thao tác/đọc màn hình
 */
export async function bootApp(override = {}) {
  const questions = override.questions ? { ...QUESTIONS, entries: override.questions } : QUESTIONS;
  const fetchImpl = async (url) => {
    const data = String(url).includes('vocab-toeic-tsl') ? DECK
      : String(url).includes('questions-part5') ? questions
      : String(url).includes('listening-part2') ? LISTENING
      : /sets-part(\d)/.test(String(url)) ? { set: 'x', part: 0, version: 1, entries: SETS[Number(String(url).match(/sets-part(\d)/)[1])] ?? [] } : null;
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
