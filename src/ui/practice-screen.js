/**
 * Ôn chủ động: tự chọn nhóm từ để kiểm tra trí nhớ, ngoài lịch FSRS (D32).
 *
 * Luồng: chọn nhóm → mỗi lượt vài từ, CHỌN nghĩa đúng trong 4 lựa chọn (D66) → xem giải thích → tổng kết. Không đụng lịch ôn; chỉ riêng từ đã chấm "thành thạo" mà quên thì bị hạ mức
 * (xem src/logic/practice.js để biết vì sao).
 */
import { el } from './dom.js';
import { backButton, backLink, sessionDone, letterFromKey } from './blocks.js';
import {
  POOLS, POOL_ORDER, POOL_INFO, PRACTICE_SIZE, countPools, pickRound, eventForResult,
} from '../logic/practice.js';
import { renderChoiceCard } from './word-detail.js';
import { buildChoice } from '../logic/vocab-choice.js';
import { onceShuffled } from '../logic/shuffle.js';

// Danh sách từ của lượt được chốt một lần lúc bắt đầu và giữ nguyên tới hết lượt.
let pool = null;      // nhóm đang ôn; null = đang ở màn chọn nhóm
let roundIds = [];
let results = [];     // [{id, remembered, demoted}], độ dài = số từ đã làm
let picked = null;    // chữ cái vừa chọn; khác null = đang xem kết quả của từ vừa làm
let entries = [];     // cả bộ từ, để rút phương án nhiễu

/** Câu trắc nghiệm của từ đang hỏi, dựng MỘT lần (vẽ lại không đổi phương án). */
const shown = onceShuffled((entry) => ({ id: entry.id, ...buildChoice(entry, entries) }));

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderPractice(store) {
  if (pool === null || roundIds.length === 0) return renderPick(store);

  entries = store.entries;
  const byId = new Map(store.entries.map((entry) => [entry.id, entry]));
  const entry = currentEntry(store);
  return entry ? renderCard(store, entry) : renderSummary(store, byId);
}

/** Màn chọn nhóm: mỗi nhóm hiện số từ thật, nhóm rỗng thì mờ đi và không bấm được. */
function renderPick(store) {
  const counts = countPools(store.entries, store.states);

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      backLink('vocab'),
    ]),
    el('h1', { text: 'Ôn chủ động' }),
    el('p', { class: 'subtitle', text: `Tự chọn nhóm từ để kiểm tra trí nhớ, mỗi lượt ${PRACTICE_SIZE} từ. Không làm đổi lịch ôn.` }),
    ...POOL_ORDER.map((key) => {
      const count = counts[key];
      return el('button', {
        class: 'secondary',
        disabled: count === 0 ? 'disabled' : false,
        onClick: () => start(store, key),
      }, [
        el('span', { text: POOL_INFO[key].label }),
        el('small', { text: count === 0 ? 'chưa có từ nào' : `${count} từ · ${POOL_INFO[key].hint}` }),
      ]);
    }),
  ]);
}

/** Bắt đầu một lượt mới trong nhóm đã chọn. */
function start(store, chosen) {
  const ids = pickRound(chosen, store.entries, store.states);
  if (ids.length === 0) return;
  pool = chosen;
  roundIds = ids;
  results = [];
  picked = null;
  shown.reset();
  store.refresh();
}

/** Một thẻ: hiện từ → chọn nghĩa → xem giải thích. */
function renderCard(store, entry) {
  const fluentPool = pool === POOLS.FLUENT;
  const left = roundIds.length - results.length;
  const choice = shown.get(entry);
  const last = results.at(-1);
  const verdict = !picked ? '' : last.remembered ? 'Đúng — vẫn nhớ'
    : `Sai — đáp án: ${choice.options[choice.answer]}${last.demoted ? ' · đưa lại vào danh sách học' : ''}`;

  const children = [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Chọn nhóm khác', onClick: () => { resetPractice(); store.refresh(); } }),
      el('span', { class: 'progress', text: `còn ${left} từ · ${POOL_INFO[pool].label}` }),
    ]),
    ...renderChoiceCard(store, entry, choice, {
      picked, verdict, onPick: (letter) => answer(store, entry, choice, letter),
      hint: fluentPool ? 'Bạn chấm từ này là thành thạo — nghĩa là gì?' : undefined,
    }),
    picked ? el('div', { class: 'actions' }, [
      el('button', { class: 'primary', onClick: () => next(store) }, [el('span', { text: 'Từ tiếp' }), el('small', { text: 'phím Space' })]),
    ]) : '',
  ];
  return el('div', {}, children);
}

