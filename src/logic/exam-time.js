/**
 * Giờ giấc và số hiệu câu của một đề thi, theo ĐÚNG đề thật (D39). Hàm thuần, không đụng DOM.
 *
 * Tách khỏi exam.js vì file đó đã chạm hạn mức 300 dòng, và đây là một mối quan tâm riêng:
 * exam.js lo "đề gồm những câu nào", file này lo "làm trong bao lâu, câu mang số mấy".
 */
import { EXAM_SPEC } from './exam.js';

/** Thời gian mỗi kỹ năng ở đề thật (phút). */
export const SKILL_MINUTES = Object.freeze({ listening: 45, reading: 75 });


/**
 * Thời gian cho MỘT kỹ năng trong đề này (giây): tính theo tỉ lệ số câu so với đề đủ.
 * @param {ReturnType<typeof buildExamForm>} form
 * @param {string} skill
 * @returns {number}
 */
export function skillSeconds(form, skill) {
  const have = form.sections.filter((s) => s.skill === skill).reduce((n, s) => n + s.questionCount, 0);
  if (have === 0) return 0;
  const full = Object.values(EXAM_SPEC).filter((s) => s.skill === skill).reduce((n, s) => n + s.questions, 0);
  // Chặn ở 1: Part 7 có thể vượt 1 câu do bộ 2 câu, nhưng giờ làm bài không được dài hơn đề thật.
  return Math.round(SKILL_MINUTES[skill] * 60 * Math.min(1, have / full));
}

/** Tên kỹ năng, dùng chung cho mọi nơi (màn kết quả, mục Bài thi, tên phần trong bài thi). */
export const SKILL_LABEL = Object.freeze({ listening: 'Nghe', reading: 'Đọc' });

/**
 * Chia đề thành các PHẦN TÍNH GIỜ RIÊNG, đúng như đề thật: Nghe 45 phút, hết giờ mới sang Đọc 75 phút,
 * và KHÔNG quay lại phần trước (D39). Đề chỉ có một kỹ năng thì chỉ có một phần.
 *
 * `from`/`to` là chỉ số trong `formUnits(form)` — màn làm bài dùng để khoá điều hướng trong phần hiện tại.
 * @param {ReturnType<typeof buildExamForm>} form
 * @returns {Array<{skill: string, label: string, seconds: number, from: number, to: number, questionCount: number}>}
 */
export function examPhases(form) {
  const phases = [];
  let from = 0;
  for (const skill of ['listening', 'reading']) {
    const sections = form.sections.filter((s) => s.skill === skill);
    if (sections.length === 0) continue;
    const unitCount = sections.reduce((n, s) => n + s.units.length, 0);
    phases.push({
      skill, label: `Phần ${SKILL_LABEL[skill]}`, seconds: skillSeconds(form, skill),
      from, to: from + unitCount,
      questionCount: sections.reduce((n, s) => n + s.questionCount, 0),
    });
    from += unitCount;
  }
  return phases;
}

/**
 * Tổng thời gian của cả đề (giây) = cộng các phần. Dùng để hiện ở màn chọn chế độ.
 * @param {ReturnType<typeof buildExamForm>} form
 * @returns {number}
 */
export function timeLimitSeconds(form) {
  return examPhases(form).reduce((sum, phase) => sum + phase.seconds, 0);
}

/**
 * Số hiệu câu của từng phần trong ĐỀ THẬT. Part 1 (1–6) cần ảnh nên app không có; các phần còn lại
 * giữ nguyên số hiệu thật để quen mặt đề: Part 2 = 7–31, Part 3 = 32–70, Part 4 = 71–100,
 * Part 5 = 101–130, Part 6 = 131–146, Part 7 = 147–200.
 */
export const PART_FIRST_NUMBER = Object.freeze({
  part2: 7, part3: 32, part4: 71, part5: 101, part6: 131, part7: 147,
});

/**
 * Số hiệu thật cho mọi câu của đề: mỗi phần bắt đầu lại đúng số của đề thật, nên ngân hàng thiếu câu
 * ở phần trước cũng không làm lệch số hiệu của phần sau.
 * @param {ReturnType<typeof buildExamForm>} form
 * @returns {Map<string, number>} id câu → số hiệu
 */
export function numberQuestions(form) {
  const numbers = new Map();
  for (const section of form.sections) {
    let n = PART_FIRST_NUMBER[section.part];
    for (const unit of section.units) for (const question of unit.questions) numbers.set(question.id, n++);
  }
  return numbers;
}

/**
 * Đồng hồ mm:ss (hoặc h:mm:ss khi từ 1 giờ).
 * @param {number} seconds
 * @returns {string}
 */
export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

