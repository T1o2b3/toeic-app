/**
 * Màn chính: cho biết hôm nay có gì để học, tốn bao lâu (RESEARCH.md R1, R2).
 */
import { el, goTo } from './dom.js';
import { triageQueue, reviewQueue, weakWords } from '../logic/vocab-state.js';
import { estimateSessionTime, summarizeQueue } from '../logic/format.js';

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderHome(store) {
  const states = store.states;
  const queue = reviewQueue(store.entries, states, {});
  const { total, fresh, due } = summarizeQueue(queue);
  const untriaged = triageQueue(store.entries, states).length;
  const weak = weakWords(states);
  const learning = [...states.values()].filter((s) => s.triaged && !s.known).length;

  const stat = (value, label) =>
    el('div', { class: 'stat' }, [
      el('div', { class: 'stat-value', text: String(value) }),
      el('div', { class: 'stat-label', text: label }),
    ]);

  const sections = [
    el('h1', { text: 'Hôm nay học gì' }),
    el('p', { class: 'subtitle', text: `Deck ${store.deck.deck} · ${store.entries.length} từ` }),
    el('div', { class: 'stats' }, [
      stat(due, 'đến hạn ôn'),
      stat(fresh, 'từ mới'),
      stat(learning, 'đang học'),
    ]),
  ];

  if (total > 0) {
    sections.push(
      el('button', { class: 'primary', onClick: () => goTo('/review') }, [
        el('span', { text: 'Ôn tập ngay' }),
        el('small', { text: `${total} thẻ · ${estimateSessionTime(due, fresh)}` }),
      ]),
    );
  } else if (untriaged > 0) {
    sections.push(el('p', { class: 'empty', text: 'Chưa có thẻ nào đến hạn. Phân loại thêm từ để bắt đầu học.' }));
  } else {
    sections.push(el('p', { class: 'empty', text: 'Xong hết rồi. Quay lại sau nhé.' }));
  }

  if (untriaged > 0) {
    const batch = Math.min(untriaged, 20);
    sections.push(
      el('button', { class: 'secondary', onClick: () => goTo('/triage') }, [
        el('span', { text: 'Phân loại từ đã biết / chưa biết' }),
        el('small', { text: `còn ${untriaged} từ · làm ${batch} từ · ~${Math.max(1, Math.round(batch * 4 / 60))} phút` }),
      ]),
    );
  }

  if (weak.length > 0) {
    sections.push(
      el('button', { class: 'secondary', onClick: () => goTo('/weak') }, [
        el('span', { text: 'Từ hay sai' }),
        el('small', { text: `${weak.length} từ cần để mắt` }),
      ]),
    );
  }

  sections.push(
    el('p', { class: 'footnote', text: `${store.eventCount} sự kiện đã ghi trên máy này` }),
  );

  return el('div', {}, sections);
}
