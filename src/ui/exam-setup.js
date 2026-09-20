/**
 * Màn chọn chế độ thi thử. Mỗi chế độ ghi rõ số câu, thời gian, và thiếu bao nhiêu câu so với đề thật.
 * Tách khỏi exam-screen.js cho gọn; nhận hành động bắt đầu qua tham số.
 */
import { el, goTo } from './dom.js';
import { EXAM_MODES, PART_ORDER, availability, modeStatus, buildExamForm } from '../logic/exam.js';
import { timeLimitSeconds, examPhases } from '../logic/exam-time.js';

export function renderSetup(banks, onStart) {
  const avail = availability(banks);
  const card = (mode) => {
    const config = EXAM_MODES[mode];
    const status = modeStatus(mode, avail);
    const probe = buildExamForm(banks, mode, { random: () => 0.5 });
    const minutes = Math.round(timeLimitSeconds(probe) / 60);
    const phases = examPhases(probe);
    // Đề đủ chạy hai đồng hồ riêng như đề thật, nên ghi rõ "45 + 75 phút" thay vì một con số 120.
    const clock = phases.length > 1
      ? phases.map((p) => Math.round(p.seconds / 60)).join(' + ') + ' phút'
      : `${minutes} phút`;
    const note = !status.playable
      ? 'chưa có câu hỏi nào cho phần này'
      : `${probe.questionCount} câu · ${clock}${status.missing > 0 ? ` · thiếu ${status.missing} câu so với đề thật` : ''}`;
    return el('button', {
      class: mode === 'full' ? 'primary' : 'secondary',
      disabled: status.playable ? false : 'disabled',
      onClick: () => onStart(mode),
    }, [el('span', { text: config.label }), el('small', { text: note })]);
  };

  return el('div', {}, [
    el('div', { class: 'topbar' }, [el('button', { class: 'link', text: '← Bài thi', onClick: () => goTo('/exams') })]),
    el('h1', { text: 'Thi thử' }),
    el('p', { class: 'subtitle', text: 'Tính giờ, không xem đáp án cho tới khi nộp. Đề đủ ~194 câu (bỏ 6 câu Part 1 cần ảnh): phần Nghe 45 phút, xong mới sang phần Đọc 75 phút — sang rồi không quay lại được, đúng như đề thật.' }),
    card('full'),
    el('div', { class: 'gaps-title', text: 'Theo kỹ năng' }),
    card('listening'), card('reading'),
    el('div', { class: 'gaps-title', text: 'Theo từng Part' }),
    ...PART_ORDER.map((p) => card(p)),
    el('p', { class: 'footnote', text: 'Nộp xong có điểm ƯỚC LƯỢNG theo thang 10–990 kèm khoảng dao động. Câu hỏi do AI ra nên độ khó chưa hiệu chuẩn — hãy nhìn khoảng điểm và xu hướng nhiều lần, đừng bám vào một con số (D39).' }),
  ]);
}

