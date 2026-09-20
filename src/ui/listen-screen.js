/**
 * Màn luyện nghe Part 2 (M9): nghe câu hỏi + ba câu đáp, chọn A/B/C, rồi mới xem chữ.
 *
 * Làm bài chỉ thấy ba nút A/B/C, không có chữ — đúng như bài thi thật, buộc phải nghe. Nút chọn chỉ
 * mở sau khi đã nghe hết một lượt. Trả lời xong mới hiện transcript, giải thích, và cho gạt từ lạ (D34).
 * Kết quả ghi bằng cùng sự kiện `question.answered` như Part 5 nên thống kê lỗ hổng dùng chung.
 */
import { el, goTo } from './dom.js';
import { quizQueue, gradeAnswer } from '../logic/quiz.js';
import { roundProgress } from '../logic/round.js';
import { LISTEN_ROUND_SIZE, SPEEDS, clipSequence, canAnswer, audioUrl } from '../logic/listen.js';
import { getListenSpeed, setListenSpeed } from '../data/prefs.js';
import { createPlayer } from './audio-player.js';
import { optionList } from './blocks.js';
import { renderStem, renderTray, resetCapture } from './capture-tray.js';

const LETTERS = ['A', 'B', 'C'];

// Trạng thái riêng của màn này.
let picked = null;            // phương án đã chọn (null = chưa trả lời)
let locked = null;            // câu đang làm, khoá lại khi đã trả lời (như quiz-screen)
let doneThisRound = new Set();
let heard = false;            // đã nghe hết một lượt câu hỏi + ba câu đáp
let playing = false;
let nowKey = null;            // đoạn đang phát: 'question' | 'A' | 'B' | 'C'
let playError = null;

let makePlayer = () => createPlayer();
let player = null;

/** Tiêm bộ phát giả khi test (jsdom không phát được âm thanh). */
export function setListenPlayerFactory(factory) {
  player?.dispose();
  player = null;
  makePlayer = factory;
}

const getPlayer = () => (player ??= makePlayer());

function roundQueue(store) {
  const left = Math.max(0, LISTEN_ROUND_SIZE - doneThisRound.size);
  if (left === 0) return [];
  return quizQueue(store.listening, store.quizStates, { size: left, exclude: doneThisRound });
}

function currentQuestion(store) {
  return locked ?? roundQueue(store)[0] ?? null;
}

const sourcesOf = (item) => [item.audio.question, ...LETTERS.map((l) => item.audio[l])].map(audioUrl);

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderListen(store) {
  if (store.listening.length === 0) {
    return el('div', {}, [
      el('h1', { text: 'Luyện nghe Part 2' }),
      el('p', { class: 'empty', text: 'Chưa có câu nghe nào. Chạy pipeline: npm run build:listening' }),
      el('button', { class: 'secondary', onClick: () => goTo('/exams') }, [el('span', { text: 'Về mục Bài thi' })]),
    ]);
  }

  const question = currentQuestion(store);
  if (!question) {
    const count = doneThisRound.size;
    return el('div', {}, [
      el('h1', { text: count > 0 ? 'Xong lượt này' : 'Hết câu rồi' }),
      el('p', { class: 'empty', text: count > 0
        ? `Đã nghe ${count} câu. Câu nào sai sẽ quay lại ở lượt sau.`
        : 'Đã làm hết các câu nghe hiện có.' }),
      el('button', { class: 'primary', onClick: () => goTo('/exams') }, [el('span', { text: 'Về mục Bài thi' })]),
    ]);
  }

  // Tải trước âm thanh của câu này và câu kế để lần chạm "Nghe" phát được ngay (xem audio-player.js).
  const upcoming = roundQueue(store).filter((q) => q.id !== question.id).slice(0, 1);
  getPlayer().preload([question, ...upcoming].flatMap(sourcesOf)).catch(() => {});

  const { remaining } = roundProgress({
    roundSize: LISTEN_ROUND_SIZE,
    doneCount: doneThisRound.size,
    availableCount: roundQueue(store).length,
    locked: Boolean(locked),
  });
  const result = picked ? gradeAnswer(question, picked) : null;
  const speed = getListenSpeed();

  const children = [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Bài thi', onClick: () => goTo('/exams') }),
      el('span', { class: 'progress', text: `còn ${remaining} câu · ${question.errorType}` }),
    ]),
    el('div', { class: 'card big' }, [
      el('button', { class: 'primary listen-play', onClick: () => play(store, question) }, [
        el('span', { text: playing ? '🔊 Đang phát…' : heard ? '▶ Nghe lại' : '▶ Nghe câu này' }),
        el('small', { text: 'phím Space' }),
      ]),
      el('div', { class: 'chooser' }, [
        el('span', { class: 'chooser-label', text: 'Tốc độ' }),
        ...SPEEDS.map((option) => el('button', {
          class: option === speed ? 'chip-btn active' : 'chip-btn',
          text: `${option}×`,
          onClick: () => { setListenSpeed(option); store.refresh(); },
        })),
      ]),
      playError ? el('div', { class: 'warn', text: playError }) : '',
    ]),
    // Nghe hết mới chọn được; chọn xong mới lộ chữ của ba câu đáp (D35).
    optionList({
      letters: LETTERS,
      textOf: (letter) => (result ? question.responses[letter] : (nowKey === letter ? '🔊' : '')),
      picked, answer: result ? question.answer : null, marker: nowKey, extra: 'listen-opt',
      locked: !canAnswer(heard, picked),
      isDisabled: () => !canAnswer(heard, picked) && !picked,
      onPick: (letter) => answer(store, question, letter),
    }),
  ];

  if (!picked) {
    children.push(el('p', { class: 'footnote', text: heard
      ? 'Phím tắt: 1–3 hoặc A–C để chọn · Space nghe lại'
      : 'Nghe hết câu hỏi và ba câu đáp rồi mới chọn được. Đeo tai nghe sẽ dễ tập trung hơn.' }));
    return el('div', {}, children);
  }

  children.push(
    el('div', { class: `verdict ${result.correct ? 'ok' : 'no'}`, text: result.correct ? 'Đúng' : `Sai — đáp án là ${question.answer}` }),
    renderTranscript(store, question),
    renderTray(store, question),
    el('div', { class: 'card back' }, [
      el('div', { class: 'meaning', text: question.explanation }),
      question.trap ? el('div', { class: 'note', text: question.trap }) : '',
    ]),
    el('div', { class: 'actions' }, [
      el('button', { class: 'primary', onClick: () => next(store) }, [
        el('span', { text: 'Câu tiếp theo' }),
        el('small', { text: 'phím Space' }),
      ]),
    ]),
    el('div', { class: 'actions' }, [
      el('button', { class: 'link', text: '⚑ Báo câu này sai', onClick: () => report(store, question) }),
    ]),
  );
  return el('div', {}, children);
}

