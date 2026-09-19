/**
 * Màn phân loại: lướt từng từ, tự chấm "biết tới đâu" theo 4 mức (vocab-levels.js).
 * Mục đích là biết từ nào thật sự phải học, để hàng đợi ôn không phình (D03).
 *
 * Có hiện sẵn nghĩa: tự chấm 4 mức mà không thấy nghĩa thì rất dễ nhầm
 * "quen mặt chữ" thành "biết nghĩa". Tắt được nếu muốn lướt nhanh.
 */
import { el, goTo } from './dom.js';
import { triageQueue, countUntriaged } from '../logic/vocab-state.js';
import { roundProgress } from '../logic/round.js';
import { LEVEL_ORDER, LEVEL_INFO, payloadForLevel } from '../logic/vocab-levels.js';
import { getShowMeaning, setShowMeaning, getTier } from '../data/prefs.js';
import { TIER_ORDER, TIER_INFO, ALL_TIERS, filterByTier } from '../logic/deck-tiers.js';

/** Số từ mỗi lượt phân loại — đủ ngắn để làm xong trong một lần ngồi. */
const ROUND_SIZE = 20;

/** Lớp CSS của 4 nút, đi từ "chưa biết" (đỏ) tới "thành thạo" (xanh) như nút chấm khi ôn. */
const LEVEL_CLASS = { unknown: 'again', context: 'hard', spelling: 'good', fluent: 'easy' };

/** Từ đã phân loại trong lượt này. Nguồn duy nhất để đếm ngược (xem src/logic/round.js). */
let doneThisRound = new Set();

/**
 * Hàng đợi của lượt hiện tại: chỉ lấy đúng số từ CÒN LẠI của lượt,
 * nhờ vậy lượt kết thúc sau đủ ROUND_SIZE từ thay vì kéo dài mãi.
 */
function roundQueue(store) {
  const left = Math.max(0, ROUND_SIZE - doneThisRound.size);
  if (left === 0) return [];
  return triageQueue(tieredEntries(store), store.states, left);
}

/** Deck đã lọc theo tầng Huy chọn ở màn chính. */
function tieredEntries(store) {
  return filterByTier(store.entries, getTier(TIER_ORDER));
}

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderTriage(store) {
  const entries = tieredEntries(store);
  const untriaged = countUntriaged(entries, store.states);
  const queue = roundQueue(store);
  const { remaining, finished } = roundProgress({
    roundSize: ROUND_SIZE,
    doneCount: doneThisRound.size,
    availableCount: queue.length,
  });

  if (remaining === 0) return renderDone(store, { finished, untriaged });

  const entry = queue[0];
  const showMeaning = getShowMeaning();

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Về màn chính', onClick: () => goTo('/') }),
      el('span', { class: 'progress', text: `còn ${remaining} từ trong lượt · ${untriaged} từ ${tierNote()}` }),
    ]),
    el('div', { class: 'card big' }, [
      el('div', { class: 'word', text: entry.word }),
      entry.ipa ? el('div', { class: 'ipa', text: entry.ipa }) : '',
      el('div', { class: 'pos', text: (entry.pos ?? []).join(' · ') }),
      el('div', { class: 'hint', text: 'Bạn dùng được từ này tới mức nào?' }),
    ]),
    showMeaning ? renderMeaning(entry) : '',
    el('div', { class: 'actions four' }, LEVEL_ORDER.map((level) => {
      const info = LEVEL_INFO[level];
      return el('button', {
        class: `grade ${LEVEL_CLASS[level]}`,
        onClick: () => answer(store, entry, level),
      }, [
        el('span', { text: info.label }),
        el('small', { text: info.hint }),
        el('kbd', { text: info.key }),
      ]);
    })),
    el('div', { class: 'actions' }, [
      el('button', {
        class: showMeaning ? 'link active' : 'link',
        text: showMeaning ? '👁 Đang hiện nghĩa — ẩn đi' : '👁 Hiện nghĩa khi phân loại',
        onClick: () => { setShowMeaning(!showMeaning); store.refresh(); },
      }),
    ]),
    el('p', { class: 'footnote', text: 'Phím tắt: 1–4 chọn mức · Space bật/tắt hiện nghĩa' }),
  ]);
}

/** Ghi rõ đang phân loại trong tầng nào, để không tưởng deck chỉ còn bấy nhiêu từ. */
function tierNote() {
  const tier = getTier(TIER_ORDER);
  return tier === ALL_TIERS ? 'chưa phân loại' : `chưa phân loại ở tầng ${TIER_INFO[tier].label.toLowerCase()}`;
}

/** Nghĩa tiếng Việt + một ví dụ, đủ để tự chấm đúng mà không rối mắt. */
function renderMeaning(entry) {
  const example = entry.examples?.[0];
  return el('div', { class: 'card back' }, [
    el('div', { class: 'meaning', text: entry.vi }),
    example
      ? el('div', { class: 'example' }, [
          el('div', { class: 'en', text: example.en }),
          el('div', { class: 'vi', text: example.vi }),
        ])
      : '',
  ]);
}

/** Ghi mức vừa chấm. Sự kiện mang cả `level` mới lẫn `known` cũ (xem vocab-levels.js). */
async function answer(store, entry, level) {
  // Bấm phím hai lần thật nhanh: lần sau vẫn thấy từ cũ vì màn chưa kịp vẽ lại.
  // Không chặn thì ghi hai sự kiện cho cùng một từ, và nhìn ra ngoài đúng như bộ đếm bị kẹt.
  if (doneThisRound.has(entry.id)) return;
  doneThisRound.add(entry.id);
  await store.record('vocab.triaged', payloadForLevel(entry.id, level));
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
 * Phím tắt: 1–4 chọn mức, Space bật/tắt hiện nghĩa.
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handleTriageKey(store, event) {
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    setShowMeaning(!getShowMeaning());
    store.refresh();
    return;
  }

  const level = LEVEL_ORDER.find((name) => LEVEL_INFO[name].key === event.key);
  if (!level) return;
  const entry = roundQueue(store)[0];
  if (entry) answer(store, entry, level);
}

/** Đặt lại khi rời màn hoặc khi bắt đầu lượt mới. */
export function resetTriage() {
  doneThisRound = new Set();
}
