/**
 * Mục Bài thi (D36): luyện Part 5 và luyện nghe Part 2, kèm độ chính xác và lỗ hổng theo dạng câu.
 * Các phần khác (Part 3–4, 6, 7, thi thử đủ bộ) sẽ thêm vào đây khi có (PLAN.md).
 */
import { el, goTo } from './dom.js';
import { navGroup } from './blocks.js';
import { suggestSessions } from '../logic/suggest.js';
import { quizQueue } from '../logic/quiz.js';
import { LISTEN_ROUND_SIZE, estimateMinutes } from '../logic/listen.js';
import { examOverview, weakestTypes } from '../logic/dashboard.js';
import { PART5_TARGET_SECONDS, PART5_COUNT } from '../logic/part5.js';
import { latestEstimate, formatBand, GOAL_SCORE } from '../logic/score.js';
import { SKILL_LABEL } from '../logic/exam-time.js';
import { renderAccuracyBars } from './dashboard-charts.js';
import { SET_PARTS, PART_LABEL, SET_ROUND_SIZE, setQueue, countAvailableSets, estimateSetMinutes, questionsBySkill } from '../logic/sets.js';

/** "Đúng 78% trong 7 ngày qua" / "chưa làm câu nào" — dòng phụ trên nút. */
function accuracyNote(overview) {
  const basis = overview.recent.attempts > 0 ? overview.recent : overview.all;
  if (basis.accuracy === null) return 'chưa làm câu nào';
  const scope = overview.recent.attempts > 0 ? '7 ngày qua' : 'tổng cộng';
  return `đúng ${Math.round(basis.accuracy * 100)}% (${basis.attempts} câu, ${scope})`;
}

/** Điểm ước lượng của bài thi gần nhất — để thấy mình đang ở đâu mà không phải mở lại bài thi (D39). */
function renderLastScore(last) {
  const { estimate } = last;
  const line = estimate.complete
    ? `${estimate.total.point} điểm (${formatBand(estimate.total)}) · còn ${GOAL_SCORE - estimate.total.point} điểm nữa tới mục tiêu`
    : estimate.sections.map((s) => `${SKILL_LABEL[s.skill]} ${s.point} (${formatBand(s)})`).join(' · ');
  return el('div', { class: 'gaps' }, [
    el('div', { class: 'gaps-title', text: 'Bài thi gần nhất — điểm ước lượng' }),
    el('div', { class: 'gap-row' }, [
      el('span', { text: new Date(last.ts).toLocaleDateString('vi-VN') }),
      el('span', { class: 'gap-value plain', text: line }),
    ]),
  ]);
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

  const last = latestEstimate(events);
  sections.push(el('button', { class: 'primary', onClick: () => goTo('/exam') }, [
    el('span', { text: 'Thi thử' }),
    el('small', { text: 'đề đủ ~194 câu tính giờ: Nghe 45 phút rồi Đọc 75 phút, hoặc theo kỹ năng / từng Part' }),
  ]));
  if (last) sections.push(renderLastScore(last));

  // Gộp theo KỸ NĂNG thay vì liệt kê Part 2→7 thành một cột dài: lúc chọn, thứ Huy cân nhắc là
  // "giờ có đeo tai nghe được không", chứ không phải số thứ tự Part.
  const doc = [];
  const nghe = [];

  // Gộp cho gọn thì dễ mất dấu "nên bắt đầu từ đâu". Dùng lại đúng bộ chấm của thẻ "Hôm nay"
  // (logic/suggest.js) để đánh dấu MỘT phần đang cần nhất — không phải đoán theo số thứ tự Part.
  const neediest = suggestSessions({
    entries: [], states: store.states, questions: store.questions, listening: store.listening,
    sets: store.sets, quizStates: store.quizStates, events,
  }).find((x) => x.key.startsWith('part'))?.key;
  const mark = (key, title) => (key === neediest ? `${title}  ← cần nhất` : title);

  if (store.questions.length > 0) {
    const quiz = quizQueue(store.questions, store.quizStates, { size: PART5_COUNT });
    doc.push({
      title: mark('part5', PART_LABEL[5]),
      note: `${quiz.length} câu · ~${Math.max(1, Math.round(quiz.length * PART5_TARGET_SECONDS / 60))} phút · ${accuracyNote(examOverview(events, 'part5'))}`,
      path: '/quiz',
    });
  }
  if (store.listening.length > 0) {
    const round = quizQueue(store.listening, store.quizStates, { size: LISTEN_ROUND_SIZE });
    nghe.push({
      title: mark('part2', PART_LABEL[2]),
      note: `${round.length} câu · ~${estimateMinutes(round.length)} phút · ${accuracyNote(examOverview(events, 'listening'))}`,
      path: '/listen',
    });
  }
  for (const p of SET_PARTS) {
    const bank = store.sets[p];
    if (bank.length === 0) continue;
    const round = setQueue(bank, store.quizStates, { size: SET_ROUND_SIZE[p] });
    const item = {
      title: mark(`part${p}`, PART_LABEL[p]),
      note: `${countAvailableSets(bank, store.quizStates)} bộ · lượt ${round.length} bộ ~${estimateSetMinutes(p, round)} phút · ${accuracyNote(examOverview(events, `part${p}`))}`,
      path: `/sets?part=${p}`,
    };
    (p === 3 || p === 4 ? nghe : doc).push(item);
  }

  sections.push(navGroup('Luyện phần Đọc', doc));
  sections.push(navGroup('Luyện phần Nghe · nên đeo tai nghe', nghe));

  if (doc.length === 0 && nghe.length === 0) {
    sections.push(el('p', { class: 'empty', text: 'Chưa có câu hỏi nào. Chạy pipeline sinh câu trước đã.' }));
  }

  const skills = questionsBySkill(store);
  const banks = [['Lỗ hổng phần đọc (Part 5–7)', skills.reading], ['Lỗ hổng phần nghe (Part 2–4)', skills.listening]];
  for (const [title, bank] of banks) {
    const rows = weakestTypes(bank, store.quizStates).filter((row) => row.accuracy < 0.8);
    if (rows.length === 0) continue;
    sections.push(el('details', { class: 'more-panel' }, [
      el('summary', { text: `${title} — ${rows.length} dạng đang yếu` }),
      el('div', { class: 'gaps' }, [renderAccuracyBars(rows)]),
    ]));
  }
  return el('div', {}, sections);
}
