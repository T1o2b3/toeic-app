/**
 * Màn luyện các bộ "tài liệu + nhiều câu hỏi": Part 3 (hội thoại), 4 (bài nói), 6 (điền đoạn văn), 7 (đọc hiểu).
 *
 * Địa chỉ #/sets?part=N. Bố cục HAI CỘT trên màn rộng (D41): tài liệu bên trái, câu hỏi bên phải; điện thoại
 * thì xếp dọc. Đọc: hiện đoạn văn rồi trả lời các câu. Nghe: nút Nghe phát cả đoạn, câu hỏi hiện sẵn
 * (đề thật cho xem trước câu hỏi), chữ (transcript) chỉ hiện sau khi trả lời hết.
 *
 * **Chấm cả bộ một lượt (D42):** chọn đáp án chỉ tô lại và đổi được; trả lời hết bộ mới hiện đúng/sai +
 * giải thích, rồi mới ghi nhật ký MỘT lần cho cả bộ (chấm ngay từng câu sẽ lộ bài cho các câu sau).
 * Kết quả ghi bằng `question.answered` như Part 2/5 nên thống kê lỗ hổng dùng chung.
 */
import { el, goTo } from './dom.js';
import {
  SET_PARTS, SET_ROUND_SIZE, PART_LABEL, setQueue, gradeSetAnswer, nextUnanswered,
} from '../logic/sets.js';
import { roundProgress } from '../logic/round.js';
import { SPEEDS, turnSequence, audioUrl } from '../logic/listen.js';
import { getListenSpeed, setListenSpeed } from '../data/prefs.js';
import { createPlayer } from './audio-player.js';
import { renderStem, renderTray, resetCapture } from './capture-tray.js';
import { renderQuestion, renderTranscript, renderHold } from './set-blocks.js';
import { splitPane } from './blocks.js';
import { createEvent } from '../logic/events.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// Trạng thái riêng của màn.
let part = null;               // phần đang luyện (3|4|6|7)
let seenParam;                 // ?part= lần vẽ trước
let locked = null;             // bộ đang làm (khoá lại để hàng đợi không đổi giữa chừng)
let answers = {};              // id câu → chữ cái đã chọn (chỉ của bộ đang làm)
let doneThisRound = new Set(); // id các bộ đã làm xong trong lượt
let playing = false;
let nowTurn = null;            // lượt nói đang phát
let heard = false;
let playError = null;
let recorded = false;         // đã ghi nhật ký cho bộ này chưa (chỉ ghi MỘT lần, khi trả lời hết)

let makePlayer = () => createPlayer();
let player = null;

/** Tiêm bộ phát giả khi test (jsdom không phát được âm thanh). */
export function setSetsPlayerFactory(factory) {
  player?.dispose();
  player = null;
  makePlayer = factory;
}
const getPlayer = () => (player ??= makePlayer());

const isListening = () => part === 3 || part === 4;

function roundQueue(store) {
  const left = Math.max(0, SET_ROUND_SIZE[part] - doneThisRound.size);
  if (left === 0) return [];
  return setQueue(store.sets[part], store.quizStates, { size: left, exclude: doneThisRound });
}

const currentSet = (store) => locked ?? roundQueue(store)[0] ?? null;
const allAnswered = (set) => nextUnanswered(set, answers) === null;

/**
 * @param {object} store
 * @param {URLSearchParams} [params]
 * @returns {HTMLElement}
 */
