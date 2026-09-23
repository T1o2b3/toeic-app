/**
 * Thi thử (M15, dựng lại theo đề thật ở D39): chọn chế độ → làm bài có tính giờ, không xem đáp án → nộp →
 * kết quả kèm ĐIỂM ƯỚC LƯỢNG + xem lại câu sai.
 *
 * Đúng như đề thật: đề đủ chia làm HAI phần tính giờ riêng — Nghe 45 phút rồi Đọc 75 phút — và sang phần
 * sau thì không quay lại phần trước. Câu mang số hiệu thật (Part 5 = 101–130, Part 7 = 147–200).
 *
 * Ghi nhật ký một lần khi nộp: `question.answered` cho mỗi câu đã trả lời (thêm mode: 'exam')
 * và một `exam.finished` tóm tắt. M16: Lưu trạng thái làm dở vào localStorage để không bị mất bài.
 */
import { buildExamForm, formUnits, scoreExam, examSummaryPayload } from '../logic/exam.js';
import { originalLetter, randomSeed } from '../logic/shuffle.js';
import { seededRandom } from '../logic/shuffle.js';
import { examPhases, numberQuestions, formatClock } from '../logic/exam-time.js';
import { estimateScore } from '../logic/score.js';
import { clipSequence, turnSequence, audioUrl } from '../logic/listen.js';
import { getListenSpeed } from '../data/prefs.js';
import { targetFor } from '../logic/pace.js';
import { createEvent } from '../logic/events.js';
import { createPlayerSlot } from './audio-player.js';
import { renderRunning, phaseNotice } from './exam-run.js';
import { advanceText } from './exam-unit.js';
import { renderResult } from './exam-result.js';
import { renderSetup } from './exam-setup.js';

const LETTERS = ['A', 'B', 'C', 'D'];
const STATE_KEY = 'codex_toeic_exam_state';

// Trạng thái của bài thi đang làm.
let phase = 'setup';         // 'setup' | 'running' | 'result'
let form = null;
let seed = 0;             // hạt giống xáo đề — lưu lại để khôi phục ra ĐÚNG đề cũ
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
let currentClip = null;      // Clip đang phát (để highlight UI)
let activePart = null;       // Part đang chọn để xem lại ở màn kết quả
let advanceAt = 0;           // mốc tự sang câu sau khi hết khoảng lặng sau đoạn nghe (0 = không đếm) — M21
let flags = {};              // id câu → đánh dấu "chưa chắc, quay lại sau" (phần Đọc) — M21

const slot = createPlayerSlot();
const getPlayer = () => slot.get();

/** Tiêm bộ phát giả khi test. */
export const setExamPlayerFactory = (factory) => slot.setFactory(factory);

/** Ngân hàng câu hỏi gom từ store, đúng dạng buildExamForm cần. */
const banksOf = (store) => ({ part2: store.listening, part5: store.questions, sets: store.sets });

const isAudioUnit = (unit) => unit && (unit.part === 'part2' || unit.part === 'part3' || unit.part === 'part4');

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderExam(store) {
  if (phase === 'setup') restoreExamState(store);
  if (phase === 'running') return renderRunningScreen(store);
  if (phase === 'result') return renderResult(result, () => { reset(); store.refresh(); }, {
    activePart,
    onPartChange: (part) => { activePart = part; store.refresh(); },
  });
  return renderSetup(banksOf(store), (mode) => start(store, mode));
}

/**
 * Khôi phục bài đang làm dở sau khi tải lại trang (M16).
 *
 * Phải dựng lại đề bằng ĐÚNG `seed` đã lưu: `buildExamForm` xáo ngẫu nhiên, nên dựng lại bằng
 * `Math.random` sẽ ra một đề hoàn toàn khác — câu trả lời đã lưu không khớp câu nào và Huy mất sạch bài
 * làm trong khi màn hình vẫn báo "đã khôi phục". Bản lưu cũ không có `seed` thì bỏ, còn hơn dựng sai.
 */
