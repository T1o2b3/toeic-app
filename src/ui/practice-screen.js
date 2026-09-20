/**
 * Ôn chủ động: tự chọn nhóm từ để kiểm tra trí nhớ, ngoài lịch FSRS (D32).
 *
 * Luồng: chọn nhóm → mỗi lượt vài từ, nhìn từ và tự nhớ nghĩa → lật thẻ → "Vẫn nhớ" / "Quên rồi"
 * → tổng kết. Không đụng lịch ôn; chỉ riêng từ đã chấm "thành thạo" mà quên thì bị hạ mức
 * (xem src/logic/practice.js để biết vì sao).
 */
import { el, goTo } from './dom.js';
import {
  POOLS, POOL_ORDER, POOL_INFO, PRACTICE_SIZE, countPools, pickRound, eventForResult,
} from '../logic/practice.js';
import { renderWordBack } from './word-detail.js';

// Danh sách từ của lượt được chốt một lần lúc bắt đầu và giữ nguyên tới hết lượt.
let pool = null;      // nhóm đang ôn; null = đang ở màn chọn nhóm
let roundIds = [];
let results = [];     // [{id, remembered, demoted}], độ dài = số từ đã làm
let revealed = false;

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderPractice(store) {
  if (pool === null || roundIds.length === 0) return renderPick(store);

  const byId = new Map(store.entries.map((entry) => [entry.id, entry]));
  if (results.length >= roundIds.length) return renderSummary(store, byId);
  return renderCard(store, byId.get(roundIds[results.length]));
}

/** Màn chọn nhóm: mỗi nhóm hiện số từ thật, nhóm rỗng thì mờ đi và không bấm được. */
function renderPick(store) {
  const counts = countPools(store.entries, store.states);

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Từ vựng', onClick: () => goTo('/vocab') }),
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
  revealed = false;
  store.refresh();
}

/** Một thẻ: hiện từ → lật → chấm. */
function renderCard(store, entry) {
  const fluentPool = pool === POOLS.FLUENT;
  const left = roundIds.length - results.length;

  const children = [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Chọn nhóm khác', onClick: () => { resetPractice(); store.refresh(); } }),
      el('span', { class: 'progress', text: `còn ${left} từ · ${POOL_INFO[pool].label}` }),
    ]),
    el('div', { class: 'card big' }, [
      el('div', { class: 'word', text: entry.word }),
      entry.ipa ? el('div', { class: 'ipa', text: entry.ipa }) : '',
      el('div', { class: 'pos', text: (entry.pos ?? []).join(' · ') }),
      el('div', { class: 'hint', text: fluentPool
        ? 'Bạn chấm từ này là thành thạo — còn nhớ nghĩa không?'
        : 'Còn nhớ nghĩa của từ này không?' }),
    ]),
  ];

  if (!revealed) {
    children.push(el('div', { class: 'actions' }, [
      el('button', { class: 'primary', onClick: () => { revealed = true; store.refresh(); } }, [
        el('span', { text: 'Hiện nghĩa' }),
        el('small', { text: 'nhớ thử trước rồi mới lật — phím Space' }),
      ]),
    ]));
  } else {
    children.push(renderWordBack(entry), el('div', { class: 'actions two stick' }, [
      el('button', { class: 'grade good', onClick: () => answer(store, entry, true) }, [
        el('span', { text: 'Vẫn nhớ' }),
        el('kbd', { text: '1' }),
      ]),
      el('button', { class: 'grade again', onClick: () => answer(store, entry, false) }, [
        el('span', { text: 'Quên rồi' }),
        el('small', { text: fluentPool ? 'đưa lại vào danh sách học' : 'không đổi lịch ôn' }),
        el('kbd', { text: '2' }),
      ]),
    ]));
  }
  return el('div', {}, children);
}

/** Màn tổng kết: nhớ bao nhiêu, những từ quên để nhìn lại, và những từ vừa bị hạ mức. */
function renderSummary(store, byId) {
  const remembered = results.filter((r) => r.remembered).length;
  const forgot = results.filter((r) => !r.remembered);
  const demoted = forgot.filter((r) => r.demoted).length;

  const sections = [
    el('h1', { text: 'Xong lượt này' }),
    el('p', { class: 'empty', text: `Nhớ ${remembered}/${results.length} từ.` }),
  ];

  if (forgot.length > 0) {
    sections.push(el('div', { class: 'gaps' }, [
      el('div', { class: 'gaps-title', text: 'Những từ quên — nhìn lại một lần' }),
      ...forgot.map((r) => el('div', { class: 'forgot-row' }, [
        el('strong', { text: byId.get(r.id)?.word ?? r.id }),
        el('span', { class: 'weak-meaning', text: byId.get(r.id)?.vi ?? '' }),
      ])),
    ]));
  }
  if (demoted > 0) {
    sections.push(el('p', { class: 'empty', text: `${demoted} từ đã chuyển từ “thành thạo” về “đoán được” và sẽ vào hàng đợi học.` }));
  }

  // Nhóm có thể đã cạn sau lượt này (vd hạ hết các từ thành thạo) nên phải đếm lại.
  const more = countPools(store.entries, store.states)[pool] > 0;
  sections.push(
    more ? el('button', { class: 'primary', onClick: () => start(store, pool) }, [el('span', { text: 'Ôn tiếp nhóm này' })]) : '',
    el('button', { class: 'secondary', onClick: () => { resetPractice(); store.refresh(); } }, [
      el('span', { text: 'Chọn nhóm khác' }),
    ]),
    el('button', { class: 'secondary', onClick: () => goTo('/vocab') }, [el('span', { text: 'Về mục Từ vựng' })]),
  );
  return el('div', {}, sections);
}

/** Từ đang hỏi, hoặc null nếu lượt đã xong. */
function currentEntry(store) {
  if (pool === null || results.length >= roundIds.length) return null;
  return store.entries.find((entry) => entry.id === roundIds[results.length]) ?? null;
}

/** Ghi kết quả một từ rồi sang từ kế tiếp. */
async function answer(store, entry, remembered) {
  // Chặn bấm hai lần: chỉ nhận đúng từ đang hỏi.
  if (roundIds[results.length] !== entry.id) return;

  const change = eventForResult(entry.id, store.states.get(entry.id), remembered);
  results.push({ id: entry.id, remembered, demoted: change !== null });
  revealed = false;

  if (change) await store.record(change.type, change.payload);
  else store.refresh();
}

/**
 * Phím tắt: Space lật thẻ, 1 = vẫn nhớ, 2 = quên rồi.
 * Space KHÔNG chấm "nhớ" sau khi lật (khác màn ôn thẻ): tự kiểm tra mà gõ nhầm thành "nhớ"
 * thì kết quả mất ý nghĩa — đây là điều duy nhất màn này cần đúng.
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handlePracticeKey(store, event) {
  const entry = currentEntry(store);
  if (!entry) return;

  if (!revealed) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      revealed = true;
      store.refresh();
    }
    return;
  }
  if (event.key === '1') answer(store, entry, true);
  else if (event.key === '2') answer(store, entry, false);
}

/** Đặt lại khi rời màn hoặc khi chọn nhóm khác. */
export function resetPractice() {
  pool = null;
  roundIds = [];
  results = [];
  revealed = false;
}
