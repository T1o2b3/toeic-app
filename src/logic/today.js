/**
 * Lên kế hoạch phiên học ngắn "15 phút hôm nay" (D03).
 * Hàm thuần: nhận trạng thái, trả về số lượng từng loại việc vừa đúng quỹ thời gian.
 *
 * Nguyên tắc ưu tiên: việc đến hạn quan trọng hơn việc mới.
 * Quên một từ đã học tốn công hơn nhiều so với việc học chậm một từ mới.
 */
import { reviewQueue } from './vocab-state.js';
import { quizQueue } from './quiz.js';

/** Thời gian ước lượng cho mỗi loại việc, tính bằng giây. */
export const COST = Object.freeze({ vocabDue: 8, vocabNew: 20, quiz: 25 });

/** Tỉ lệ tối đa quỹ thời gian dành cho từ mới — để hàng đợi ôn không bị bỏ đói. */
const NEW_WORD_SHARE = 0.35;

/**
 * Lập kế hoạch cho phiên hôm nay.
 * @param {object} input
 * @param {Array<object>} input.entries - deck từ vựng
 * @param {Map<string, object>} input.states - trạng thái từ vựng
 * @param {Array<object>} input.questions - ngân hàng câu hỏi
 * @param {Map<string, object>} input.quizStates
 * @param {number} [input.minutes] - quỹ thời gian, mặc định 15
 * @param {Date} [input.now]
 * @returns {{vocabDue: number, vocabNew: number, quiz: number, seconds: number, empty: boolean}}
 */
export function planToday({ entries, states, questions, quizStates, minutes = 15, now = new Date() }) {
  let budget = minutes * 60;

  const queue = reviewQueue(entries, states, { now, maxNew: 9999, maxTotal: 9999 });
  const dueAvailable = queue.filter((item) => !item.isNew).length;
  const newAvailable = queue.filter((item) => item.isNew).length;
  const quizAvailable = quizQueue(questions ?? [], quizStates ?? new Map(), { size: 9999 }).length;

  // 1. Từ đến hạn trước, chiếm tối đa 60% quỹ để vẫn còn chỗ cho việc khác.
  const vocabDue = Math.min(dueAvailable, Math.floor((budget * 0.6) / COST.vocabDue));
  budget -= vocabDue * COST.vocabDue;

  // 2. Câu Part 5 đang sai hoặc chưa làm, tối đa 40% quỹ còn lại.
  const quiz = Math.min(quizAvailable, Math.floor((budget * 0.4) / COST.quiz));
  budget -= quiz * COST.quiz;

  // 3. Phần còn lại dành cho từ mới, có trần để không nhồi quá nhiều thứ mới một lúc.
  const newCap = Math.floor((minutes * 60 * NEW_WORD_SHARE) / COST.vocabNew);
  const vocabNew = Math.min(newAvailable, newCap, Math.floor(budget / COST.vocabNew));

  const seconds = vocabDue * COST.vocabDue + vocabNew * COST.vocabNew + quiz * COST.quiz;
  return { vocabDue, vocabNew, quiz, seconds, empty: vocabDue + vocabNew + quiz === 0 };
}

/**
 * Mô tả kế hoạch bằng tiếng Việt để hiện trên nút.
 * @param {{vocabDue: number, vocabNew: number, quiz: number, seconds: number}} plan
 * @returns {string}
 */
export function describePlan(plan) {
  const parts = [];
  if (plan.vocabDue > 0) parts.push(`${plan.vocabDue} từ ôn lại`);
  if (plan.vocabNew > 0) parts.push(`${plan.vocabNew} từ mới`);
  if (plan.quiz > 0) parts.push(`${plan.quiz} câu Part 5`);
  if (parts.length === 0) return 'Hôm nay không còn việc đến hạn';
  return `${parts.join(' · ')} · ~${Math.max(1, Math.round(plan.seconds / 60))} phút`;
}