function restoreExamState(store) {
  const saved = loadExamState();
  if (!saved) return;
  if (!saved.mode || typeof saved.seed !== 'number') { localStorage.removeItem(STATE_KEY); return; }

  form = buildExamForm(banksOf(store), saved.mode, { random: seededRandom(saved.seed) });
  units = formUnits(form);
  if (units.length === 0) { localStorage.removeItem(STATE_KEY); form = null; return; }
  phases = examPhases(form);
  numbers = numberQuestions(form);
  seed = saved.seed;
  phaseIndex = saved.phaseIndex ?? 0;
  index = saved.index ?? 0;
  answers = saved.answers ?? {};
  startedAt = saved.startedAt;
  deadline = saved.deadline;
  heard = saved.heard ?? {};
  flags = saved.flags ?? {};
  phase = 'running';
  timer = setInterval(() => tick(store), 1000);
}

/** Bắt đầu một bài thi. */
function start(store, mode) {
  seed = randomSeed();
  form = buildExamForm(banksOf(store), mode, { random: seededRandom(seed) });
  units = formUnits(form);
  if (units.length === 0) return;
  phases = examPhases(form);
  numbers = numberQuestions(form);
  answers = {};
  phaseIndex = 0;
  index = 0;
  heard = {};
  flags = {};
  advanceAt = 0;
  confirming = false;
  switching = false;
  switched = false;
  showPalette = false;
  result = null;
  phase = 'running';
  startedAt = Date.now();
  deadline = startedAt + phases[0].seconds * 1000;
  timer = setInterval(() => tick(store), 1000);
  saveExamState(mode);
  store.refresh();
}

/** Mỗi giây: cập nhật đồng hồ tại chỗ; hết khoảng lặng thì sang câu sau; hết giờ thì sang phần sau hoặc tự nộp. */
function tick(store) {
  if (advanceAt) {
    const left = Math.ceil((advanceAt - Date.now()) / 1000);
    const note = document.querySelector('.advance-note');
    if (note) note.textContent = advanceText(left);
    if (left <= 0) autoAdvance(store);
  }
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

/** Sang phần sau (một chiều, như đề thật). */
function nextPhase(store, timedOut) {
  getPlayer().stop();
  phaseIndex += 1;
  index = phases[phaseIndex].from;
  advanceAt = 0;
  deadline = Date.now() + phases[phaseIndex].seconds * 1000;
  switching = false;
  switched = timedOut;
  playing = false;
  playError = null;
  currentClip = null;
  saveExamState();
  store.refresh();
}

const unitQuestionCount = (u) => u.questions.length;
const countAnswered = (list) => list.reduce((n, u) => n + u.questions.filter((q) => answers[q.id]).length, 0);
const countQuestions = (list) => list.reduce((n, u) => n + unitQuestionCount(u), 0);
const phaseUnits = () => units.slice(phases[phaseIndex].from, phases[phaseIndex].to);
const isReadingUnit = (unit) => unit.part === 'part5' || unit.part === 'part6' || unit.part === 'part7';

function renderRunningScreen(store) {
  const unit = units[index];
  getPlayer().preload(audioSources(unit)).catch(() => {});
  const current = phaseUnits();

  const view = {
    units, index, phases, phaseIndex, numbers, answers, flags, showPalette, confirming, switching,
    remaining: Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
    atLastUnitOfExam: index >= units.length - 1,
    totalCount: countQuestions(units),
    answeredCount: countAnswered(units),
    phaseTotal: countQuestions(current),
    phaseAnswered: countAnswered(current),
    flaggedCount: units.reduce((n, u) => n + u.questions.filter((q) => flags[q.id]).length, 0),
    unitCtx: {
      answers, playing, heard: heard[unit.id] ?? 0, error: playError,
      highlight: currentClip,
      advanceIn: advanceAt ? Math.max(0, Math.ceil((advanceAt - Date.now()) / 1000)) : 0,
      flags: isReadingUnit(unit) ? flags : null,
      toggleFlag: (id) => { flags = { ...flags, [id]: !flags[id] }; saveExamState(); store.refresh(); },
      pick: (id, letter) => { answers = { ...answers, [id]: letter }; confirming = false; saveExamState(); store.refresh(); },
      play: () => play(store, unit),
    },
    onTogglePalette: () => { showPalette = !showPalette; store.refresh(); },
    onGo: (step) => go(store, step),
    onJump: (at) => { index = at; saveExamState(); store.refresh(); },
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
  index = Math.min(to - 1, Math.max(from, index + step));
  advanceAt = 0;
  switched = false;
  playing = false;
  playError = null;
  currentClip = null;
  saveExamState();
  store.refresh();
}

/** Địa chỉ mọi đoạn âm thanh của một đơn vị. */
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
    const outcome = await getPlayer().play(steps, { 
      rate: getListenSpeed(),
      onStep: (step) => {
        if (step.type === 'clip') {
          currentClip = step.key;
        } else if (step.type === 'done') {
          currentClip = null;
        }
        store.refresh();
      }
    });
    if (outcome === 'done') {
      heard = { ...heard, [unit.id]: (heard[unit.id] ?? 0) + 1 };
      // Như băng đề thật: nghe xong là khoảng lặng để chọn, rồi tự sang câu sau. Câu cuối của phần thì không —
      // sang phần Đọc phải tự xác nhận (không quay lại được).
      if (index < phases[phaseIndex].to - 1) {
        advanceAt = Date.now() + targetFor(Number(unit.part.slice(4)), unit.questions.length) * 1000;
      }
      saveExamState();
    }
  } catch (error) {
    playError = `${error.message}. Thử bấm Nghe lại.`;
  } finally {
    playing = false;
    currentClip = null;
    store.refresh();
  }
}

