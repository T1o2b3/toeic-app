/**
 * Thi thử (M15, dựng lại theo đề thật ở D39): chọn chế độ → làm bài có tính giờ, không xem đáp án → nộp →
 * kết quả kèm ĐIỂM ƯỚC LƯỢNG + xem lại câu sai.
 *
 * Đúng như đề thật: đề đủ chia làm HAI phần tính giờ riêng — Nghe 45 phút rồi Đọc 75 phút — và sang phần
 * sau thì không quay lại phần trước. Câu mang số hiệu thật (Part 5 = 101–130, Part 7 = 147–200).
 *
 * Phần Nghe chạy như BĂNG đề thật (D67): bấm chọn đề là băng tự chạy — đầu mỗi Part có hướng dẫn, nghe xong
 * một câu là khoảng trả lời rồi tự sang câu sau, hết câu cuối thì tự sang phần Đọc. Không có nút Trước/Tiếp,
 * không quay lại câu đã qua. Chỉ khi băng không chạy được (trình duyệt chặn, tải lại trang, lỗi mạng) mới hiện
 * nút để tự bấm đi tiếp — không bao giờ kẹt.
 *
 * Ghi nhật ký một lần khi nộp: `question.answered` cho mỗi câu đã trả lời (thêm mode: 'exam')
 * và một `exam.finished` tóm tắt. M16: Lưu trạng thái làm dở vào localStorage để không bị mất bài.
 */
import { buildExamForm, formUnits, scoreExam, examSummaryPayload } from '../logic/exam.js';
import { originalLetter, randomSeed } from '../logic/shuffle.js';
import { seededRandom } from '../logic/shuffle.js';
import { examPhases, numberQuestions, formatClock } from '../logic/exam-time.js';
import { DIRECTIONS_SECONDS } from '../logic/exam-directions.js';
import { estimateScore } from '../logic/score.js';
import { clipSequence, turnSequence, audioUrl } from '../logic/listen.js';
import { targetFor } from '../logic/pace.js';
import { createEvent } from '../logic/events.js';
import { createPlayerSlot } from './audio-player.js';
import { renderRunning, phaseNotice } from './exam-run.js';
import { countdownText } from './exam-unit.js';
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
let switched = null;         // vừa tự chuyển phần: 'timeout' (hết giờ) | 'tape' (băng chạy hết) — hiện lời nhắc một lần
let showPalette = false;
let result = null;           // {score, seconds, timedOut, estimate}
let playing = false;
let heard = {};              // id đơn vị → số lần đã nghe
let playError = null;
let currentClip = null;      // Clip đang phát (để highlight UI)
let activePart = null;       // Part đang chọn để xem lại ở màn kết quả
let countdown = null;        // băng đang chờ (M21, D67): {until, kind} — kind 'play' = hết hướng dẫn đầu Part thì phát,
                             // 'next' = hết khoảng trả lời thì sang câu sau, 'end' = hết khoảng trả lời câu cuối phần Nghe
let flags = {};              // id câu → đánh dấu "chưa chắc, quay lại sau" (phần Đọc) — M21

const slot = createPlayerSlot();
const getPlayer = () => slot.get();

/** Tiêm bộ phát giả khi test. */
export const setExamPlayerFactory = (factory) => slot.setFactory(factory);

/** Ngân hàng câu hỏi gom từ store, đúng dạng buildExamForm cần. */
const banksOf = (store) => ({ part2: store.listening, part5: store.questions, sets: store.sets });

const isAudioUnit = (unit) => unit && (unit.part === 'part2' || unit.part === 'part3' || unit.part === 'part4');
const inListening = () => phases[phaseIndex]?.skill === 'listening';
/** Đơn vị mở đầu một Part — chỗ đề thật in (và ở phần Nghe thì đọc) phần hướng dẫn. */
const startsPart = (at) => at === 0 || units[at - 1].part !== units[at].part;

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderExam(store) {
  if (phase === 'setup') restoreExamState(store);
  // Như phòng thi: trong lúc làm bài ẩn cột menu — bấm nhầm sang màn khác là bỏ luôn bài đang làm.
  document.body.classList.toggle('exam-focus', phase === 'running');
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
  countdown = null;
  confirming = false;
  switched = null;
  showPalette = false;
  result = null;
  phase = 'running';
  startedAt = Date.now();
  deadline = startedAt + phases[0].seconds * 1000;
  timer = setInterval(() => tick(store), 1000);
  saveExamState(mode);
  // Cú bấm chọn đề là thao tác chạm DUY NHẤT trước khi băng chạy: mở khoá âm thanh ngay tại đây (iPhone).
  if (inListening()) { getPlayer().unlock(); cue(store); }
  store.refresh();
}

/** Mỗi giây: cập nhật đồng hồ tại chỗ; hết lúc băng chờ thì phát / sang câu sau; hết giờ thì sang phần sau hoặc tự nộp. */
function tick(store) {
  if (countdown) {
    const left = Math.ceil((countdown.until - Date.now()) / 1000);
    const note = document.querySelector('.countdown-note');
    if (note) note.textContent = countdownText(countdown.kind, left);
    if (left <= 0) {
      const { kind } = countdown;
      countdown = null;
      if (kind === 'play') play(store, units[index]);
      else advance(store);
    }
    if (phase !== 'running') return;
  }
  const remaining = Math.ceil((deadline - Date.now()) / 1000);
  const clock = document.querySelector('.exam-clock');
  if (clock) {
    clock.textContent = formatClock(remaining);
    clock.classList.toggle('low', remaining <= 300);
  }
  if (remaining > 0) return;
  if (phaseIndex < phases.length - 1) nextPhase(store, 'timeout');
  else submit(store, true);
}

