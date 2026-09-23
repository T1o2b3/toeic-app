/**
 * Chi tiết từ vựng: hiển thị đầy đủ thông tin, cho phép đổi mức phân loại và đánh dấu.
 * Được thiết kế để dùng trong Side Panel hoặc Bottom Sheet.
 */
import { el } from './dom.js';
import { LEVEL_ORDER, LEVEL_INFO, payloadForLevel } from '../logic/vocab-levels.js';
import { metSentences } from '../logic/capture.js';
import { optionList } from './blocks.js';

/** Số câu gốc tối đa hiện ra — mới nhất trước. */
const MET_SHOWN = 2;

/**
 * Câu gốc người học đã gạt từ này ra (M13): gặp lại đúng câu mình từng vấp giúp nhớ hơn ví dụ soạn sẵn.
 * @param {object} store
 * @param {object} entry
 * @returns {HTMLElement|string}
 */
function renderMet(store, entry) {
  const sentences = metSentences(store?.captured, store?.wordIndex, entry.id).slice(-MET_SHOWN).reverse();
  if (sentences.length === 0) return '';
  return el('div', { class: 'met' }, [
    el('div', { class: 'section-label', text: 'Câu bạn đã gặp' }),
    ...sentences.map((text) => el('div', { class: 'met-text', text })),
  ]);
}

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
    renderMet(store, entry),
    entry.collocations?.length ? el('div', { class: 'detail-collocations' }, [
      el('div', { class: 'section-label', text: 'Collocations' }),
      el('div', { class: 'chips' }, entry.collocations.map((c) => el('span', { class: 'chip', text: c }))),
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
 * Mặt sau: nghĩa, ví dụ, câu đã gặp, collocation, bẫy.
 * @param {object} entry
 * @param {object} [store] - có thì hiện thêm câu gốc đã gạt
 */
export function renderWordBack(entry, store) {
  const parts = [el('div', { class: 'meaning', text: entry.vi })];
  for (const example of entry.examples ?? []) {
    parts.push(el('div', { class: 'example' }, [
      el('div', { class: 'en', text: example.en }),
      el('div', { class: 'ex-vi', text: example.vi }),
    ]));
  }
  parts.push(renderMet(store, entry));
  if (entry.collocations?.length) {
    parts.push(el('div', { class: 'chips' }, entry.collocations.map((c) => el('span', { class: 'chip', text: c }))));
  }
  if (entry.note) parts.push(el('div', { class: 'note', text: entry.note }));
  return el('div', { class: 'card back' }, parts);
}

/**
 * Thẻ trắc nghiệm (D66), dùng chung cho Ôn tập và Ôn chủ động: mặt trước + các lựa chọn; chọn xong mới lộ
 * đúng/sai và phần giải thích (nghĩa đầy đủ, ví dụ, câu đã gặp…). Từ: chọn nghĩa. Cụm: chọn đúng cụm.
 * @param {object} store
 * @param {object} entry
 * @param {{kind: string, options: Record<string, string>, answer: string, example?: string|null}} choice - buildChoice
 * @param {{picked: string|null, onPick: (letter: string) => void, verdict?: string, hint?: string}} state
 * @returns {Array<HTMLElement|string>}
 */
export function renderChoiceCard(store, entry, choice, { picked, onPick, verdict = '', hint }) {
  const colloc = choice.kind === 'colloc';
  const front = el('div', { class: 'card big' }, colloc
    ? [
        el('div', { class: 'word', text: entry.vi }),
        choice.example ? el('div', { class: 'example' }, [el('div', { class: 'en', text: choice.example })]) : '',
        el('div', { class: 'hint', text: hint ?? 'Cụm nào dùng ĐÚNG?' }),
      ]
    : [...renderWordHead(entry), el('div', { class: 'hint', text: hint ?? 'Nghĩa của từ này là gì?' })]);

  const parts = [front, optionList({
    letters: Object.keys(choice.options), textOf: (l) => choice.options[l],
    picked, answer: picked ? choice.answer : null, locked: Boolean(picked), onPick,
  })];
  if (picked) {
    parts.push(
      el('div', { class: `verdict ${picked === choice.answer ? 'ok' : 'no'}`, text: verdict }),
      renderWordBack(entry, store),
    );
  }
  return parts;
}
