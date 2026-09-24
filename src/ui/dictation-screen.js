/**
 * Màn nghe chép (M11): nghe một đoạn thuộc câu nghe từng làm sai, gõ lại, rồi xem từng từ đúng/sai.
 *
 * Ô gõ phải SỐNG QUA các lần vẽ lại (đổi tốc độ, đồng bộ kéo sự kiện về giữa chừng): chữ đang gõ giữ ở `draft`,
 * gõ không làm vẽ lại, lúc phát chỉ đổi chữ trên nút; màn có vẽ lại thì ô mới nhận lại chữ và con trỏ.
 */
import { el, scrollToTop } from './dom.js';
import { roundProgress } from '../logic/round.js';
import {
  DICTATION_ROUND_SIZE, dictationUnits, reduceDictation, dictationQueue, countPending, scoreDictation,
} from '../logic/dictation.js';
import { getListenSpeed } from '../data/prefs.js';
import { createPlayerSlot } from './audio-player.js';
import { backButton, backLink, sessionDone, speedChooser, nextActions } from './blocks.js';
import { renderStem, renderTray, resetCapture } from './capture-tray.js';

// Trạng thái riêng của màn này.
let doneThisRound = new Set();
let perfectThisRound = 0;
let locked = null;        // đoạn đang xem kết quả
let result = null;        // scoreDictation của đoạn đó
let draft = '';
let playing = false;
let heardId = null;       // đoạn đã nghe hết ít nhất một lần (để nút ghi "Nghe lại")
let playError = null;
let focusBox = false;     // lần vẽ tới đưa con trỏ vào ô gõ (sau khi bấm Nghe / sang đoạn mới)
let box = null;           // ô gõ đang hiện
let playLabel = null;     // chữ trên nút Nghe — đổi trực tiếp, không vẽ lại cả màn

const slot = createPlayerSlot();

/** Tiêm bộ phát giả khi test (jsdom không phát được âm thanh). */
export const setDictationPlayerFactory = (factory) => slot.setFactory(factory);

/** Mọi thứ màn này cần tính từ store, dùng chung cho vẽ màn, phím tắt và "Đoạn tiếp". */
function current(store) {
  const all = dictationUnits({ listening: store.listening, sets: store.sets, quizStates: store.quizStates });
  const states = reduceDictation(store.events);
  const left = Math.max(0, DICTATION_ROUND_SIZE - doneThisRound.size);
  const queue = left === 0 ? [] : dictationQueue(all, states, { size: left, exclude: doneThisRound });
  return { all, states, queue, unit: locked ?? queue[0] ?? null };
}

const labelText = (unit) => (playing ? '🔊 Đang phát…' : heardId === unit.id ? '▶ Nghe lại' : '▶ Nghe đoạn này');

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderDictation(store) {
  const hadFocus = box !== null && document.activeElement === box;
  box = null;
  const { all, states, queue, unit } = current(store);

  if (!unit) return renderFinished(store, all, states);

  const upcoming = queue.find((u) => u.id !== unit.id);
  slot.get().preload([unit, upcoming].filter(Boolean).map((u) => u.src)).catch(() => {});

  const { remaining } = roundProgress({
    roundSize: DICTATION_ROUND_SIZE, doneCount: doneThisRound.size, availableCount: queue.length, locked: Boolean(locked),
  });
  playLabel = el('span', { text: labelText(unit) });

  const children = [
    el('div', { class: 'topbar' }, [
      backLink('exams'),
      el('span', { class: 'progress', text: `còn ${remaining} đoạn · ${unit.label}` }),
    ]),
    el('h1', { text: 'Nghe chép' }),
    el('div', { class: 'card big' }, [
      el('button', { class: 'primary listen-play', onClick: () => { play(store, unit); box?.focus(); } }, [
        playLabel,
        el('small', { text: result ? 'phím Space' : 'phím Esc khi đang gõ' }),
      ]),
      speedChooser(store),
      playError ? el('div', { class: 'warn', text: playError }) : '',
    ]),
  ];

  if (!result) {
    box = el('textarea', {
      class: 'field dict-box', rows: '3', placeholder: 'Gõ lại những gì bạn nghe được…', 'aria-label': 'Bài chép',
      // Tắt tự sửa chính tả: iPhone sửa hộ thì không còn biết mình nghe ra chữ gì.
      autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false',
    });
    box.value = draft;
    box.addEventListener('input', () => { draft = box.value; });
    box.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); check(store, unit); }
      else if (event.key === 'Escape') { event.preventDefault(); play(store, unit); }
    });
    const target = box;
    if (hadFocus || focusBox) queueMicrotask(() => target.focus());
    focusBox = false;
    children.push(
      box,
      el('button', { class: 'primary', onClick: () => check(store, unit) }, [
        el('span', { text: 'Kiểm tra' }),
        el('small', { text: 'phím Enter' }),
      ]),
      el('p', { class: 'footnote', text: 'Nghe lại bao nhiêu lần cũng được. Không cần viết hoa hay dấu câu.' }),
    );
    return el('div', {}, children);
  }

  children.push(
    el('div', { class: 'card back' }, [
      el('div', {
        class: `verdict ${result.perfect ? 'ok' : 'no'}`,
        text: result.perfect ? 'Chính xác — đoạn này không quay lại nữa.' : `Đúng ${result.correct}/${result.total} từ — đoạn này sẽ quay lại ở lượt sau.`,
      }),
      // <del> = chữ bạn gõ sai/thừa, <ins> = chữ đúng bạn bỏ lỡ: có gạch/gạch chân, không chỉ dựa vào màu.
      el('p', { class: 'dict-diff' }, result.parts.map((part) => [
        el(part.kind === 'extra' ? 'del' : part.kind === 'missing' ? 'ins' : 'span', { text: part.text }), ' ',
      ])),
      el('div', { class: 'footnote left', text: 'gạch ngang = bạn gõ sai/thừa · gạch dưới = chữ đúng bạn bỏ lỡ' }),
      el('div', { class: 'gaps-title', text: 'Chữ gốc — chạm từ lạ để thêm vào danh sách học' }),
      renderStem(store, { stem: unit.text }),
    ]),
    renderTray(store, { id: unit.from }),
    ...nextActions('Đoạn tiếp', () => next(store)),
  );
  return el('div', {}, children);
}

