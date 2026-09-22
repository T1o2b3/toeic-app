/**
 * Chi tiết từ vựng: hiển thị đầy đủ thông tin, cho phép đổi mức phân loại và đánh dấu.
 * Được thiết kế để dùng trong Side Panel hoặc Bottom Sheet.
 */
import { el } from './dom.js';
import { LEVEL_ORDER, LEVEL_INFO, payloadForLevel } from '../logic/vocab-levels.js';

/**
 * Vẽ chi tiết một từ.
 * @param {object} store
 * @param {object} entry
 * @param {object} state
 * @param {string|null} level
 * @returns {HTMLElement}
 */
export function renderWordDetail(store, entry, state, level) {
  return el('div', { class: 'word-detail-content' }, [
    el('div', { class: 'detail-header' }, [
      el('div', { class: 'detail-main' }, [
        el('h2', { text: entry.word }),
        el('div', { class: 'detail-meta' }, [
          entry.ipa ? el('span', { class: 'ipa', text: entry.ipa }) : '',
          el('span', { class: 'pos', text: (entry.pos ?? []).join(' · ') }),
        ]),
      ]),
      el('button', {
        class: state?.bookmarked ? 'star-btn active' : 'star-btn',
        text: state?.bookmarked ? '★' : '☆',
        onClick: () => store.record('vocab.bookmarked', { wordId: entry.id, bookmarked: !state?.bookmarked }),
      }),
    ]),
    el('div', { class: 'detail-meaning' }, [
      el('div', { class: 'section-label', text: 'Nghĩa tiếng Việt' }),
      el('div', { class: 'meaning-text', text: entry.vi }),
    ]),
    entry.examples?.length ? el('div', { class: 'detail-examples' }, [
      el('div', { class: 'section-label', text: 'Ví dụ' }),
      ...entry.examples.map((ex) => el('div', { class: 'example-item' }, [
        el('div', { class: 'ex-en', text: ex.en }),
        el('div', { class: 'ex-vi', text: ex.vi }),
      ])),
    ]) : '',
    entry.collocations?.length ? el('div', { class: 'detail-collocations' }, [
      el('div', { class: 'section-label', text: 'Collocations' }),
      el('div', { class: 'chips', entry.collocations.map((c) => el('span', { class: 'chip', text: c })) }),
    ]) : '',
    entry.note ? el('div', { class: 'detail-note' }, [
      el('div', { class: 'section-label', text: 'Ghi chú' }),
      el('div', { class: 'note-text', text: entry.note }),
    ]) : '',
    el('div', { class: 'detail-footer' }, [
      el('div', { class: 'section-label', text: 'Mức độ thành thạo' }),
      el('div', { class: 'level-grid' }, LEVEL_ORDER.map((option) => el('button', {
        class: `lvl-btn ${LEVEL_INFO[option].css}${option === level ? ' active' : ''}`,
        onClick: () => setLevel(store, entry, level, option),
      }, [
        el('span', { class: 'lvl-label', text: LEVEL_INFO[option].label }),
        el('span', { class: 'lvl-hint', text: LEVEL_INFO[option].hint }),
      ]))),
    ]),
  ]);
}

async function setLevel(store, entry, current, next) {
  if (current === next) return;
  await store.record('vocab.triaged', payloadForLevel(entry.id, next));
}

/**
 * Mặt trước: từ, phiên âm, từ loại.
 */
export function renderWordHead(entry) {
  return [
    el('div', { class: 'word', text: entry.word }),
    entry.ipa ? el('div', { class: 'ipa', text: entry.ipa }) : '',
    el('div', { class: 'pos', text: (entry.pos ?? []).join(' · ') }),
  ];
}

/**
 * Mặt sau: nghĩa, ví dụ, collocation, bẫy.
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
    parts.push(el('div', { class: 'chips', entry.collocations.map((c) => el('span', { class: 'chip', text: c })) }));
  }
  if (entry.note) parts.push(el('div', { class: 'note', text: entry.note }));
  return el('div', { class: 'card back' }, parts);
}