export function renderSets(store, params) {
  const fromUrl = Number.parseInt(params?.get('part') ?? '', 10);
  if (fromUrl !== seenParam) {
    seenParam = fromUrl;
    if (SET_PARTS.includes(fromUrl) && fromUrl !== part) {
      // Đổi sang phần khác thì bỏ cả lượt cũ: các bộ đã làm ở phần trước không được tính vào lượt của phần này.
      part = fromUrl;
      doneThisRound = new Set();
      getPlayer().stop();
      resetProgress();
    }
  }
  if (!SET_PARTS.includes(part)) return renderNoPart();

  const bank = store.sets[part];
  if (bank.length === 0) {
    return el('div', {}, [
      el('h1', { text: PART_LABEL[part] }),
      el('p', { class: 'empty', text: `Chưa có bộ đề nào. Chạy pipeline: npm run build:sets -- --part ${part}` }),
      el('button', { class: 'secondary', onClick: () => goTo('/exams') }, [el('span', { text: 'Về mục Bài thi' })]),
    ]);
  }

  const set = currentSet(store);
  if (!set) {
    const count = doneThisRound.size;
    return el('div', {}, [
      el('h1', { text: count > 0 ? 'Xong lượt này' : 'Hết bộ rồi' }),
      el('p', { class: 'empty', text: count > 0
        ? `Đã làm ${count} bộ. Câu nào sai sẽ quay lại ở lượt sau.`
        : 'Đã làm hết các bộ hiện có.' }),
      el('button', { class: 'primary', onClick: () => goTo('/exams') }, [el('span', { text: 'Về mục Bài thi' })]),
    ]);
  }

  if (isListening()) getPlayer().preload(set.audio.clips.map(audioUrl)).catch(() => {});

  const { remaining } = roundProgress({
    roundSize: SET_ROUND_SIZE[part], doneCount: doneThisRound.size,
    availableCount: roundQueue(store).length, locked: Boolean(locked),
  });
  const done = allAnswered(set);

  const left = set.questions.filter((q) => !answers[q.id]).length;

  // Cột trái: tài liệu (đoạn văn / nút nghe), khay gạt từ, và chữ hội thoại khi đã làm xong.
  const material = [
    isListening() ? renderListenCard(store, set) : renderPassages(store, set),
    ...(done && isListening() ? [renderTranscript(store, set, nowTurn)] : []),
    ...(done || !isListening() ? [renderTray(store, { id: set.id })] : []),
  ];

  // Cột phải: các câu hỏi, rồi nút sang bộ kế khi đã chấm.
  const questions = set.questions.map((question, index) => renderQuestion(
    question, index, answers[question.id] ?? null, (letter) => pick(store, set, question, letter), done,
  ));
  if (!done) questions.push(renderHold(left));
  else {
    questions.push(
      el('div', { class: 'actions' }, [
        el('button', { class: 'primary', onClick: () => next(store) }, [
          el('span', { text: 'Bộ tiếp theo' }), el('small', { text: 'phím Space' }),
        ]),
      ]),
      el('div', { class: 'actions' }, [
        el('button', { class: 'link', text: '⚑ Báo bộ này có vấn đề', onClick: () => report(store, set) }),
      ]),
    );
  }

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Bài thi', onClick: () => goTo('/exams') }),
      el('span', { class: 'progress', text: `còn ${remaining} bộ · ${PART_LABEL[part]}` }),
    ]),
    el('h1', { class: 'set-title', text: set.title || PART_LABEL[part] }),
    splitPane(material, questions),
  ]);
}

function renderNoPart() {
  return el('div', {}, [
    el('h1', { text: 'Chọn một phần' }),
    ...SET_PARTS.map((p) => el('button', { class: 'secondary', onClick: () => goTo(`/sets?part=${p}`) }, [el('span', { text: PART_LABEL[p] })])),
  ]);
}

/** Đoạn văn của bộ đọc (một, hai hoặc ba tài liệu). Từng từ gạt được (D34). */
function renderPassages(store, set) {
  // Part 6: chỗ trống [1], [2]… trong đoạn văn được in kèm số thứ tự câu, như đề thật.
  const numbers = set.questions.map((_, i) => i + 1);
  return el('div', {}, set.passages.map((passage) => el('div', { class: 'card passage' }, [
    set.passages.length > 1 ? el('div', { class: 'gaps-title', text: passage.label }) : '',
    renderStem(store, { stem: passage.text }, { numbers }),
  ])));
}

