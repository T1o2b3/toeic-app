/**
 * Thi thử (M15, dựng lại theo đề thật ở D39): chọn chế độ → làm bài có tính giờ, không xem đáp án → nộp →
 * kết quả kèm ĐIỂM ƯỚC LƯỢNG + xem lại câu sai.
 *
 * Đúng như đề thật: đề đủ chia làm HAI phần tính giờ riêng — Nghe 45 phút rồi Đọc 75 phút — và sang phần
 * sau thì không quay lại phần trước. Câu mang số hiệu thật (Part 5 = 101–130, Part 7 = 147–200).
 *
 * Chỉ ghi vào nhật ký KHI NỘP (một lần, gói gọn): `question.answered` cho mỗi câu đã trả lời (thêm mode: 'exam')
 * và một `exam.finished` tóm tắt. Vì vậy thoát giữa chừng thì mất bài — làm dở rồi tiếp trên máy khác là M16.
 */
import { el, goTo } from './dom.js';
import { buildExamForm, formUnits, scoreExam, examSummaryPayload } from '../logic/exam.js';
import { examPhases, numberQuestions, formatClock } from '../logic/exam-time.js';
import { estimateScore } from '../logic/score.js';
import { clipSequence, turnSequence, audioUrl } from '../logic/listen.js';
import { getListenSpeed } from '../data/prefs.js';
import { createEvent } from '../logic/events.js';
import { createPlayer } from './audio-player.js';
import { renderRunning, phaseNotice } from './exam-run.js';
import { renderResult } from './exam-result.js';
import { renderSetup } from './exam-setup.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// Trạng thái của bài thi đang làm (chỉ trong bộ nhớ).
let phase = 'setup';         // 'setup' | 'running' | 'result'
let form = null;
let units = [];
let phases = [];
let phaseIndex = 0;
let numbers = new Map();
let index = 0;               // đơn vị đang làm
let answers = {};
let deadline = 0;
let startedAt = 0;
let timer = null;
let confirming = false;      // đang hỏi "còn câu chưa trả lời, nộp?"
let switching = false;       // đang hỏi "sang phần sau?"
let switched = false;        // vừa tự chuyển phần vì hết giờ — hiện lời nhắc một lần
let showPalette = false;
let result = null;           // {score, seconds, timedOut, estimate}
let playing = false;
let heard = {};              // id đơn vị → số lần đã nghe
let playError = null;

let makePlayer = () => createPlayer();
let player = null;
const getPlayer = () => (player ??= makePlayer());

/** Tiêm bộ phát giả khi test. */
export function setExamPlayerFactory(factory) {
  player?.dispose();
  player = null;
  makePlayer = factory;
}

/** Ngân hàng câu hỏi gom từ store, đúng dạng buildExamForm cần. */
const banksOf = (store) => ({ part2: store.listening, part5: store.questions, sets: store.sets });

const isAudioUnit = (unit) => unit.part === 'part2' || unit.part === 'part3' || unit.part === 'part4';

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderExam(store) {
  if (phase === 'running') return renderRunningScreen(store);
  if (phase === 'result') return renderResult(result, () => { reset(); store.refresh(); });
  return renderSetup(banksOf(store), (mode) => start(store, mode));
}

/** Bắt đầu một bài thi. */
function start(store, mode) {
  form = buildExamForm(banksOf(store), mode);
  units = formUnits(form);
  if (units.length === 0) return;
  phases = examPhases(form);
  numbers = numberQuestions(form);
  answers = {};
  phaseIndex = 0;
  index = 0;
  heard = {};
  confirming = false;
  switching = false;
  switched = false;
  showPalette = false;
  result = null;
  phase = 'running';
  startedAt = Date.now();
  deadline = startedAt + phases[0].seconds * 1000;
  timer = setInterval(() => tick(store), 1000);
  store.refresh();
}

/** Mỗi giây: cập nhật đồng hồ tại chỗ (không vẽ lại cả màn); hết giờ thì sang phần sau hoặc tự nộp. */
function tick(store) {
  const remaining = Math.ceil((deadline - Date.now()) / 1000);
  const clock = document.querySelector('.exam-clock');
  if (clock) {
    clock.textContent = formatClock(remaining);
    clock.classList.toggle('low', remaining <= 300);
  }
  if (remaining > 0) return;
  if (phaseIndex < phases.length - 1) nextPhase(store, true);
  else submit(store, true);
}

/** Sang phần sau (một chiều, như đề thật). `timedOut` = do hết giờ, không phải do bấm nút. */
function nextPhase(store, timedOut) {
  getPlayer().stop();
  phaseIndex += 1;
  index = phases[phaseIndex].from;
  deadline = Date.now() + phases[phaseIndex].seconds * 1000;
  switching = false;
  switched = timedOut;
  playing = false;
  playError = null;
  store.refresh();
}

const unitQuestionCount = (u) => u.questions.length;
const countAnswered = (list) => list.reduce((n, u) => n + u.questions.filter((q) => answers[q.id]).length, 0);
const countQuestions = (list) => list.reduce((n, u) => n + unitQuestionCount(u), 0);
const phaseUnits = () => units.slice(phases[phaseIndex].from, phases[phaseIndex].to);

