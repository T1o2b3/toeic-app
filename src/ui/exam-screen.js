/**
 * Thi thử (M15): chọn chế độ → làm bài có tính giờ, không xem đáp án → nộp → kết quả + xem lại câu sai.
 *
 * Chỉ ghi vào nhật ký KHI NỘP (một lần, gói gọn): `question.answered` cho mỗi câu đã trả lời (thêm mode: 'exam')
 * và một `exam.finished` tóm tắt. Vì vậy thoát giữa chừng thì mất bài — làm dở rồi tiếp trên máy khác là M16.
 * KHÔNG quy đổi ra điểm 10–990 (xem logic/exam.js và D36/D38).
 */
import { el, goTo } from './dom.js';
import {
  buildExamForm, formUnits, timeLimitSeconds, scoreExam, formatClock, examSummaryPayload,
} from '../logic/exam.js';
import { PART_LABEL } from '../logic/sets.js';
import { clipSequence, turnSequence, audioUrl } from '../logic/listen.js';
import { getListenSpeed } from '../data/prefs.js';
import { createEvent } from '../logic/events.js';
import { createPlayer } from './audio-player.js';
import { renderUnit } from './exam-unit.js';
import { renderResult } from './exam-result.js';
import { renderSetup } from './exam-setup.js';

const LETTERS = ['A', 'B', 'C', 'D'];

// Trạng thái của bài thi đang làm (chỉ trong bộ nhớ).
let phase = 'setup';         // 'setup' | 'running' | 'result'
let form = null;
let units = [];
let index = 0;               // đơn vị đang làm
let answers = {};
let deadline = 0;
let startedAt = 0;
let timer = null;
let confirming = false;      // đang hỏi "còn câu chưa trả lời, nộp?"
let showPalette = false;
let result = null;           // {score, seconds, timedOut}
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
  if (phase === 'running') return renderRunning(store);
  if (phase === 'result') return renderResult(result, () => { reset(); store.refresh(); });
  return renderSetup(banksOf(store), (mode) => start(store, mode));
}

/** Bắt đầu một bài thi. */
function start(store, mode) {
  form = buildExamForm(banksOf(store), mode);
  units = formUnits(form);
  if (units.length === 0) return;
  answers = {};
  index = 0;
  heard = {};
  confirming = false;
  showPalette = false;
  result = null;
  phase = 'running';
  startedAt = Date.now();
  deadline = startedAt + timeLimitSeconds(form) * 1000;
  timer = setInterval(() => tick(store), 1000);
  store.refresh();
}

/** Mỗi giây: cập nhật đồng hồ tại chỗ (không vẽ lại cả màn) và tự nộp khi hết giờ. */
function tick(store) {
  const remaining = Math.ceil((deadline - Date.now()) / 1000);
  const clock = document.querySelector('.exam-clock');
  if (clock) {
    clock.textContent = formatClock(remaining);
    clock.classList.toggle('low', remaining <= 300);
  }
  if (remaining <= 0) submit(store, true);
}

const unitQuestionCount = (u) => u.questions.length;
const answeredCount = () => units.reduce((n, u) => n + u.questions.filter((q) => answers[q.id]).length, 0);
const totalCount = () => units.reduce((n, u) => n + unitQuestionCount(u), 0);

/** Số thứ tự câu đầu tiên của đơn vị (để hiện "Câu 12–14"). */
function firstNumber(at) {
  return units.slice(0, at).reduce((n, u) => n + unitQuestionCount(u), 0) + 1;
}

