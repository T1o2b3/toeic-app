/**
 * Hai mặt của thẻ từ, dùng chung cho màn ôn thẻ, phân loại, kho từ vựng và ôn chủ động
 * để mọi nơi hiện cùng một kiểu: mặt trước (từ + phiên âm + từ loại), mặt sau (nghĩa, ví dụ, collocation, bẫy).
 */
import { el } from './dom.js';

/**
 * Mặt trước: từ, phiên âm, từ loại.
 * @param {object} entry
 * @returns {Array<HTMLElement|string>} các dòng để ghép vào thẻ của từng màn
 */
export function renderWordHead(entry) {
  return [
    el('div', { class: 'word', text: entry.word }),
    entry.ipa ? el('div', { class: 'ipa', text: entry.ipa }) : '',
    el('div', { class: 'pos', text: (entry.pos ?? []).join(' · ') }),
  ];
}

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