/** Màn tổng kết: nhớ bao nhiêu, những từ quên để nhìn lại, và những từ vừa bị hạ mức. */
function renderSummary(store, byId) {
  const remembered = results.filter((r) => r.remembered).length;
  const forgot = results.filter((r) => !r.remembered);
  const demoted = forgot.filter((r) => r.demoted).length;

  const extra = [];

  if (forgot.length > 0) {
    extra.push(el('div', { class: 'gaps' }, [
      el('div', { class: 'gaps-title', text: 'Những từ quên — nhìn lại một lần' }),
      ...forgot.map((r) => el('div', { class: 'forgot-row' }, [
        el('strong', { text: byId.get(r.id)?.word ?? r.id }),
        el('span', { class: 'weak-meaning', text: byId.get(r.id)?.vi ?? '' }),
      ])),
    ]));
  }
  // Nhóm có thể đã cạn sau lượt này (vd hạ hết các từ thành thạo) nên phải đếm lại.
  const more = countPools(store.entries, store.states)[pool] > 0;
  return sessionDone({
    title: 'Xong lượt này',
    headline: `Nhớ ${remembered} / ${results.length} từ`,
    note: forgot.length === 0 ? 'không quên từ nào' : `quên ${forgot.length} từ`,
    changed: demoted > 0
      ? `${demoted} từ đã chuyển từ “thành thạo” về “đoán được” và quay lại hàng đợi học.`
      : 'Lượt ôn chủ động không đụng tới lịch ôn — học lúc nào cũng được.',
    extra,
    actions: [
      more ? el('button', { class: 'primary', onClick: () => start(store, pool) }, [el('span', { text: 'Ôn tiếp nhóm này' })]) : '',
      el('button', { class: more ? 'secondary' : 'primary', onClick: () => { resetPractice(); store.refresh(); } }, [
        el('span', { text: 'Chọn nhóm khác' }),
      ]),
      backButton('vocab'),
    ],
  });
}

/** Từ đang hiện: từ vừa trả lời (đang xem kết quả), hoặc từ kế tiếp; null nếu lượt đã xong. */
function currentEntry(store) {
  if (pool === null) return null;
  const id = picked ? roundIds[results.length - 1] : roundIds[results.length];
  return id ? store.entries.find((entry) => entry.id === id) ?? null : null;
}

/** Chấm lựa chọn: đúng = vẫn nhớ. Chỉ quên một từ "thành thạo" mới ghi sự kiện (xem logic/practice.js). */
async function answer(store, entry, choice, letter) {
  if (picked || roundIds[results.length] !== entry.id) return;     // chặn bấm hai lần
  picked = letter;
  const remembered = letter === choice.answer;
  const change = eventForResult(entry.id, store.states.get(entry.id), remembered);
  results.push({ id: entry.id, remembered, demoted: change !== null });
  if (change) await store.record(change.type, change.payload);
  else store.refresh();
}

/** Sang từ kế tiếp (hoặc màn tổng kết). */
function next(store) {
  picked = null;
  shown.reset();
  store.refresh();
}

/**
 * Phím tắt: 1–4 hoặc A–D để chọn; chọn rồi thì Space/Enter sang từ kế.
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handlePracticeKey(store, event) {
  const entry = currentEntry(store);
  if (!entry) return;
  if (picked) {
    if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); next(store); }
    return;
  }
  const choice = shown.get(entry);
  const letter = letterFromKey(event, Object.keys(choice.options));
  if (letter) answer(store, entry, choice, letter);
}

/** Đặt lại khi rời màn hoặc khi chọn nhóm khác. */
export function resetPractice() {
  pool = null;
  roundIds = [];
  results = [];
  picked = null;
  shown.reset();
}
