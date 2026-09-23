/**
 * Màn phân loại: lướt từng từ, tự chấm "biết tới đâu" theo 4 mức (vocab-levels.js).
 * Mục đích là biết từ nào thật sự phải học, để hàng đợi ôn không phình (D03).
 *
 * Có hiện sẵn nghĩa: tự chấm 4 mức mà không thấy nghĩa thì rất dễ nhầm
 * "quen mặt chữ" thành "biết nghĩa". Tắt được nếu muốn lướt nhanh.
 *
 * Bốn nút là thang chấm bắt buộc, nên màn này có hai lối thoát (D32): "Để sau" cho từ chưa
 * quyết được, và "Từ trước" để chấm lại từ vừa lỡ tay. Muốn xem lại cả kho thì có màn riêng
 * (words-screen.js).
 */
import { el, goTo } from './dom.js';
import { renderWordHead } from './word-detail.js';
import { backButton, backLink, sessionDone } from './blocks.js';
import { triageQueue, countUntriaged } from '../logic/vocab-state.js';
import { roundProgress } from '../logic/round.js';
import { LEVEL_ORDER, LEVEL_INFO, payloadForLevel } from '../logic/vocab-levels.js';
import { stepBack, stepForward, canStepBack } from '../logic/triage-history.js';
import { getShowMeaning, setShowMeaning, getTier } from '../data/prefs.js';
import { TIER_ORDER, TIER_INFO, ALL_TIERS, filterByTier } from '../logic/deck-tiers.js';

/** Số từ mỗi lượt phân loại — đủ ngắn để làm xong trong một lần ngồi. */
const ROUND_SIZE = 20;

/** Lớp CSS của 4 nút, đi từ "chưa biết" (đỏ) tới "thành thạo" (xanh) như nút chấm khi ôn. */

/** Từ đã phân loại trong lượt này. Nguồn duy nhất để đếm ngược (xem src/logic/round.js). */
let doneThisRound = new Set();

/** Từ bấm "Để sau" — không tính là đã làm, chỉ tạm ẩn tới hết lần ghé màn này. */
let skipped = new Set();

/** Các từ đã chấm trong lượt theo thứ tự chấm, để "Từ trước" đi lùi được. */
let history = [];

/** null = đang ở từ mới nhất; số = đang xem lại từ thứ n trong `history` (xem triage-history.js). */
let revisitIndex = null;

/** Đang ghi một câu trả lời. Chặn bấm phím hai lần thật nhanh chấm nhầm sang từ kế tiếp. */
let busy = false;

/**
 * Hàng đợi của lượt hiện tại: chỉ lấy đúng số từ CÒN LẠI của lượt,
 * nhờ vậy lượt kết thúc sau đủ ROUND_SIZE từ thay vì kéo dài mãi.
 */
function roundQueue(store) {
  const left = Math.max(0, ROUND_SIZE - doneThisRound.size);
  if (left === 0) return [];
  const pool = tieredEntries(store).filter((entry) => !skipped.has(entry.id));
  return triageQueue(pool, store.states, left);
}

/**
 * Màn phân loại chạy hai chế độ: từ vựng (mặc định) và **cụm từ** (`#/triage?kind=colloc`).
 * Tách hẳn khi học MỚI vì hai kiểu ghi nhớ khác nhau — nhìn `apply` rồi đoán nghĩa là một việc,
 * nhớ `apply FOR chứ không phải apply TO` là việc khác. Ôn lại thì trộn chung (xem review-screen.js).
 */
let kind = 'vocab';

function tieredEntries(store) {
  if (kind === 'colloc') return store.collocationCards ?? [];
  return filterByTier(store.entries, getTier(TIER_ORDER));
}

/** Nhãn hiện trên màn, theo chế độ đang chạy. */
const kindLabel = () => (kind === 'colloc' ? 'cụm từ' : 'từ');

