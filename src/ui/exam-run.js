/**
 * Phần HIỂN THỊ của màn làm bài thi thử: thanh trên (đồng hồ, số hiệu câu), danh sách câu, khối chuyển phần,
 * hộp xác nhận nộp. Tách khỏi exam-screen.js (file đó giữ trạng thái và các thao tác) cho dưới 300 dòng.
 *
 * Mọi thứ ở đây là hàm thuần theo nghĩa: chỉ đọc `view` và gọi `view.on*` — không tự giữ trạng thái.
 */
import { el } from './dom.js';
import { PART_LABEL } from '../logic/sets.js';
import { formatClock } from '../logic/exam-time.js';
import { renderUnit } from './exam-unit.js';
import { confirmCard, noticeCard } from './blocks.js';

/** "câu 101" hoặc "câu 131–134". */
function unitRange(unit, numbers) {
  const list = unit.questions.map((q) => numbers.get(q.id)).filter((n) => Number.isInteger(n));
  if (list.length === 0) return '';
  const first = Math.min(...list);
  const last = Math.max(...list);
  return first === last ? `câu ${first}` : `câu ${first}–${last}`;
}

/**
 * Cả màn làm bài.
 * @param {object} view
 * @returns {HTMLElement}
 */
export function renderRunning(view) {
  const { units, index, phases, phaseIndex, numbers, remaining } = view;
  const unit = units[index];
  const phase = phases[phaseIndex];
  const many = phases.length > 1;

  const children = [
    el('div', { class: 'exam-bar' }, [
      el('span', { class: remaining <= 300 ? 'exam-clock low' : 'exam-clock', text: formatClock(remaining) }),
      el('span', { class: 'progress', text: `${many ? `${phase.label} · ` : ''}${PART_LABEL[Number(unit.part.slice(4))]} · ${unitRange(unit, numbers)}` }),
      el('button', { class: 'link', text: view.showPalette ? 'Ẩn danh sách' : 'Danh sách câu', onClick: view.onTogglePalette }),
    ]),
    view.showPalette ? renderPalette(view) : '',
    renderUnit(unit, view.unitCtx, numbers),
    renderNav(view),
  ];

  if (view.confirming) children.push(renderConfirm(view));
  else if (view.switching) children.push(renderSwitch(view));
  else if (!view.atLastUnitOfExam) {
    children.push(el('div', { class: 'actions' }, [
      el('button', { class: 'link', text: 'Nộp bài sớm', onClick: view.onAskSubmit }),
    ]));
  }
  return el('div', { class: 'exam-running' }, children);
}

/** Nút Trước / Tiếp. Ở câu cuối của một phần: sang phần sau (một chiều) hoặc nộp bài. */
function renderNav(view) {
  const { index, phases, phaseIndex } = view;
  const phase = phases[phaseIndex];
  const atPhaseEnd = index >= phase.to - 1;
  const lastPhase = phaseIndex >= phases.length - 1;

  let next;
  if (!atPhaseEnd) next = el('button', { class: 'primary', onClick: () => view.onGo(1) }, [el('span', { text: 'Tiếp →' })]);
  else if (!lastPhase) next = el('button', { class: 'primary', onClick: view.onAskSwitch }, [
    el('span', { text: `Xong ${phase.label.toLowerCase()} →` }),
    el('small', { text: `sang ${phases[phaseIndex + 1].label.toLowerCase()}` }),
  ]);
  else next = el('button', { class: 'primary', onClick: view.onAskSubmit }, [el('span', { text: 'Nộp bài' })]);

  return el('div', { class: 'exam-nav' }, [
    el('button', {
      class: 'secondary',
      disabled: index <= phase.from ? 'disabled' : false,
      onClick: () => view.onGo(-1),
    }, [el('span', { text: '← Trước' })]),
    next,
  ]);
}

/**
 * Lưới các đơn vị CỦA PHẦN ĐANG LÀM: đã trả lời hết / dở dang / chưa làm, bấm để nhảy tới.
 * Chỉ hiện phần hiện tại vì đề thật không cho quay lại phần trước.
 */
function renderPalette(view) {
  const { units, phases, phaseIndex, numbers, answers, index } = view;
  const phase = phases[phaseIndex];
  const cells = [];
  for (let i = phase.from; i < phase.to; i += 1) {
    const unit = units[i];
    const done = unit.questions.filter((q) => answers[q.id]).length;
    const state = done === 0 ? '' : done === unit.questions.length ? ' done' : ' part';
    const list = unit.questions.map((q) => numbers.get(q.id));
    cells.push(el('button', {
      class: `pal${state}${i === index ? ' current' : ''}`,
      title: `${PART_LABEL[Number(unit.part.slice(4))]}: ${done}/${unit.questions.length} câu`,
      text: list.length > 1 ? `${list[0]}–${list[list.length - 1]}` : String(list[0]),
      onClick: () => view.onJump(i),
    }));
  }
  return el('div', { class: 'palette' }, cells);
}

/** Hộp xác nhận nộp bài, nói rõ còn bao nhiêu câu chưa trả lời. */
function renderConfirm(view) {
  const left = view.totalCount - view.answeredCount;
  return confirmCard({
    message: left > 0 ? `Còn ${left} câu chưa trả lời. Nộp bài bây giờ?` : 'Đã trả lời hết. Nộp bài?',
    confirmLabel: 'Nộp bài', onConfirm: view.onSubmit, onCancel: view.onCancel,
  });
}

/** Xác nhận chuyển phần: đề thật KHÔNG cho quay lại phần trước, nên phải hỏi. */
function renderSwitch(view) {
  const { phases, phaseIndex } = view;
  const current = phases[phaseIndex];
  const next = phases[phaseIndex + 1];
  const left = view.phaseTotal - view.phaseAnswered;
  return confirmCard({
    message: `Sang ${next.label.toLowerCase()} (${Math.round(next.seconds / 60)} phút)? Như đề thật, sang rồi thì KHÔNG quay lại ${current.label.toLowerCase()} được nữa.`,
    warn: left > 0 ? `${current.label} còn ${left} câu chưa trả lời.` : undefined,
    confirmLabel: `Sang ${next.label.toLowerCase()}`, onConfirm: view.onSwitch, onCancel: view.onCancel,
  });
}

/** Báo đã hết giờ một phần và tự chuyển sang phần sau. */
export function phaseNotice(phase) {
  return el('div', { class: 'card notice' }, [
    el('div', { class: 'gaps-title', text: 'Hết giờ phần trước' }),
    el('p', { text: `Đã sang ${phase.label.toLowerCase()} — ${Math.round(phase.seconds / 60)} phút. Không quay lại phần trước được, đúng như đề thật.` }),
  ]);
}