/** Hết khoảng lặng sau đoạn nghe: sang đơn vị kế và PHÁT LUÔN, như băng đề thật chạy liền (M21). */
function autoAdvance(store) {
  advanceAt = 0;
  go(store, 1);
  const unit = units[index];
  if (isAudioUnit(unit) && !(heard[unit.id] > 0)) play(store, unit);
}

/** Nộp bài. */
async function submit(store, timedOut) {
  if (phase !== 'running') return;
  phase = 'result';
  clearInterval(timer);
  timer = null;
  getPlayer().stop();
  localStorage.removeItem(STATE_KEY);

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
          payload: { questionId: question.id, choice: originalLetter(question, picked), correct: picked === question.answer, errorType: question.errorType, mode: 'exam' },
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

/** Phím tắt. */
export function handleExamKey(store, event) {
  if (phase !== 'running') return;
  const unit = units[index];
  if (event.key === 'ArrowRight') { go(store, 1); return; }
  if (event.key === 'ArrowLeft') { go(store, -1); return; }
  if (event.key === ' ') {
    event.preventDefault();
    if (!playing && !(heard[unit.id] > 0)) play(store, unit);
    return;
  }
  const question = unit.questions.find((q) => !answers[q.id]);
  if (!question) return;
  const max = unit.part === 'part2' ? 3 : 4;
  const byNumber = Number.parseInt(event.key, 10);
  const byLetter = LETTERS.indexOf(event.key.toUpperCase?.());
  const at = byNumber >= 1 && byNumber <= max ? byNumber - 1 : byLetter >= 0 && byLetter < max ? byLetter : -1;
  if (at >= 0) { answers = { ...answers, [question.id]: LETTERS[at] }; confirming = false; saveExamState(); store.refresh(); }
}

function reset() {
  clearInterval(timer);
  timer = null;
  phase = 'setup';
  form = null;
  seed = 0;
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
  flags = {};
  advanceAt = 0;
  currentClip = null;
  activePart = null;
  index = 0;
}

export function resetExam() {
  slot.dispose();
  reset();
  localStorage.removeItem(STATE_KEY);
}

function saveExamState(mode = form?.mode) {
  if (phase !== 'running') return;
  localStorage.setItem(STATE_KEY, JSON.stringify({
    mode, seed, phaseIndex, index, answers, startedAt, deadline, heard, flags,
  }));
}

function loadExamState() {
  try {
    const data = localStorage.getItem(STATE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}