function renderRunningScreen(store) {
  const unit = units[index];
  getPlayer().preload(audioSources(unit)).catch(() => {});
  const current = phaseUnits();

  const view = {
    units, index, phases, phaseIndex, numbers, answers, showPalette, confirming, switching,
    remaining: Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
    atLastUnitOfExam: index >= units.length - 1,
    totalCount: countQuestions(units),
    answeredCount: countAnswered(units),
    phaseTotal: countQuestions(current),
    phaseAnswered: countAnswered(current),
    unitCtx: {
      answers, playing, heard: heard[unit.id] ?? 0, error: playError,
      pick: (id, letter) => { answers = { ...answers, [id]: letter }; confirming = false; store.refresh(); },
      play: () => play(store, unit),
    },
    onTogglePalette: () => { showPalette = !showPalette; store.refresh(); },
    onGo: (step) => go(store, step),
    onJump: (at) => { index = at; store.refresh(); },
    onAskSubmit: () => { confirming = true; switching = false; store.refresh(); },
    onAskSwitch: () => { switching = true; confirming = false; store.refresh(); },
    onCancel: () => { confirming = false; switching = false; store.refresh(); },
    onSwitch: () => nextPhase(store, false),
    onSubmit: () => submit(store, false),
  };

  const screen = renderRunning(view);
  if (switched) screen.prepend(phaseNotice(phases[phaseIndex]));
  return screen;
}

function go(store, step) {
  getPlayer().stop();
  const { from, to } = phases[phaseIndex];
  // Chặn trong phần đang làm: đề thật không cho quay lại phần trước, và sang phần sau phải qua nút xác nhận.
  index = Math.min(to - 1, Math.max(from, index + step));
  switched = false;
  playing = false;
  playError = null;
  store.refresh();
}

/** Địa chỉ mọi đoạn âm thanh của một đơn vị (rỗng nếu không phải đơn vị nghe). */
function audioSources(unit) {
  if (!isAudioUnit(unit)) return [];
  const item = unit.item;
  return (unit.part === 'part2' ? [item.audio.question, item.audio.A, item.audio.B, item.audio.C] : item.audio.clips).map(audioUrl);
}

/** Phát đoạn nghe của đơn vị hiện tại. */
async function play(store, unit) {
  if (!isAudioUnit(unit)) return;
  playError = null;
  playing = true;
  switched = false;
  store.refresh();
  try {
    const steps = unit.part === 'part2' ? clipSequence(unit.item) : turnSequence(unit.item);
    const outcome = await getPlayer().play(steps, { rate: getListenSpeed() });
    if (outcome === 'done') heard = { ...heard, [unit.id]: (heard[unit.id] ?? 0) + 1 };
  } catch (error) {
    playError = `${error.message}. Thử bấm Nghe lại.`;
  } finally {
    playing = false;
    store.refresh();
  }
}

/** Nộp bài: chấm, quy đổi điểm, ghi nhật ký MỘT lần, chuyển sang màn kết quả. */
async function submit(store, timedOut) {
  if (phase !== 'running') return; // hết giờ và bấm nộp cùng lúc: chỉ nộp một lần
  phase = 'result';
  clearInterval(timer);
  timer = null;
  getPlayer().stop();

  const seconds = Math.round((Math.min(Date.now(), deadline) - startedAt) / 1000);
  const score = scoreExam(form, answers);
  const estimate = estimateScore(score);
  result = { score, estimate, seconds, timedOut, mode: form.mode };
  store.refresh();

  const events = [];
  for (const section of form.sections) {
    for (const unit of section.units) {
      for (const question of unit.questions) {
        const picked = answers[question.id];
        if (!picked) continue;
        events.push(createEvent({
          type: 'question.answered', deviceId: store.deviceId,
          payload: { questionId: question.id, choice: picked, correct: picked === question.answer, errorType: question.errorType, mode: 'exam' },
        }));
      }
    }
  }
  events.push(createEvent({
    type: 'exam.finished', deviceId: store.deviceId,
    payload: examSummaryPayload(score, { mode: form.mode, seconds, timedOut, estimate }),
  }));
  await store.importEvents(events);
}

/**
 * Phím tắt khi đang làm bài: ← → chuyển đơn vị, Space nghe, 1–4/A–D chọn cho câu đầu tiên chưa trả lời.
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handleExamKey(store, event) {
  if (phase !== 'running') return;
  const unit = units[index];
  if (event.key === 'ArrowRight') { go(store, 1); return; }
  if (event.key === 'ArrowLeft') { go(store, -1); return; }
  if (event.key === ' ') {
    event.preventDefault();
    play(store, unit);
    return;
  }
  const question = unit.questions.find((q) => !answers[q.id]);
  if (!question) return;
  const max = unit.part === 'part2' ? 3 : 4;
  const byNumber = Number.parseInt(event.key, 10);
  const byLetter = LETTERS.indexOf(event.key.toUpperCase?.());
  const at = byNumber >= 1 && byNumber <= max ? byNumber - 1 : byLetter >= 0 && byLetter < max ? byLetter : -1;
  if (at >= 0) { answers = { ...answers, [question.id]: LETTERS[at] }; confirming = false; store.refresh(); }
}

function reset() {
  clearInterval(timer);
  timer = null;
  phase = 'setup';
  form = null;
  units = [];
  phases = [];
  phaseIndex = 0;
  numbers = new Map();
  answers = {};
  result = null;
  confirming = false;
  switching = false;
  switched = false;
  showPalette = false;
  playing = false;
  playError = null;
  heard = {};
  index = 0;
}

/** Đặt lại khi rời màn (bài đang làm dở bị bỏ — xem ghi chú đầu file). */
export function resetExam() {
  player?.dispose();
  player = null;
  reset();
}