/** Chữ của câu vừa nghe. Từng từ gạt được (D34) — lúc này nghĩa đã lộ rồi nên không còn sợ mất mạch. */
function renderTranscript(store, question) {
  const line = (label, text, extra = '') => el('div', { class: `transcript-line${extra}` }, [
    el('span', { class: 'letter', text: label }),
    renderStem(store, { stem: text }),
  ]);
  return el('div', { class: 'card back' }, [
    el('div', { class: 'gaps-title', text: 'Chữ của câu vừa nghe' }),
    line('Q', question.question),
    ...LETTERS.map((letter) => line(letter, question.responses[letter], letter === question.answer ? ' correct' : '')),
  ]);
}

/** Phát cả chuỗi. Gọi từ thao tác chạm nên audio.play() được phép (xem audio-player.js). */
async function play(store, question) {
  playError = null;
  playing = true;
  nowKey = null;
  store.refresh();
  try {
    const outcome = await getPlayer().play(clipSequence(question), {
      rate: getListenSpeed(),
      onStep: (step) => {
        const key = step.type === 'clip' ? step.key : null;
        if (key === nowKey) return;
        nowKey = key;
        store.refresh();
      },
    });
    if (outcome === 'done') heard = true;
  } catch (error) {
    playError = `${error.message}. Thử bấm Nghe lại, hoặc tải lại trang.`;
  } finally {
    playing = false;
    nowKey = null;
    store.refresh();
  }
}

/** Ghi kết quả. Chặn khi chưa nghe hết hoặc đã chọn rồi (bấm phím hai lần). */
async function answer(store, question, letter) {
  if (!canAnswer(heard, picked)) return;
  picked = letter;
  locked = question;
  doneThisRound.add(question.id);
  getPlayer().stop();
  const result = gradeAnswer(question, letter);
  await store.record('question.answered', {
    questionId: question.id, choice: letter, correct: result.correct, errorType: result.errorType,
  });
}

function next(store) {
  getPlayer().stop();
  picked = null;
  locked = null;
  heard = false;
  playing = false;
  nowKey = null;
  playError = null;
  resetCapture();
  store.refresh();
}

/** Báo câu có vấn đề: câu bị loại khỏi hàng đợi (D12), như Part 5. */
async function report(store, question) {
  getPlayer().stop();
  picked = null;
  locked = null;
  heard = false;
  resetCapture();
  doneThisRound.add(question.id);
  await store.record('question.reported', { questionId: question.id });
}

/**
 * Phím tắt: Space nghe / nghe lại (sang câu kế khi đã trả lời), 1–3 hoặc A–C chọn.
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handleListenKey(store, event) {
  const question = currentQuestion(store);
  if (!question) return;

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    if (picked) next(store);
    else play(store, question);
    return;
  }
  if (picked) return;

  const byNumber = LETTERS[Number.parseInt(event.key, 10) - 1];
  const byLetter = LETTERS.includes(event.key.toUpperCase?.()) ? event.key.toUpperCase() : null;
  const letter = byNumber ?? byLetter;
  if (letter) answer(store, question, letter);
}

/** Đặt lại khi rời màn. */
export function resetListen() {
  player?.dispose();
  player = null;
  picked = null;
  locked = null;
  doneThisRound = new Set();
  heard = false;
  playing = false;
  nowKey = null;
  playError = null;
  resetCapture();
}