/** Sang phần sau (một chiều, như đề thật). `reason`: 'timeout' | 'tape' — lời nhắc hiện ở đầu phần mới. */
function nextPhase(store, reason) {
  getPlayer().stop();
  phaseIndex += 1;
  index = phases[phaseIndex].from;
  countdown = null;
  deadline = Date.now() + phases[phaseIndex].seconds * 1000;
  switched = reason;
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
  // Tải trước cả đơn vị KẾ TIẾP: băng tự sang câu sau thì phát liền, không khựng chờ tải.
  getPlayer().preload([...audioSources(unit), ...audioSources(units[index + 1])]).catch(() => {});
  const current = phaseUnits();
  const wait = countdown ? { kind: countdown.kind, seconds: Math.max(0, Math.ceil((countdown.until - Date.now()) / 1000)) } : null;

  const view = {
    units, index, phases, phaseIndex, numbers, answers, flags, showPalette, confirming,
    listening: inListening(),
    partStart: startsPart(index),
    countdown: wait,
    // Băng đứng mà không còn gì để phát (tải lại trang sau khi đã nghe, hoặc lỗi phát): cho tự bấm đi tiếp.
    stuck: inListening() && !playing && !countdown && (heard[unit.id] > 0 || Boolean(playError)),
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
      countdown: wait,
      flags: isReadingUnit(unit) ? flags : null,
      toggleFlag: (id) => { flags = { ...flags, [id]: !flags[id] }; saveExamState(); store.refresh(); },
      pick: (id, letter) => { answers = { ...answers, [id]: letter }; confirming = false; saveExamState(); store.refresh(); },
      play: () => play(store, unit),
    },
    onTogglePalette: () => { showPalette = !showPalette; store.refresh(); },
    onGo: (step) => go(store, step),
    onJump: (at) => { index = at; saveExamState(); store.refresh(); },
    onResume: () => { getPlayer().unlock(); advance(store); },
    onAskSubmit: () => { confirming = true; store.refresh(); },
    onCancel: () => { confirming = false; store.refresh(); },
    onSubmit: () => submit(store, false),
  };

  const screen = renderRunning(view);
  if (switched) screen.prepend(phaseNotice(phases[phaseIndex], switched));
  return screen;
}

function go(store, step) {
  getPlayer().stop();
  const { from, to } = phases[phaseIndex];
  index = Math.min(to - 1, Math.max(from, index + step));
  countdown = null;
  switched = null;
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
  countdown = null;
  playError = null;
  playing = true;
  switched = null;
  store.refresh();
  try {
    const steps = unit.part === 'part2' ? clipSequence(unit.item) : turnSequence(unit.item);
    // Tốc độ LUÔN 1× như băng thật — tốc độ chậm chọn ở màn luyện nghe không mang sang phòng thi.
    const outcome = await getPlayer().play(steps, {
      onStep: (step) => {
        if (step.type === 'clip') {
          currentClip = step.key;
        } else if (step.type === 'done') {
          currentClip = null;
        }
        store.refresh();
      }
    });
    if (outcome === 'done' && phase === 'running' && units[index] === unit) {
      heard = { ...heard, [unit.id]: (heard[unit.id] ?? 0) + 1 };
      // Như băng đề thật: nghe xong là khoảng lặng để chọn, rồi tự sang câu sau — câu cuối thì hết phần Nghe.
      countdown = {
        until: Date.now() + targetFor(Number(unit.part.slice(4)), unit.questions.length) * 1000,
        kind: index < phases[phaseIndex].to - 1 ? 'next' : 'end',
      };
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

/**
 * Băng tới đơn vị hiện tại (D67): mở đầu một Part thì chờ DIRECTIONS_SECONDS như lúc băng đọc hướng dẫn
 * (đủ lướt trước câu hỏi bộ đầu), còn lại phát ngay. Đơn vị đã nghe rồi thì thôi — đề thật phát một lần.
 */
function cue(store) {
  const unit = units[index];
  if (!isAudioUnit(unit) || heard[unit.id] > 0) return;
  if (!startsPart(index)) { play(store, unit); return; }
  countdown = { until: Date.now() + DIRECTIONS_SECONDS * 1000, kind: 'play' };
  store.refresh();
}

/** Băng chạy tiếp (M21, D67): sang đơn vị kế và phát; hết đơn vị cuối là hết phần Nghe — sang phần Đọc hoặc nộp. */
function advance(store) {
  countdown = null;
  if (index < phases[phaseIndex].to - 1) { go(store, 1); cue(store); return; }
  if (phaseIndex < phases.length - 1) nextPhase(store, 'tape');
  else submit(store, false);
}

/** Nộp bài. */
async function submit(store, timedOut) {
  if (phase !== 'running') return;
  phase = 'result';
  countdown = null;
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
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    if (!inListening()) go(store, event.key === 'ArrowRight' ? 1 : -1);   // phần Nghe: băng quyết định nhịp
    return;
  }
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
  switched = null;
  showPalette = false;
  playing = false;
  playError = null;
  heard = {};
  flags = {};
  countdown = null;
  currentClip = null;
  activePart = null;
  index = 0;
}

export function resetExam() {
  slot.dispose();
  reset();
  document.body.classList.remove('exam-focus');
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
