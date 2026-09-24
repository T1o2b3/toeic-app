/**
 * Phần HIỂN THỊ của màn làm bài thi thử: thanh trên (đồng hồ, số hiệu câu), danh sách câu, hướng dẫn đầu Part,
 * nút đi tiếp, hộp xác nhận nộp. Tách khỏi exam-screen.js (file đó giữ trạng thái và các thao tác).
 *
 * Mọi thứ ở đây là hàm thuần theo nghĩa: chỉ đọc `view` và gọi `view.on*` — không tự giữ trạng thái.
 */
import { el } from './dom.js';
import { PART_LABEL } from '../logic/sets.js';
import { formatClock } from '../logic/exam-time.js';
import { PART_DIRECTIONS } from '../logic/exam-directions.js';
import { renderUnit, countdownText } from './exam-unit.js';
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
      el('button', { class: 'link', text: `${view.showPalette ? 'Ẩn danh sách' : 'Danh sách câu'} (${view.phaseAnswered}/${view.phaseTotal})`, onClick: view.onTogglePalette }),
    ]),
    view.showPalette ? renderPalette(view) : '',
    view.partStart ? renderDirections(unit.part, view.countdown) : '',
    renderUnit(unit, view.unitCtx, numbers),
    view.listening ? renderTapeNav(view) : renderNav(view),
  ];

  if (view.confirming) children.push(renderConfirm(view));
  else if (!view.atLastUnitOfExam) {
    children.push(el('div', { class: 'actions' }, [
      el('button', { class: 'link', text: 'Nộp bài sớm', onClick: view.onAskSubmit }),
    ]));
  }
  return el('div', { class: 'exam-running' }, children);
}

/**
 * Phần hướng dẫn ở đầu mỗi Part, như trang đề thật (D67). Đầu Part phần Nghe thì kèm đếm ngược tới lúc băng phát.
 * @param {string} part
 * @param {{kind: string, seconds: number}|null} countdown
 */
function renderDirections(part, countdown) {
  return el('div', { class: 'card directions', lang: 'en' }, [
    el('div', { class: 'gaps-title', text: `Part ${part.slice(4)} · Directions` }),
    el('p', { text: PART_DIRECTIONS[part] }),
    countdown?.kind === 'play' ? el('div', { class: 'countdown-note', lang: 'vi', text: countdownText('play', countdown.seconds) }) : '',
  ]);
}

/**
 * Phần Nghe không có nút Trước/Tiếp: băng quyết định nhịp (D67). Chỉ khi băng đứng mà không còn gì để phát
 * (tải lại trang sau khi đã nghe, hoặc lỗi phát) mới có nút đi tiếp — để không bao giờ kẹt.
 */
function renderTapeNav(view) {
  if (!view.stuck) {
    return el('p', { class: 'footnote', text: 'Băng tự chạy như đề thật: nghe xong có vài giây để chọn rồi tự sang câu sau, không quay lại câu trước.' });
  }
  const last = view.index >= view.phases[view.phaseIndex].to - 1;
  return el('div', { class: 'actions' }, [
    el('button', { class: 'primary', onClick: view.onResume }, [
      el('span', { text: last ? 'Hết phần Nghe →' : 'Tiếp tục →' }),
      el('small', { text: 'băng đang dừng — bấm để chạy tiếp' }),
    ]),
  ]);
}

/** Nút Trước / Tiếp của phần Đọc. Ở câu cuối: nộp bài. */
function renderNav(view) {
  const { index, phases, phaseIndex } = view;
  const phase = phases[phaseIndex];
  const next = index >= phase.to - 1
    ? el('button', { class: 'primary', onClick: view.onAskSubmit }, [el('span', { text: 'Nộp bài' })])
    : el('button', { class: 'primary', onClick: () => view.onGo(1) }, [el('span', { text: 'Tiếp →' })]);

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
 * Chỉ hiện phần hiện tại vì đề thật không cho quay lại phần trước. Phần Nghe chỉ để xem — băng quyết định nhịp.
 */
function renderPalette(view) {
  const { units, phases, phaseIndex, numbers, answers, index } = view;
  const phase = phases[phaseIndex];
  const cells = [];
  for (let i = phase.from; i < phase.to; i += 1) {
    const unit = units[i];
    const done = unit.questions.filter((q) => answers[q.id]).length;
    const state = done === 0 ? '' : done === unit.questions.length ? ' done' : ' part';
    const flagged = unit.questions.some((q) => view.flags[q.id]);
    const list = unit.questions.map((q) => numbers.get(q.id));
    cells.push(el('button', {
      class: `pal${state}${flagged ? ' flagged' : ''}${i === index ? ' current' : ''}`,
      title: `${PART_LABEL[Number(unit.part.slice(4))]}: ${done}/${unit.questions.length} câu${flagged ? ' · có câu đánh dấu' : ''}`,
      text: `${flagged ? '⚑ ' : ''}${list.length > 1 ? `${list[0]}–${list[list.length - 1]}` : String(list[0])}`,
      disabled: view.listening ? 'disabled' : false,
      onClick: () => view.onJump(i),
    }));
  }
  return el('div', { class: 'palette' }, cells);
}

/** Hộp xác nhận nộp bài, nói rõ còn bao nhiêu câu chưa trả lời. */
function renderConfirm(view) {
  const left = view.totalCount - view.answeredCount;
  const flagged = view.flaggedCount > 0 ? ` ${view.flaggedCount} câu đang đánh dấu để xem lại.` : '';
  return confirmCard({
    message: `${left > 0 ? `Còn ${left} câu chưa trả lời.` : 'Đã trả lời hết.'}${flagged} Nộp bài?`,
    confirmLabel: 'Nộp bài', onConfirm: view.onSubmit, onCancel: view.onCancel,
  });
}

/**
 * Báo đã tự sang phần sau: băng chạy hết ('tape') hoặc hết giờ ('timeout').
 * @param {{label: string, seconds: number}} phase - phần MỚI
 * @param {'tape'|'timeout'} reason
 */
export function phaseNotice(phase, reason) {
  const next = `Đã sang ${phase.label.toLowerCase()} — ${Math.round(phase.seconds / 60)} phút.`;
  return reason === 'tape'
    ? noticeCard(`${next} Như đề thật, băng chạy hết là sang phần Đọc luôn; phần này làm câu nào trước cũng được.`, 'Hết phần Nghe')
    : noticeCard(`${next} Không quay lại phần trước được, đúng như đề thật.`, 'Hết giờ phần trước');
}
