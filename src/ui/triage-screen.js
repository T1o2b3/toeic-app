/**
 * Màn phân loại: lướt nhanh từng từ, đánh dấu đã biết / chưa biết.
 * Mục đích là loại bớt từ Huy đã thuộc để hàng đợi ôn không phình (D03).
 */
import { el, goTo } from './dom.js';
import { triageQueue } from '../logic/vocab-state.js';

const BATCH_SIZE = 20;

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderTriage(store) {
  const queue = triageQueue(store.entries, store.states, BATCH_SIZE);

  if (queue.length === 0) {
    return el('div', {}, [
      el('h1', { text: 'Phân loại xong' }),
      el('p', { class: 'empty', text: 'Mọi từ trong deck đã được phân loại.' }),
      el('button', { class: 'secondary', onClick: () => goTo('/') }, [el('span', { text: 'Về màn chính' })]),
    ]);
  }

  const entry = queue[0];
  const answer = async (known) => {
    await store.record('vocab.triaged', { wordId: entry.id, known });
  };

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Về màn chính', onClick: () => goTo('/') }),
      el('span', { class: 'progress', text: `còn ${queue.length} từ trong lượt này` }),
    ]),
    el('div', { class: 'card big' }, [
      el('div', { class: 'word', text: entry.word }),
      entry.ipa ? el('div', { class: 'ipa', text: entry.ipa }) : '',
      el('div', { class: 'hint', text: 'Bạn có biết nghĩa của từ này không?' }),
    ]),
    el('div', { class: 'actions two' }, [
      el('button', { class: 'grade again', onClick: () => answer(false) }, [
        el('span', { text: 'Chưa biết' }),
        el('small', { text: 'đưa vào danh sách học' }),
      ]),
      el('button', { class: 'grade easy', onClick: () => answer(true) }, [
        el('span', { text: 'Đã biết' }),
        el('small', { text: 'bỏ qua từ này' }),
      ]),
    ]),
    el('p', { class: 'footnote', text: 'Phím tắt: 1 = chưa biết, 2 = đã biết' }),
  ]);
}

/**
 * Phím tắt cho màn phân loại.
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handleTriageKey(store, event) {
  const queue = triageQueue(store.entries, store.states, 1);
  if (queue.length === 0) return;
  if (event.key === '1') store.record('vocab.triaged', { wordId: queue[0].id, known: false });
  if (event.key === '2') store.record('vocab.triaged', { wordId: queue[0].id, known: true });
}