/** Từ đang hiện trên màn: từ đang xem lại nếu đi lùi, không thì đầu hàng đợi. */
function currentEntry(store) {
  if (revisitIndex !== null) {
    const id = history[revisitIndex];
    const found = tieredEntries(store).find((entry) => entry.id === id);
    if (found) return found;
    revisitIndex = null; // lịch sử trỏ vào từ không còn trong deck: quay về từ mới nhất
  }
  return roundQueue(store)[0] ?? null;
}

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderTriage(store, params) {
  const want = params?.get('kind') === 'colloc' ? 'colloc' : 'vocab';
  if (want !== kind) { kind = want; resetTriage(); }
  const entries = tieredEntries(store);
  const untriaged = countUntriaged(entries, store.states);
  const queue = roundQueue(store);
  const { remaining, finished } = roundProgress({
    roundSize: ROUND_SIZE,
    doneCount: doneThisRound.size,
    availableCount: queue.length,
  });

  const entry = currentEntry(store);
  const reviewing = revisitIndex !== null;
  if (!entry || (remaining === 0 && !reviewing)) return renderDone(store, { finished, untriaged });

  const showMeaning = getShowMeaning();
  const previous = reviewing ? store.states.get(entry.id)?.level : null;

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      backLink('vocab'),
      el('span', { class: 'progress', text: reviewing
        ? `xem lại từ đã chấm (${revisitIndex + 1}/${history.length})`
        : `còn ${remaining} ${kindLabel()} trong lượt · ${untriaged} ${kindLabel()} ${tierNote()}` }),
    ]),
    el('div', { class: 'card big' }, [
      ...renderWordHead(entry),
      el('div', { class: 'hint', text: reviewing
        ? `Trước đó bạn chấm: ${LEVEL_INFO[previous]?.label ?? '—'}. Chấm lại nếu cần.`
        : `Bạn dùng được ${kind === 'colloc' ? 'CỤM' : 'từ'} này tới mức nào?` }),
    ]),
    showMeaning ? renderMeaning(entry) : '',
    el('div', { class: 'actions four' }, LEVEL_ORDER.map((level) => {
      const info = LEVEL_INFO[level];
      return el('button', {
        class: `grade ${LEVEL_INFO[level].css}${level === previous ? ' chosen' : ''}`,
        onClick: () => answer(store, entry, level),
      }, [
        el('span', { text: info.label }),
        el('small', { text: info.hint }),
        el('kbd', { text: info.key }),
      ]);
    })),
    el('div', { class: 'tools' }, [
      canStepBack(history.length, revisitIndex)
        ? el('button', { class: 'link', text: '← Từ trước', onClick: () => goBack(store) })
        : '',
      reviewing
        ? ''
        : el('button', { class: 'link', text: 'Để sau →', onClick: () => skip(store, entry) }),
      el('button', {
        class: showMeaning ? 'link active' : 'link',
        text: showMeaning ? '👁 Đang hiện nghĩa' : '👁 Hiện nghĩa',
        onClick: () => { setShowMeaning(!showMeaning); store.refresh(); },
      }),
    ]),
    el('p', { class: 'footnote', text: 'Phím tắt: 1–4 chọn mức · Backspace từ trước · S để sau · Space bật/tắt nghĩa' }),
  ]);
}

/** Ghi rõ đang phân loại trong tầng nào, để không tưởng deck chỉ còn bấy nhiêu từ. */
function tierNote() {
  if (kind === 'colloc') return 'chưa học';       // cụm từ không chia tầng
  const tier = getTier(TIER_ORDER);
  return tier === ALL_TIERS ? 'chưa phân loại' : `chưa phân loại ở tầng ${TIER_INFO[tier].label.toLowerCase()}`;
}

/** Nghĩa tiếng Việt + một ví dụ, đủ để tự chấm đúng mà không rối mắt. */
function renderMeaning(entry) {
  const example = entry.examples?.[0];
  return el('div', { class: 'card back' }, [
    el('div', { class: 'meaning', text: entry.vi }),
    // Với cụm từ, `note` là DẠNG SAI hay mắc ("✗ không dùng: do a decision"). Đó mới là thứ cần nhớ —
    // nghĩa của `make a decision` thì đoán được, chọn nhầm động từ mới là chỗ mất điểm.
    entry.note ? el('div', { class: 'colloc-wrong', text: entry.note }) : '',
    example
      ? el('div', { class: 'example' }, [
          el('div', { class: 'en', text: example.en }),
          el('div', { class: 'vi', text: example.vi }),
        ])
      : '',
  ]);
}

