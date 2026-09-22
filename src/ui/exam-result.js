/**
 * Màn kết quả thi thử: ĐIỂM ƯỚC LƯỢNG (D39), số câu đúng theo phần, thời gian, và xem lại câu sai.
 */
import { el } from './dom.js';
import { backButton } from './blocks.js';
import { PART_LABEL } from '../logic/sets.js';
import { formatClock, SKILL_LABEL } from '../logic/exam-time.js';
import { GOAL_SCORE, formatBand } from '../logic/score.js';
import { describeQuestion } from './exam-unit.js';

export function renderResult(result, onAgain, { activePart, onPartChange } = {}) {
  const { score, estimate, seconds, timedOut } = result;
  const percent = score.total === 0 ? 0 : Math.round((score.correct / score.total) * 100);

  const partRows = Object.entries(score.byPart).map(([part, x]) => el('div', { class: 'gap-row' }, [
    el('span', { text: PART_LABEL[Number(part.slice(4))] }),
    el('span', { class: 'gap-value plain', text: `${x.correct}/${x.total}${x.answered < x.total ? ` (bỏ ${x.total - x.answered})` : ''} · ${x.total === 0 ? 0 : Math.round((x.correct / x.total) * 100)}%` }),
  ]));

  return el('div', {}, [
    el('h1', { text: 'Kết quả' }),
    renderScore(estimate, { score, percent, seconds, timedOut }),
    el('div', { class: 'gaps' }, [el('div', { class: 'gaps-title', text: 'Theo từng phần' }), ...partRows]),
    renderWrong(score, activePart, onPartChange),
    el('button', { class: 'primary', onClick: onAgain }, [el('span', { text: 'Làm đề khác' })]),
    backButton('exams'),
  ]);
}

function renderScore(estimate, { score, percent, seconds, timedOut }) {
  const blocks = [];
  if (estimate?.complete) {
    blocks.push(el('div', { class: 'hero' }, [
      el('span', { class: 'hero-value', text: String(estimate.total.point) }),
      el('span', { class: 'hero-label', text: ' điểm ước lượng / 990' }),
      el('div', { class: 'hero-sub', text: `khoảng ${formatBand(estimate.total)} · ${goalNote(estimate.goalGap)}` }),
    ]));
  } else if (estimate?.sections.length === 1) {
    const only = estimate.sections[0];
    blocks.push(el('div', { class: 'hero' }, [
      el('span', { class: 'hero-value', text: String(only.point) }),
      el('span', { class: 'hero-label', text: ` điểm ước lượng phần ${SKILL_LABEL[only.skill]} / 495` }),
      el('div', { class: 'hero-sub', text: `khoảng ${formatBand(only)} · chưa làm phần ${SKILL_LABEL[only.skill === 'reading' ? 'listening' : 'reading']} nên chưa có điểm tổng` }),
    ]));
  }
  for (const section of estimate?.sections ?? []) {
    blocks.push(el('div', { class: 'gap-row' }, [
      el('span', { text: `Phần ${SKILL_LABEL[section.skill]}` }),
      el('span', { class: 'gap-value plain', text: `${section.point} điểm (${formatBand(section)}) · ${section.correct}/${section.total} câu` }),
    ]));
  }
  if (timedOut) blocks.push(el('div', { class: 'warn', text: 'Hết giờ — bài được nộp tự động.' }));
  blocks.push(el('div', { class: 'hero-sub', text: `${score.correct}/${score.total} câu đúng (${percent}%) · dùng ${formatClock(seconds)} · trả lời ${score.answered}/${score.total} câu` }));
  blocks.push(el('p', { class: 'footnote left', text: caveat(estimate) }));
  return el('div', { class: 'panel' }, blocks);
}

const goalNote = (gap) => (gap > 0 ? `còn ${gap} điểm nữa tới mục tiêu ${GOAL_SCORE}` : `đã vượt mục tiêu ${GOAL_SCORE} ${Math.abs(gap)} điểm`);
function caveat(estimate) {
  const projected = (estimate?.sections ?? []).filter((s) => s.projected);
  const base = 'Đây là điểm ƯỚC LƯỢNG, không phải điểm thi thật: câu hỏi do AI ra nên độ khó chưa hiệu chuẩn, và bảng quy đổi của ETS đổi theo từng đề. Hãy nhìn KHOẢNG điểm và xu hướng qua nhiều lần, đừng bám vào một con số.';
  if (projected.length === 0) return base;
  const list = projected.map((s) => `${SKILL_LABEL[s.skill]} ${s.total} câu`).join(', ');
  return `${base} Lần này suy ra từ ít câu hơn đề thật (${list}) nên khoảng điểm càng rộng.`;
}

/** Các câu sai / bỏ trống, chia thành các tab theo Part. */
function renderWrong(score, activePart, onPartChange) {
  if (score.wrong.length === 0) return el('p', { class: 'empty', text: 'Đúng hết mọi câu.' });
  const byPart = {};
  for (const item of score.wrong) {
    const part = item.part;
    if (!byPart[part]) byPart[part] = [];
    byPart[part].push(item);
  }
  const parts = Object.keys(byPart).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const currentPart = activePart || parts[0];
  const tabButtons = parts.map((part) => el('button', {
    class: `tab-btn ${currentPart === part ? 'active' : ''}`,
    text: `${PART_LABEL[Number(part.slice(4))]} (${byPart[part].length})`,
    onClick: () => onPartChange(part),
  }));
  const wrongs = byPart[currentPart] || [];
  const content = wrongs.map(({ part, question, picked }) => {
    const view = describeQuestion(question);
    return el('details', { class: 'wrong-item' }, [
      el('summary', { 
        class: 'wrong-item-head',
        text: `${PART_LABEL[Number(part.slice(4))]} · ${question.id}: ${picked ? (picked === question.answer ? 'Đúng' : 'Sai') : 'Bỏ trống'}`,
      }),
      el('div', { class: 'wrong-item-body' }, [
        el('div', { class: 'set-q-stem', text: view.stem }),
        el('div', { class: 'options-review' }, view.letters.map((l) => el('div', {
          class: l === question.answer ? 'rev correct' : l === picked ? 'rev wrong' : 'rev',
          text: `${l}. ${view.options[l]}${l === question.answer ? '  ✓ đáp án đúng' : l === picked ? '  ✗ bạn chọn' : ''}`,
        }))),
        picked ? '' : el('div', { class: 'warn', text: 'Bạn chưa trả lời câu này.' }),
        el('div', { class: 'analysis-box' }, [
          el('div', { class: 'analysis-label', text: 'Giải thích' }),
          el('div', { class: 'analysis-text', text: question.explanation }),
          question.trap ? [
            el('div', { class: 'analysis-label', text: 'Bẫy thường gặp' }),
            el('div', { class: 'analysis-text trap', text: question.trap }),
          ] : [],
        ]),
      ]),
    ]);
  });
  return el('div', { class: 'wrong-review' }, [
    el('h2', { text: `Xem lại ${score.wrong.length} câu sai hoặc bỏ trống` }),
    el('div', { class: 'tab-group' }, tabButtons),
    el('div', { class: 'viz-table wrong-list' }, content),
  ]);
}