function renderFinished(store, all, states) {
  const left = countPending(all, states);
  if (doneThisRound.size === 0) {
    return el('div', {}, [
      el('h1', { text: 'Nghe chép' }),
      el('p', { class: 'empty', text: all.length === 0
        ? 'Chưa có đoạn nào để chép. Đoạn chép lấy từ các câu nghe (Part 2, 3) bạn từng làm sai — luyện nghe trước, câu nào sai sẽ vào đây.'
        : 'Đã chép đúng hết mọi đoạn. Câu nghe nào làm sai tiếp sẽ vào đây.' }),
      backButton('exams', { primary: true }),
    ]);
  }
  return sessionDone({
    title: 'Xong lượt nghe chép',
    headline: `${perfectThisRound} / ${doneThisRound.size} đoạn chép đúng hết`,
    note: 'Đoạn chưa đúng hết sẽ quay lại ở lượt sau.',
    changed: left > 0 ? `Còn ${left} đoạn cần chép.` : 'Đã chép đúng hết mọi đoạn hiện có.',
    actions: [
      left > 0 ? el('button', { class: 'primary', onClick: () => { doneThisRound = new Set(); perfectThisRound = 0; store.refresh(); } }, [
        el('span', { text: 'Lượt tiếp' }),
      ]) : '',
      backButton('exams', { primary: left === 0 }),
    ],
  });
}

/** Phát đoạn. Gọi từ thao tác chạm/phím nên audio.play() được phép (xem audio-player.js). */
async function play(store, unit) {
  playError = null;
  playing = true;
  if (playLabel) playLabel.textContent = labelText(unit);
  try {
    const outcome = await slot.get().play([{ type: 'clip', key: unit.id, src: unit.src }], { rate: getListenSpeed() });
    if (outcome === 'done') heardId = unit.id;
  } catch (error) {
    playError = `${error.message}. Thử bấm Nghe lại, hoặc tải lại trang.`;
    store.refresh();
  } finally {
    playing = false;
    if (playLabel) playLabel.textContent = labelText(unit);
  }
}

/** Chấm và ghi kết quả. Bỏ trống cũng được — coi như "chịu", xem chữ gốc. */
async function check(store, unit) {
  if (locked) return;
  slot.get().stop();
  playing = false;
  result = scoreDictation(unit.text, draft);
  locked = unit;
  doneThisRound.add(unit.id);
  if (result.perfect) perfectThisRound += 1;
  await store.record('dictation.checked', { unitId: unit.id, correct: result.correct, total: result.total, perfect: result.perfect });
}

/** Sang đoạn kế và phát luôn (vẫn trong thao tác chạm nên được phép phát). */
function next(store) {
  slot.get().stop();
  locked = null;
  result = null;
  draft = '';
  playError = null;
  focusBox = true;
  resetCapture();
  store.refresh();
  scrollToTop();
  const { unit } = current(store);
  if (unit) play(store, unit);
}

/** Phím tắt ngoài ô gõ (trong ô gõ thì Enter/Esc do chính ô xử lý). */
export function handleDictationKey(store, event) {
  if (event.target?.tagName === 'TEXTAREA') return;
  const { unit } = current(store);
  if (!unit || (event.key !== ' ' && event.key !== 'Enter')) return;
  event.preventDefault();
  if (result) next(store);
  else play(store, unit);
}

/** Đặt lại khi rời màn. */
export function resetDictation() {
  slot.dispose();
  doneThisRound = new Set();
  perfectThisRound = 0;
  locked = null;
  result = null;
  draft = '';
  playing = false;
  heardId = null;
  playError = null;
  focusBox = false;
  box = null;
  playLabel = null;
  resetCapture();
}