/** Nút Nghe + tốc độ. Câu hỏi hiện ngay bên dưới (xem trước như đề thật). */
function renderListenCard(store, set) {
  const speed = getListenSpeed();
  return el('div', { class: 'card big' }, [
    el('button', { class: 'primary listen-play', onClick: () => play(store, set) }, [
      el('span', { text: playing ? '🔊 Đang phát…' : heard ? '▶ Nghe lại' : '▶ Nghe đoạn này' }),
      el('small', { text: 'phím Space' }),
    ]),
    el('div', { class: 'chooser' }, [
      el('span', { class: 'chooser-label', text: 'Tốc độ' }),
      ...SPEEDS.map((option) => el('button', {
        class: option === speed ? 'chip-btn active' : 'chip-btn', text: `${option}×`,
        onClick: () => { setListenSpeed(option); store.refresh(); },
      })),
    ]),
    playError ? el('div', { class: 'warn', text: playError }) : '',
  ]);
}

/** Phát cả đoạn. Gọi từ thao tác chạm nên audio.play() được phép (xem audio-player.js). */
async function play(store, set) {
  playError = null;
  playing = true;
  nowTurn = null;
  store.refresh();
  try {
    const outcome = await getPlayer().play(turnSequence(set), {
      rate: getListenSpeed(),
      onStep: (step) => {
        const key = step.type === 'clip' ? step.key : null;
        if (key === nowTurn) return;
        nowTurn = key;
        store.refresh();
      },
    });
    if (outcome === 'done') heard = true;
  } catch (error) {
    playError = `${error.message}. Thử bấm Nghe lại, hoặc tải lại trang.`;
  } finally {
    playing = false;
    nowTurn = null;
    store.refresh();
  }
}

/**
 * Chọn đáp án cho một câu. CHƯA chấm, chưa ghi gì — đổi lại thoải mái.
 * Trả lời tới câu cuối thì chấm cả bộ và ghi nhật ký một lượt.
 */
async function pick(store, set, question, letter) {
  if (allAnswered(set)) return;             // đã chấm rồi thì khoá
  answers = { ...answers, [question.id]: letter };
  locked = set;
  if (!allAnswered(set)) { store.refresh(); return; }

  doneThisRound.add(set.id);
  getPlayer().stop();
  await finish(store, set);
}

/**
 * Ghi kết quả CẢ BỘ trong một lượt. Ghi từng câu một sẽ vẽ lại màn nhiều lần và làm nhấp nháy
 * (đúng lý do exam-screen.js gói sự kiện khi nộp bài).
 */
async function finish(store, set) {
  if (recorded) return;
  recorded = true;
  const events = set.questions.map((question) => {
    const letter = answers[question.id];
    const result = gradeSetAnswer(question, letter);
    return createEvent({
      type: 'question.answered', deviceId: store.deviceId,
      payload: { questionId: question.id, choice: letter, correct: result.correct, errorType: result.errorType },
    });
  });
  await store.importEvents(events);
}

function next(store) {
  getPlayer().stop();
  resetProgress();
  store.refresh();
}

/** Báo cả bộ có vấn đề: mọi câu của bộ bị loại khỏi hàng đợi (D12). */
async function report(store, set) {
  getPlayer().stop();
  doneThisRound.add(set.id);
  const questions = set.questions;
  resetProgress();
  for (const question of questions) await store.record('question.reported', { questionId: question.id });
}

/** Xoá trạng thái của bộ đang làm (giữ lại tiến độ của lượt). */
function resetProgress() {
  locked = null;
  answers = {};
  recorded = false;
  heard = false;
  playing = false;
  nowTurn = null;
  playError = null;
  resetCapture();
}

/**
 * Phím tắt: Space nghe / sang bộ kế; 1–4 hoặc A–D chọn đáp án cho câu đầu tiên chưa trả lời.
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handleSetsKey(store, event) {
  if (!SET_PARTS.includes(part)) return;
  const set = currentSet(store);
  if (!set) return;

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    if (allAnswered(set)) next(store);
    else if (isListening()) play(store, set);
    return;
  }
  const question = nextUnanswered(set, answers);
  if (!question) return;
  const byNumber = LETTERS[Number.parseInt(event.key, 10) - 1];
  const byLetter = LETTERS.includes(event.key.toUpperCase?.()) ? event.key.toUpperCase() : null;
  const letter = byNumber ?? byLetter;
  if (letter) pick(store, set, question, letter);
}

/** Đặt lại khi rời màn. */
export function resetSets() {
  player?.dispose();
  player = null;
  part = null;
  seenParam = undefined;
  doneThisRound = new Set();
  resetProgress();
}
