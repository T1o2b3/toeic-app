/**
 * Mục Bài thi (D36): luyện Part 5 và luyện nghe Part 2, kèm độ chính xác và lỗ hổng theo dạng câu.
 * Các phần khác (Part 3–4, 6, 7, thi thử đủ bộ) sẽ thêm vào đây khi có (PLAN.md).
 */
import { el, goTo } from './dom.js';
import { quizQueue } from '../logic/quiz.js';
import { LISTEN_ROUND_SIZE, estimateMinutes } from '../logic/listen.js';
import { examOverview, weakestTypes } from '../logic/dashboard.js';
import { getRoundSize, setRoundSize } from '../data/prefs.js';
import { ROUND_SIZES } from '../logic/prefs.js';
import { renderAccuracyBars } from './dashboard-charts.js';

/** "Đúng 78% trong 7 ngày qua" / "chưa làm câu nào" — dòng phụ trên nút. */
function accuracyNote(overview) {
  const basis = overview.recent.attempts > 0 ? overview.recent : overview.all;
  if (basis.accuracy === null) return 'chưa làm câu nào';
  const scope = overview.recent.attempts > 0 ? '7 ngày qua' : 'tổng cộng';
  return `đúng ${Math.round(basis.accuracy * 100)}% (${basis.attempts} câu, ${scope})`;
}

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderExams(store) {
  const events = store.events;
  const sections = [
    el('h1', { text: 'Bài thi' }),
    el('p', { class: 'subtitle', text: 'Luyện theo từng phần. Làm sai sẽ quay lại ở lượt sau.' }),
  ];

  if (store.questions.length > 0) {
    const size = getRoundSize();
    const quiz = quizQueue(store.questions, store.quizStates, { size });
    sections.push(
      el('button', { class: 'secondary', onClick: () => goTo('/quiz') }, [
        el('span', { text: 'Luyện Part 5' }),
        el('small', { text: `${quiz.length} câu · ~${Math.max(1, Math.round(quiz.length * 25 / 60))} phút · ${accuracyNote(examOverview(events, 'part5'))}` }),
      ]),
      el('div', { class: 'chooser' }, [
        el('span', { class: 'chooser-label', text: 'Mỗi lượt' }),
        ...ROUND_SIZES.map((option) => el('button', {
          class: option === size ? 'chip-btn active' : 'chip-btn',
          text: String(option),
          onClick: () => { setRoundSize(option); store.refresh(); },
        })),
        el('span', { class: 'chooser-label', text: 'câu' }),
      ]),
    );
  }

  if (store.listening.length > 0) {
    const round = quizQueue(store.listening, store.quizStates, { size: LISTEN_ROUND_SIZE });
    sections.push(el('button', { class: 'secondary', onClick: () => goTo('/listen') }, [
      el('span', { text: 'Luyện nghe Part 2' }),
      el('small', { text: `${round.length} câu · ~${estimateMinutes(round.length)} phút · ${accuracyNote(examOverview(events, 'listening'))} · nên đeo tai nghe` }),
    ]));
  }

  if (store.questions.length === 0 && store.listening.length === 0) {
    sections.push(el('p', { class: 'empty', text: 'Chưa có câu hỏi nào. Chạy pipeline sinh câu trước đã.' }));
  }

  const banks = [['Lỗ hổng theo loại kiến thức (Part 5)', store.questions], ['Lỗ hổng phần nghe', store.listening]];
  for (const [title, bank] of banks) {
    const rows = weakestTypes(bank, store.quizStates).filter((row) => row.accuracy < 0.8);
    if (rows.length === 0) continue;
    sections.push(el('div', { class: 'gaps' }, [
      el('div', { class: 'gaps-title', text: title }),
      renderAccuracyBars(rows),
    ]));
  }
  return el('div', {}, sections);
}