/**
 * Ghi mức vừa chấm. Sự kiện mang cả `level` mới lẫn `known` cũ (xem vocab-levels.js).
 * Chấm lại một từ cũ chỉ là ghi thêm một sự kiện nữa: sự kiện sau thắng, nhật ký không bị sửa.
 */
async function answer(store, entry, level) {
  // Bấm phím hai lần thật nhanh: lần sau vẫn thấy từ cũ vì màn chưa kịp vẽ lại.
  // Không chặn thì ghi hai sự kiện cho cùng một từ, và nhìn ra ngoài đúng như bộ đếm bị kẹt.
  if (busy) return;
  busy = true;
  try {
    if (revisitIndex !== null) {
      revisitIndex = stepForward(history.length, revisitIndex);
    } else {
      if (doneThisRound.has(entry.id)) return;
      doneThisRound.add(entry.id);
      history.push(entry.id);
    }
    await store.record('vocab.triaged', payloadForLevel(entry.id, level));
  } finally {
    busy = false;
  }
}

/** Tạm ẩn từ này tới lần sau. Không ghi gì vào nhật ký, không tính vào lượt. */
function skip(store, entry) {
  if (revisitIndex !== null) return;
  skipped.add(entry.id);
  store.refresh();
}

/** Lùi về từ đã chấm trước đó để chấm lại. */
function goBack(store) {
  revisitIndex = stepBack(history.length, revisitIndex);
  store.refresh();
}

/** Màn kết thúc: hết lượt (còn từ để làm tiếp) hoặc hết sạch deck. */
function renderDone(store, { finished, untriaged }) {
  const doneCount = doneThisRound.size;
  const fixLast = history.length > 0
    ? el('button', { class: 'link', text: '← Sửa lại từ vừa chấm', onClick: () => {
        revisitIndex = history.length - 1;
        store.refresh();
      } })
    : '';
  const library = el('button', { class: 'secondary', onClick: () => goTo('/words') }, [
    el('span', { text: 'Kho từ vựng' }),
    el('small', { text: 'xem lại các từ đã chấm, đổi mức' }),
  ]);

  if (untriaged === 0) {
    return sessionDone({
      title: 'Phân loại xong',
      headline: `${doneCount} ${kindLabel()} đã chấm`,
      changed: 'Mọi từ trong deck đã được phân loại. Từ nào chưa thành thạo đã vào hàng đợi học.',
      actions: [library, backButton('vocab'), fixLast],
    });
  }

  const later = skipped.size > 0 ? ` · ${skipped.size} từ để sau` : '';
  return sessionDone({
    title: finished ? 'Xong lượt này' : 'Hết từ rồi',
    headline: `${doneCount} ${kindLabel()} đã chấm`,
    note: `còn ${untriaged} ${kindLabel()} chưa phân loại${later}`,
    changed: 'Từ nào chưa thành thạo đã vào hàng đợi học — mở Ôn tập từ vựng là học được ngay.',
    actions: [
      el('button', { class: 'primary', onClick: () => { resetTriage(); store.refresh(); } }, [
        el('span', { text: `Làm tiếp ${Math.min(ROUND_SIZE, untriaged)} từ nữa` }),
        el('small', { text: `~${Math.ceil(Math.min(ROUND_SIZE, untriaged) / 20)} phút` }),
      ]),
      library,
      backButton('vocab'),
      fixLast,
    ],
  });
}

/**
 * Phím tắt: 1–4 chọn mức, Backspace lùi, S để sau, Space bật/tắt hiện nghĩa.
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
  if (event.key === 'Backspace') {
    event.preventDefault();
    if (canStepBack(history.length, revisitIndex)) goBack(store);
    return;
  }

  const entry = currentEntry(store);
  if (!entry) return;
  if (event.key === 's' || event.key === 'S') {
    skip(store, entry);
    return;
  }

  const level = LEVEL_ORDER.find((name) => LEVEL_INFO[name].key === event.key);
  if (level) answer(store, entry, level);
}

/** Đặt lại khi rời màn hoặc khi bắt đầu lượt mới. */
export function resetTriage() {
  doneThisRound = new Set();
  skipped = new Set();
  history = [];
  revisitIndex = null;
}
