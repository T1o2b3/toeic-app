/**
 * Logic cho các bộ "tài liệu + nhiều câu hỏi" (Part 3, 4, 6, 7). Hàm thuần, không đụng DOM.
 *
 * Một bộ = một đoạn hội thoại / bài nói / đoạn văn cùng 2–5 câu hỏi. Trạng thái làm bài vẫn tính theo TỪNG CÂU
 * (khoá theo id câu, dạng p3-0001-2) bằng cùng sự kiện `question.answered` như Part 2 và Part 5.
 */
import { gradeAnswer } from './quiz.js';

export const SET_PARTS = Object.freeze([3, 4, 6, 7]);

/** Số bộ mỗi lượt luyện — bộ dài hơn một câu Part 5 rất nhiều nên lượt ngắn hơn. */
export const SET_ROUND_SIZE = Object.freeze({ 3: 3, 4: 3, 6: 2, 7: 2 });

/** Nhãn hiện cho người dùng. */
export const PART_LABEL = Object.freeze({
  2: 'Part 2 · Hỏi - đáp', 3: 'Part 3 · Hội thoại', 4: 'Part 4 · Bài nói',
  5: 'Part 5 · Điền câu', 6: 'Part 6 · Điền đoạn văn', 7: 'Part 7 · Đọc hiểu',
});

/** Thời gian ước tính một câu của từng phần (giây), khớp STUDY_SECONDS trong dashboard.js. */
const SECONDS_PER_QUESTION = Object.freeze({ 3: 45, 4: 45, 6: 45, 7: 60 });

/**
 * Trải mọi câu của các bộ thành danh sách phẳng, mỗi câu mang theo phần thi và id bộ.
 * Dùng cho thống kê theo dạng câu (accuracyByErrorType cần mỗi phần tử có `id` và `errorType`).
 * @param {Array<object>} sets
 * @returns {Array<object>}
 */
export function flattenQuestions(sets) {
  return (sets ?? []).flatMap((set) => set.questions.map((q) => ({ ...q, part: set.part, setId: set.id })));
}

/**
 * Gom mọi câu hỏi theo kỹ năng để tính lỗ hổng: Nghe = Part 2 + 3 + 4, Đọc = Part 5 + 6 + 7.
 * @param {{questions: object[], listening: object[], sets: Record<number, object[]>}} store
 * @returns {{reading: object[], listening: object[]}}
 */
export function questionsBySkill(store) {
  const sets = store.sets ?? {};
  return {
    reading: [...store.questions, ...flattenQuestions(sets[6]), ...flattenQuestions(sets[7])],
    listening: [...store.listening, ...flattenQuestions(sets[3]), ...flattenQuestions(sets[4])],
  };
}

/**
 * Tình trạng làm bài của một bộ, tổng hợp từ trạng thái từng câu.
 * @param {{questions: Array<{id: string}>}} set
 * @param {Map<string, object>} states
 * @returns {{seen: boolean, wrong: number, reported: boolean, lastTs: number}}
 */
export function setState(set, states) {
  let seen = false;
  let wrong = 0;
  let reported = false;
  let lastTs = 0;
  for (const question of set.questions) {
    const state = states.get(question.id);
    if (!state) continue;
    if (state.attempts > 0) seen = true;
    if (state.lastCorrect === false) wrong += 1;
    if (state.reported) reported = true;
    lastTs = Math.max(lastTs, state.lastTs ?? 0);
  }
  return { seen, wrong, reported, lastTs };
}

/**
 * Chọn các bộ cho một lượt: ưu tiên bộ có câu vừa làm sai (sai nhiều nhất trước), rồi tới bộ chưa làm bao giờ,
 * cuối cùng là bộ đã làm đúng (cũ nhất trước). Bộ đã báo lỗi thì loại hẳn.
 *
 * CẢNH BÁO: độ dài kết quả là CỬA SỔ TRƯỢT (cắt ở `size`), đừng lấy làm "số bộ còn lại" (quy tắc số 7).
 *
 * @param {Array<object>} sets
 * @param {Map<string, object>} states
 * @param {{size?: number, exclude?: Set<string>}} [options]
 * @returns {Array<object>}
 */
export function setQueue(sets, states, { size = 3, exclude } = {}) {
  const wrong = [];
  const unseen = [];
  const done = [];
  for (const set of sets ?? []) {
    if (set.status === 'retired' || exclude?.has(set.id)) continue;
    const info = setState(set, states);
    if (info.reported) continue;
    if (info.wrong > 0) wrong.push({ set, info });
    else if (!info.seen) unseen.push({ set, info });
    else done.push({ set, info });
  }
  wrong.sort((a, b) => b.info.wrong - a.info.wrong);
  done.sort((a, b) => a.info.lastTs - b.info.lastTs);
  return [...wrong, ...unseen, ...done].map((x) => x.set).slice(0, size);
}

/** Số bộ còn có thể làm (không bị cắt) — dùng cho bộ đếm ở màn chọn. */
export function countAvailableSets(sets, states) {
  return (sets ?? []).filter((set) => set.status !== 'retired' && !setState(set, states).reported).length;
}

/**
 * Chấm một câu trong bộ. Cùng hình dạng kết quả với Part 5 để ghi sự kiện giống nhau.
 * @param {{answer: string, errorType: string}} question
 * @param {string} choice
 */
export function gradeSetAnswer(question, choice) {
  return gradeAnswer(question, choice);
}

/**
 * Ước lượng thời gian (phút) cho `count` bộ của một phần.
 * @param {number} part
 * @param {Array<object>} sets
 * @returns {number}
 */
export function estimateSetMinutes(part, sets) {
  const questions = sets.reduce((sum, set) => sum + set.questions.length, 0);
  return Math.max(1, Math.round((questions * (SECONDS_PER_QUESTION[part] ?? 45)) / 60));
}

/**
 * Câu tiếp theo chưa trả lời trong bộ (cho phím tắt), hoặc null nếu đã trả lời hết.
 * @param {{questions: Array<{id: string}>}} set
 * @param {Record<string, string>} answers - id câu → chữ cái đã chọn
 * @returns {object|null}
 */
export function nextUnanswered(set, answers) {
  return set.questions.find((q) => !answers[q.id]) ?? null;
}
