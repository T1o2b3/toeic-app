/**
 * Màn phân loại: lướt nhanh từng từ, đánh dấu đã biết / chưa biết.
 * Mục đích là loại bớt từ Huy đã thuộc để hàng đợi ôn không phình (D03).
 */
import { el, goTo } from './dom.js';
import { triageQueue, countUntriaged } from '../logic/vocab-state.js';
import { roundProgress } from '../logic/round.js';

/** Số từ mỗi lượt phân loại — đủ ngắn để làm xong trong một lần ngồi. */
const ROUND_SIZE = 20;

/** Từ đã phân loại trong lượt này. Nguồn duy nhất để đếm ngược (xem src/logic/round.js). */
let doneThisRound = new Set();

/**
 * Hàng đợi của lượt hiện tại: chỉ lấy đúng số từ CÒN LẠI của lượt,
 * nhờ vậy lượt kết thúc sau đủ ROUND_SIZE từ thay vì kéo dài mãi.
 */
function roundQueue(store) {
  const left = Math.max(0, ROUND_SIZE - doneThisRound.size);
  if (left === 0) return [];
  return triageQueue(store.entries, store.states, left);
}

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderTriage(store) {
  const untriaged = countUntriaged(store.entries, store.states);
  const queue = roundQueue(store);
  const { remaining, finished } = roundProgress({
    roundSize: ROUND_SIZE,
    doneCount: doneThisRound.size,
    availableCount: queue.length,
  });

  if (remaining === 0) return renderDone(store, { finished, untriaged });

  const entry = queue[0];
  const answer = async (known) => {
    doneThisRound.add(entry.id);
    await store.record('vocab.triaged', { wordId: entry.id, known });
  };

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Về màn chính', onClick: () => goTo('/') }),
      el('span', { class: 'progress', text: `còn ${remaining} từ trong lượt · ${untriaged} từ chưa phân loại` }),
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

/** Màn kết thúc: hết lượt (còn từ để làm tiếp) hoặc hết sạch deck. */
function renderDone(store, { finished, untriaged }) {
  const doneCount = doneThisRound.size;

  if (untriaged === 0) {
    return el('div', {}, [
      el('h1', { text: 'Phân loại xong' }),
      el('p', { class: 'empty', text: 'Mọi từ trong deck đã được phân loại.' }),
      el('button', { class: 'secondary', onClick: () => goTo('/') }, [el('span', { text: 'Về màn chính' })]),
    ]);
  }

  return el('div', {}, [
    el('h1', { text: finished ? 'Xong lượt này' : 'Hết từ rồi' }),
    el('p', { class: 'empty', text: `Đã phân loại ${doneCount} từ. Còn ${untriaged} từ chưa phân loại.` }),
    el('button', { class: 'primary', onClick: () => { resetTriage(); store.refresh(); } }, [
      el('span', { text: `Làm tiếp ${Math.min(ROUND_SIZE, untriaged)} từ nữa` }),
    ]),
    el('button', { class: 'secondary', onClick: () => goTo('/') }, [el('span', { text: 'Về màn chính' })]),
  ]);
}

/**
 * Phím tắt cho màn phân loại.
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handleTriageKey(store, event) {
  if (event.key !== '1' && event.key !== '2') return;
  const entry = roundQueue(store)[0];
  if (!entry) return;
  doneThisRound.add(entry.id);
  store.record('vocab.triaged', { wordId: entry.id, known: event.key === '2' });
}

/** Đặt lại khi rời màn hoặc khi bắt đầu lượt mới. */
export function resetTriage() {
  doneThisRound = new Set();
}
