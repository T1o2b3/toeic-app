/**
 * Màn kết quả thi thử: tổng, từng phần, thời gian, và xem lại câu sai (đáp án + giải thích).
 * Tách khỏi exam-screen.js cho gọn; nhận hành động qua tham số để không phụ thuộc trạng thái của màn làm bài.
 */
import { el, goTo } from './dom.js';
import { PART_LABEL } from '../logic/sets.js';
import { formatClock } from '../logic/exam.js';
import { describeQuestion } from './exam-unit.js';

export function renderResult(result, onAgain) {
  const { score, seconds, timedOut } = result;
  const percent = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);

  const partRows = Object.entries(score.byPart).map(([part, x]) => el('div', { class: 'gap-row' }, [
    el('span', { text: PART_LABEL[Number(part.slice(4))] }),
    el('span', { class: 'gap-value', text: `${x.correct}/${x.total}${x.answered < x.total ? ` (bỏ ${x.total - x.answered})` : ''} · ${x.total === 0 ? 0 : Math.round((x.correct / x.total) * 100)}%` }),
  ]));

  return el('div', {}, [
    el('h1', { text: 'Kết quả' }),
    el('div', { class: 'panel' }, [
      el('div', { class: 'hero' }, [
        el('span', { class: 'hero-value', text: `${score.correct}` }),
        el('span', { class: 'hero-label', text: ` / ${score.total} câu đúng (${percent}%)` }),
        el('div', { class: 'hero-sub', text: `${timedOut ? 'Hết giờ · ' : ''}dùng ${formatClock(seconds)} · trả lời ${score.answered}/${score.total} câu` }),
      ]),
      ...(score.bySkill.listening.total > 0 ? [skillLine('Nghe', score.bySkill.listening)] : []),
      ...(score.bySkill.reading.total > 0 ? [skillLine('Đọc', score.bySkill.reading)] : []),
    ]),
    el('div', { class: 'gaps' }, [el('div', { class: 'gaps-title', text: 'Theo từng phần' }), ...partRows]),
    el('p', { class: 'footnote', text: 'Đây là số câu đúng, chưa phải điểm 10–990: bảng quy đổi thay đổi theo từng đề chuẩn hoá.' }),
    renderWrong(score),
    el('button', { class: 'primary', onClick: onAgain }, [el('span', { text: 'Làm đề khác' })]),
    el('button', { class: 'secondary', onClick: () => goTo('/exams') }, [el('span', { text: 'Về mục Bài thi' })]),
  ]);
}

const skillLine = (label, x) => el('div', { class: 'gap-row' }, [
  el('span', { text: label }),
  el('span', { class: 'gap-value', text: `${x.correct}/${x.total}` }),
]);

/** Các câu sai / bỏ trống, mỗi câu mở ra xem đề, đáp án bạn chọn, đáp án đúng và giải thích. */
function renderWrong(score) {
  if (score.wrong.length === 0) return el('p', { class: 'empty', text: 'Đúng hết mọi câu.' });
  return el('details', { class: 'viz-table wrong-list' }, [
    el('summary', { text: `Xem lại ${score.wrong.length} câu sai hoặc bỏ trống` }),
    ...score.wrong.map(({ part, question, picked }) => {
      const view = describeQuestion(question);
      return el('div', { class: 'wrong-item' }, [
        el('div', { class: 'gaps-title', text: `${PART_LABEL[Number(part.slice(4))]} · ${question.id}` }),
        el('div', { class: 'set-q-stem', text: view.stem }),
        ...view.letters.map((l) => el('div', {
          class: l === question.answer ? 'rev correct' : l === picked ? 'rev wrong' : 'rev',
          text: `${l}. ${view.options[l]}${l === question.answer ? '  ✓ đáp án đúng' : l === picked ? '  ✗ bạn chọn' : ''}`,
        })),
        picked ? '' : el('div', { class: 'warn', text: 'Bạn chưa trả lời câu này.' }),
        el('div', { class: 'note', text: question.explanation }),
      ]);
    }),
  ]);
}

