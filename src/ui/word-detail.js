/**
 * Mặt sau của thẻ từ: nghĩa, ví dụ, collocation, bẫy hay gặp.
 * Dùng chung cho màn ôn thẻ, kho từ vựng và ôn chủ động để cả ba hiện cùng một kiểu.
 */
import { el } from './dom.js';

/**
 * @param {object} entry
 * @returns {HTMLElement}
 */
export function renderWordBack(entry) {
  const parts = [el('div', { class: 'meaning', text: entry.vi })];

  for (const example of entry.examples ?? []) {
    parts.push(el('div', { class: 'example' }, [
      el('div', { class: 'en', text: example.en }),
      el('div', { class: 'vi', text: example.vi }),
    ]));
  }
  if (entry.collocations?.length) {
    parts.push(el('div', { class: 'chips' }, entry.collocations.map((c) => el('span', { class: 'chip', text: c }))));
  }
  if (entry.note) parts.push(el('div', { class: 'note', text: entry.note }));

  return el('div', { class: 'card back' }, parts);
}
