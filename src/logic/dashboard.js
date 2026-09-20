/**
 * Số liệu cho màn Tổng quan (dashboard). Hàm thuần: nhận nhật ký sự kiện + trạng thái, trả số liệu.
 * Mọi con số tính lại được từ nhật ký (D23) nên không lưu riêng thứ gì.
 *
 * Ngày tính theo GIỜ ĐỊA PHƯƠNG của máy (học lúc 23h30 vẫn tính là hôm nay), không phải UTC.
 */
import { LEVEL_ORDER } from './vocab-levels.js';
import { reduceVocabState } from './vocab-state.js';
import { accuracyByErrorType } from './quiz.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Mục tiêu học mỗi tuần (phút): giữa khoảng 1–2 giờ/tuần của Huy (CLAUDE.md). */
export const WEEKLY_GOAL_MINUTES = 90;

/** Thẻ có lần ôn kế tiếp cách từ bằng này ngày trở lên coi là "nhớ vững" (ngưỡng thẻ trưởng thành của Anki). */
export const MATURE_DAYS = 21;

/**
 * Khoá ngày dạng YYYY-MM-DD theo giờ địa phương.
 * @param {number|Date} when
 * @returns {string}
 */
export function dayKey(when) {
  const d = new Date(when);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Mốc 0 giờ (địa phương) của một ngày cách hôm nay `back` ngày.
 * Dựng bằng Date(y, m, d - back) thay vì trừ mili giây: ngày đổi giờ mùa hè dài 23/25 tiếng.
 */
function startOfDay(now, back = 0) {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime();
}

/** Tiền tố id → phần thi. Câu trong bộ (Part 3/4/6/7) có id dạng p3-0001-2 nên vẫn khớp tiền tố. */
const PART_PREFIX = Object.freeze({
  'l2-': 'part2', 'p3-': 'part3', 'p4-': 'part4', 'p5-': 'part5', 'p6-': 'part6', 'p7-': 'part7',
});

/** Phần thi → kỹ năng. TOEIC Listening = Part 1–4, Reading = Part 5–7. */
export const SKILL_OF_PART = Object.freeze({
  part2: 'listening', part3: 'listening', part4: 'listening', part5: 'reading', part6: 'reading', part7: 'reading',
});

/**
 * Câu hỏi này thuộc phần thi nào, suy từ tiền tố id.
 * @param {unknown} questionId
 * @returns {'part2'|'part3'|'part4'|'part5'|'part6'|'part7'|'other'}
 */
export function partOfQuestion(questionId) {
  const id = String(questionId ?? '');
  const prefix = Object.keys(PART_PREFIX).find((p) => id.startsWith(p));
  return prefix ? PART_PREFIX[prefix] : 'other';
}

/**
 * Câu hỏi này thuộc kỹ năng nào (nghe hay đọc).
 * @param {unknown} questionId
 * @returns {'listening'|'reading'|'other'}
 */
export function skillOfQuestion(questionId) {
  return SKILL_OF_PART[partOfQuestion(questionId)] ?? 'other';
}

/** `which` là một kỹ năng ('reading'|'listening') hay một phần cụ thể ('part5'...)? Trả về hàm khớp id câu hỏi. */
function matcherFor(which) {
  return which === 'reading' || which === 'listening'
    ? (id) => skillOfQuestion(id) === which
    : (id) => partOfQuestion(id) === which;
}

/** Các loại sự kiện tính là "một việc học từ vựng". */
const VOCAB_EVENTS = new Set(['vocab.reviewed', 'vocab.triaged']);

/**
 * Số việc đã làm mỗi ngày trong `days` ngày gần nhất, cũ → mới (ngày cuối là hôm nay).
 * Hôm nay và các ngày trống vẫn có mặt (số 0) để biểu đồ có đủ cột, không dồn ngày.
 * @param {Array<{type: string, ts: number, payload: object}>} events
 * @param {{now?: number, days?: number}} [options]
 * @returns {Array<{day: string, ts: number, vocab: number, reading: number, listening: number, total: number}>}
 */
export function activityByDay(events, { now = Date.now(), days = 14 } = {}) {
  const buckets = new Map();
  const list = [];
  for (let back = days - 1; back >= 0; back -= 1) {
    const ts = startOfDay(now, back);
    const bucket = { day: dayKey(ts), ts, vocab: 0, reading: 0, listening: 0, total: 0 };
    buckets.set(bucket.day, bucket);
    list.push(bucket);
  }

  for (const event of events ?? []) {
    const bucket = buckets.get(dayKey(event.ts));
    if (!bucket) continue;
    if (VOCAB_EVENTS.has(event.type)) bucket.vocab += 1;
    else if (event.type === 'question.answered') {
      const skill = skillOfQuestion(event.payload?.questionId);
      if (skill !== 'other') bucket[skill] += 1;
      else continue;
    } else continue;
    bucket.total += 1;
  }
  return list;
}

/**
 * Số ngày liên tiếp có học, tính tới hôm nay. Hôm nay chưa học thì chuỗi vẫn còn nếu hôm qua có học
 * (chưa "đứt" — người học vẫn còn cả ngày hôm nay).
 * @param {Array<object>} events
 * @param {number} [now]
 * @returns {number}
 */
export function studyStreak(events, now = Date.now()) {
  const days = new Set();
  for (const event of events ?? []) {
    if (VOCAB_EVENTS.has(event.type) || (event.type === 'question.answered' && skillOfQuestion(event.payload?.questionId) !== 'other')) {
      days.add(dayKey(event.ts));
    }
  }
  let back = days.has(dayKey(now)) ? 0 : 1;
  let streak = 0;
  while (days.has(dayKey(startOfDay(now, back)))) {
    streak += 1;
    back += 1;
  }
  return streak;
}

/**
 * Độ chính xác của một phần trong khoảng thời gian [from, to).
 * @returns {{attempts: number, correct: number, accuracy: number|null}} accuracy null khi chưa có câu nào
 */
function accuracyBetween(events, which, from, to) {
  const matches = matcherFor(which);
  let attempts = 0;
  let correct = 0;
  for (const event of events ?? []) {
    if (event.type !== 'question.answered' || !matches(event.payload?.questionId)) continue;
    if (event.ts < from || event.ts >= to) continue;
    attempts += 1;
    if (event.payload.correct === true) correct += 1;
  }
  return { attempts, correct, accuracy: attempts === 0 ? null : correct / attempts };
}

/**
 * Tổng quan một phần thi: toàn bộ, 7 ngày gần nhất, và 7 ngày trước đó để so xu hướng.
 * `delta` là chênh lệch điểm phần trăm (7 ngày này − 7 ngày trước), null nếu thiếu số liệu một trong hai bên.
 * @param {Array<object>} events
 * @param {'reading'|'listening'|'part2'|'part3'|'part4'|'part5'|'part6'|'part7'} which - một kỹ năng hoặc một phần cụ thể
 * @param {number} [now]
 */
export function examOverview(events, which, now = Date.now()) {
  const weekStart = startOfDay(now, 6);
  const prevStart = startOfDay(now, 13);
  const end = startOfDay(now, -1); // hết ngày hôm nay
  const all = accuracyBetween(events, which, 0, end);
  const recent = accuracyBetween(events, which, weekStart, end);
  const previous = accuracyBetween(events, which, prevStart, weekStart);
  const delta = recent.accuracy !== null && previous.accuracy !== null
    ? Math.round((recent.accuracy - previous.accuracy) * 100)
    : null;
  return { all, recent, previous, delta };
}

/**
 * Tiến độ từ vựng: mỗi từ thuộc đúng MỘT nhóm (tổng các nhóm = tổng số từ), xếp từ chưa biết → thành thạo.
 * @param {Array<object>} entries
 * @param {Map<string, object>} states
 * @returns {{total: number, triaged: number, segments: Array<{key: string, count: number, share: number}>, learning: number, mastered: number}}
 *   `triaged` = số từ đã phân loại; `share` của mỗi nhóm tính trên TỔNG số từ
 */
export function vocabProgress(entries, states) {
  const keys = ['untriaged', ...LEVEL_ORDER];
  const counts = Object.fromEntries(keys.map((key) => [key, 0]));
  let total = 0;
  for (const entry of entries) {
    if (entry.status === 'retired') continue;
    total += 1;
    const state = states.get(entry.id);
    counts[state?.triaged ? state.level : 'untriaged'] += 1;
  }
  const segments = keys.map((key) => ({ key, count: counts[key], share: total === 0 ? 0 : counts[key] / total }));
  return {
    total,
    triaged: total - counts.untriaged,
    segments,
    learning: counts.unknown + counts.context + counts.spelling,
    mastered: counts.fluent,
  };
}

/**
 * Các dạng câu làm yếu nhất, để chỉ ra chỗ cần vá. Chỉ tính dạng đã làm đủ `minAttempts` câu —
 * 1 câu sai trên 1 câu làm không phải là "lỗ hổng".
 * @param {Array<object>} questions
 * @param {Map<string, object>} quizStates
 * @param {{minAttempts?: number, limit?: number}} [options]
 * @returns {Array<{errorType: string, attempts: number, wrong: number, accuracy: number}>} yếu nhất trước
 */
export function weakestTypes(questions, quizStates, { minAttempts = 3, limit = 4 } = {}) {
  return accuracyByErrorType(questions, quizStates)
    .filter((row) => row.attempts >= minAttempts)
    .slice(0, limit);
}

/** Giây ước tính cho mỗi việc, khớp nhịp thực tế đã dùng ở today.js / màn phân loại. */
export const STUDY_SECONDS = Object.freeze({
  'vocab.reviewed': 10, 'vocab.triaged': 4,
  part2: 35,                                  // nghe câu hỏi + 3 câu đáp + chọn
  part3: 45, part4: 45,                       // phần chia đều cho 3 câu của một đoạn hội thoại/bài nói
  part5: 25, part6: 45, part7: 60,            // đọc đoạn dài mất nhiều thời gian hơn
});

/**
 * Số phút học ƯỚC TÍNH trong `days` ngày gần nhất (tính cả hôm nay). Nhật ký chỉ ghi việc đã làm chứ không
 * ghi giờ bắt đầu/kết thúc, nên đây là ước tính từ số việc × thời gian trung bình mỗi việc — đủ để so với
 * mục tiêu tuần, KHÔNG phải đồng hồ bấm giờ.
 * @param {Array<{type: string, ts: number, payload: object}>} events
 * @param {{now?: number, days?: number}} [options]
 * @returns {number} phút, làm tròn
 */
export function estimateStudyMinutes(events, { now = Date.now(), days = 7 } = {}) {
  const from = startOfDay(now, days - 1);
  const end = startOfDay(now, -1);
  let seconds = 0;
  for (const event of events ?? []) {
    if (event.ts < from || event.ts >= end) continue;
    if (VOCAB_EVENTS.has(event.type)) seconds += STUDY_SECONDS[event.type];
    else if (event.type === 'question.answered') {
      const part = partOfQuestion(event.payload?.questionId);
      if (part !== 'other') seconds += STUDY_SECONDS[part];
    }
  }
  return Math.round(seconds / 60);
}

/**
 * Số từ "nhớ vững": lần ôn kế tiếp cách từ MATURE_DAYS ngày trở lên. Khó "tự khen" hơn mức "thành thạo"
 * tự chấm ở màn phân loại, vì phải qua nhiều lần ôn đúng liên tiếp mới đạt khoảng cách dài như vậy.
 * @param {Map<string, object>} states
 * @returns {number}
 */
export function matureWords(states) {
  let count = 0;
  for (const state of states.values()) {
    if (!state.known && (state.card?.scheduled_days ?? 0) >= MATURE_DAYS) count += 1;
  }
  return count;
}

/**
 * Số từ nhớ vững bây giờ và cách đây 7 ngày (dựng lại trạng thái từ nhật ký tới thời điểm đó — nhật ký là
 * nguồn sự thật nên tính lùi được, không cần lưu lịch sử riêng).
 * @param {Array<object>} events
 * @param {Map<string, object>} statesNow
 * @param {number} [now]
 * @returns {{now: number, weekAgo: number, delta: number}}
 */
export function matureTrend(events, statesNow, now = Date.now()) {
  const then = now - 7 * DAY_MS;
  const past = reduceVocabState((events ?? []).filter((e) => e.ts <= then), { now: new Date(then) });
  const current = matureWords(statesNow);
  const before = matureWords(past);
  return { now: current, weekAgo: before, delta: current - before };
}

/**
 * Độ chính xác gộp hai kỹ năng Đọc + Nghe (mọi Part): 7 ngày gần nhất và 7 ngày trước đó.
 * @param {Array<object>} events
 * @param {number} [now]
 * @returns {{recent: {attempts: number, correct: number, accuracy: number|null}, previous: {attempts: number, correct: number, accuracy: number|null}, delta: number|null}}
 */
export function combinedExam(events, now = Date.now()) {
  const parts = ['reading', 'listening'].map((skill) => examOverview(events, skill, now));
  const merge = (key) => {
    const attempts = parts.reduce((sum, p) => sum + p[key].attempts, 0);
    const correct = parts.reduce((sum, p) => sum + p[key].correct, 0);
    return { attempts, correct, accuracy: attempts === 0 ? null : correct / attempts };
  };
  const recent = merge('recent');
  const previous = merge('previous');
  const delta = recent.accuracy !== null && previous.accuracy !== null
    ? Math.round((recent.accuracy - previous.accuracy) * 100)
    : null;
  return { recent, previous, delta };
}