function renderRunning(store) {
  const unit = units[index];
  getPlayer().preload(audioSources(unit)).catch(() => {});
  const first = firstNumber(index);
  const last = first + unitQuestionCount(unit) - 1;
  const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

  const ctx = {
    answers, playing, heard: heard[unit.id] ?? 0, error: playError,
    pick: (id, letter) => { answers = { ...answers, [id]: letter }; confirming = false; store.refresh(); },
    play: () => play(store, unit),
  };

  const children = [
    el('div', { class: 'exam-bar' }, [
      el('span', { class: remaining <= 300 ? 'exam-clock low' : 'exam-clock', text: formatClock(remaining) }),
      el('span', { class: 'progress', text: `${PART_LABEL[Number(unit.part.slice(4))]} · câu ${first === last ? first : `${first}–${last}`}/${totalCount()}` }),
      el('button', { class: 'link', text: showPalette ? 'Ẩn danh sách' : 'Danh sách câu', onClick: () => { showPalette = !showPalette; store.refresh(); } }),
    ]),
    showPalette ? renderPalette(store) : '',
    renderUnit(unit, ctx),
    el('div', { class: 'exam-nav' }, [
      el('button', { class: 'secondary', disabled: index === 0 ? 'disabled' : false, onClick: () => go(store, -1) }, [el('span', { text: '← Trước' })]),
      index < units.length - 1
        ? el('button', { class: 'primary', onClick: () => go(store, 1) }, [el('span', { text: 'Tiếp →' })])
        : el('button', { class: 'primary', onClick: () => askSubmit(store) }, [el('span', { text: 'Nộp bài' })]),
    ]),
  ];
  if (confirming) children.push(renderConfirm(store));
  else if (index < units.length - 1) {
    children.push(el('div', { class: 'actions' }, [
      el('button', { class: 'link', text: 'Nộp bài sớm', onClick: () => askSubmit(store) }),
    ]));
  }
  return el('div', {}, children);
}

/** Lưới các đơn vị: đã trả lời hết / dở dang / chưa làm, bấm để nhảy tới. */
function renderPalette(store) {
  return el('div', { class: 'palette' }, units.map((u, i) => {
    const done = u.questions.filter((q) => answers[q.id]).length;
    const state = done === 0 ? '' : done === u.questions.length ? ' done' : ' part';
    const first = firstNumber(i);
    return el('button', {
      class: `pal${state}${i === index ? ' current' : ''}`,
      title: `${PART_LABEL[Number(u.part.slice(4))]}: ${done}/${u.questions.length} câu`,
      text: u.questions.length > 1 ? `${first}–${first + u.questions.length - 1}` : String(first),
      onClick: () => { index = i; store.refresh(); },
    });
  }));
}

/** Hộp xác nhận nộp bài, nói rõ còn bao nhiêu câu chưa trả lời. */
function renderConfirm(store) {
  const left = totalCount() - answeredCount();
  return el('div', { class: 'card confirm' }, [
    el('p', { text: left > 0 ? `Còn ${left} câu chưa trả lời. Nộp bài bây giờ?` : 'Đã trả lời hết. Nộp bài?' }),
    el('div', { class: 'exam-nav' }, [
      el('button', { class: 'secondary', onClick: () => { confirming = false; store.refresh(); } }, [el('span', { text: 'Làm tiếp' })]),
      el('button', { class: 'primary', onClick: () => submit(store, false) }, [el('span', { text: 'Nộp bài' })]),
    ]),
  ]);
}

const askSubmit = (store) => { confirming = true; store.refresh(); };

function go(store, step) {
  getPlayer().stop();
  index = Math.min(units.length - 1, Math.max(0, index + step));
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

/** Nộp bài: chấm, ghi nhật ký MỘT lần, chuyển sang màn kết quả. */
async function submit(store, timedOut) {
  if (phase !== 'running') return; // hết giờ và bấm nộp cùng lúc: chỉ nộp một lần
  phase = 'result';
  clearInterval(timer);
  timer = null;
  getPlayer().stop();

  const seconds = Math.round((Math.min(Date.now(), deadline) - startedAt) / 1000);
  const score = scoreExam(form, answers);
  result = { score, seconds, timedOut, mode: form.mode };
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
  events.push(createEvent({ type: 'exam.finished', deviceId: store.deviceId, payload: examSummaryPayload(score, { mode: form.mode, seconds, timedOut }) }));
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
  answers = {};
  result = null;
  confirming = false;
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
