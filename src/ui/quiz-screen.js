/**
 * Màn luyện Part 5, dựng theo ĐÚNG đề thật (D39).
 *
 * Một lượt = một "mẻ" Part 5 như đề thật: 30 câu đánh số 101–130, chia đúng mặt cắt ba nhóm
 * (từ loại / từ vựng / ngữ pháp), thứ tự xáo. Lượt được CHỐT ngay khi bắt đầu — có chốt thì tỉ lệ ba
 * nhóm mới giữ được, và bộ đếm mới đếm ngược thật (quy tắc bắt buộc #7).
 *
 * Khác thi thử: ở đây chấm ngay từng câu và đọc giải thích tiếng Việt (RESEARCH.md R5) vì mỗi câu Part 5
 * độc lập, chấm ngay không lộ bài cho câu sau — khác hẳn bộ nhiều câu chung một tài liệu (D42).
 *
 * Nhịp: đề thật cho ~20 giây/câu (30 câu trong ~10 phút) để còn giờ cho Part 6 và 7. Màn này đo thời gian
 * từng câu và nói nhịp sau khi trả lời — nhắc, không ép.
 */
import { el } from './dom.js';
import { gradeAnswer, errorTypeLabel } from '../logic/quiz.js';
import { composeRound, questionNumber, groupBreakdown, PART5_GROUPS, PART5_COUNT } from '../logic/part5.js';
import { pace } from '../logic/pace.js';
import { shuffleChoices, originalLetter } from '../logic/shuffle.js';
import { roundProgress } from '../logic/round.js';
import { renderStem, renderTray, renderOptionCapture, resetCapture } from './capture-tray.js';
import { optionList, splitPane, backLink, backButton, verdictLine, explanationCard, letterFromKey, sessionDone } from './blocks.js';

const LETTERS = ['A', 'B', 'C', 'D'];

/** Các câu của lượt hiện tại, chốt khi bắt đầu lượt. */
let roundList = [];
/** Vị trí câu đang làm trong lượt. */
let at = 0;
/** Phương án vừa chọn (null = chưa trả lời). */
let picked = null;
/** Mốc bắt đầu câu hiện tại, để đo nhịp. */
let askedAt = 0;
/** Kết quả từng câu của lượt: {question, picked, correct, seconds}. */
let results = [];

/** Dựng lượt mới nếu chưa có. Mỗi lượt 30 câu = đúng Part 5 của đề thật (D39, D58). */
function ensureRound(store) {
  if (roundList.length > 0) return;
  // Xáo phương án mỗi lượt (D65): câu sai quay lại thì đáp án không còn nằm đúng chỗ cũ để nhớ vị trí.
  roundList = composeRound(store.questions, store.quizStates).map((q) => shuffleChoices(q));
  at = 0;
  picked = null;
  results = [];
  askedAt = Date.now();
}

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderQuiz(store) {
  if (store.questions.length === 0) {
    return el('div', {}, [
      el('h1', { text: 'Luyện Part 5' }),
      el('p', { class: 'empty', text: 'Chưa có câu hỏi nào. Chạy pipeline sinh câu trước đã.' }),
      backButton('exams'),
    ]);
  }

  ensureRound(store);
  if (at >= roundList.length) return renderSummary(store);

  const question = roundList[at];
  const result = picked ? gradeAnswer(question, picked) : null;
  // `at` là câu ĐANG làm (chưa xong), nên doneCount = at và câu trên màn vẫn được tính vào "còn lại".
  const { remaining } = roundProgress({
    roundSize: roundList.length, doneCount: at, availableCount: roundList.length - at,
  });

  // Cột trái: câu đề (chỗ trống in dài như đề thật) + khay gạt từ lạ (D34).
  const material = [
    el('div', { class: 'card' }, [
      el('span', { class: 'q-no inline', text: `${questionNumber(at)}.` }),
      renderStem(store, question),
    ]),
    renderTray(store, question),
  ];

  // Cột phải: 4 phương án, rồi mới tới chấm + giải thích. KHÔNG hiện loại kiến thức trước khi trả lời —
  // đề thật không mách "đây là câu mệnh đề quan hệ", biết trước là mất một nửa bài tập.
  const right = [
    optionList({
      letters: LETTERS, textOf: (l) => question.options[l], picked,
      answer: result ? question.answer : null, locked: Boolean(picked),
      onPick: (letter) => answer(store, question, letter),
    }),
  ];

  if (result) {
    const spent = pace(results.at(-1)?.seconds ?? 0);
    right.push(
      verdictLine(result, question.answer),
      el('div', { class: 'gap-row' }, [
        el('span', { class: 'chip', text: groupLabel(question.errorType) }),
        el('span', { class: spent.onPace ? 'gap-value plain' : 'gap-value', text: spent.label }),
      ]),
      explanationCard(question),
      renderOptionCapture(store, question),
      el('div', { class: 'actions' }, [
        el('button', { class: 'primary', onClick: () => next(store) }, [
          el('span', { text: at + 1 >= roundList.length ? 'Xem kết quả lượt' : 'Câu tiếp theo' }),
          el('small', { text: 'phím Space' }),
        ]),
      ]),
      el('div', { class: 'actions' }, [
        el('button', { class: 'link', text: '⚑ Báo câu này sai', onClick: () => report(store, question) }),
      ]),
    );
  } else {
    right.push(el('p', { class: 'footnote left', text: `Phím tắt: 1–4 hoặc A–D để chọn · nhịp đề thật khoảng 20 giây/câu` }));
  }

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      backLink('exams'),
      el('span', { class: 'progress', text: `còn ${remaining} câu · Part 5` }),
    ]),
    splitPane(material, right),
  ]);
}

/** Tên nhóm của một dạng câu, hiện SAU khi trả lời để biết mình yếu mảng nào. */
function groupLabel(errorType) {
  for (const [, group] of Object.entries(PART5_GROUPS)) {
    if (!group.types.includes(errorType)) continue;
    const name = errorTypeLabel(errorType);
    return name === group.label ? name : `${group.label} · ${name}`; // "Từ loại · Từ loại" thì in một lần
  }
  return errorTypeLabel(errorType);
}

/** Tổng kết lượt: đúng bao nhiêu, nhịp thế nào, yếu nhóm nào — đọc được ngay như bảng điểm nhỏ. */
function renderSummary(store) {
  const correct = results.filter((r) => r.correct).length;
  const seconds = results.reduce((sum, r) => sum + r.seconds, 0);
  const average = results.length === 0 ? 0 : Math.round(seconds / results.length);
  const done = groupBreakdown(results.map((r) => r.question));

  const rows = Object.entries(PART5_GROUPS).map(([key, group]) => {
    const inGroup = results.filter((r) => group.types.includes(r.question.errorType));
    const right = inGroup.filter((r) => r.correct).length;
    return el('div', { class: 'gap-row' }, [
      el('span', { text: `${group.label} (${done[key]} câu)` }),
      el('span', { class: 'gap-value plain', text: inGroup.length === 0 ? '—' : `${right}/${inGroup.length}` }),
    ]);
  });

  return sessionDone({
    title: 'Xong lượt Part 5',
    headline: `${correct} / ${results.length} câu đúng`,
    note: `nhịp trung bình ${average} giây/câu · ${pace(average).onPace ? 'kịp nhịp đề thật' : 'đề thật cần ~20 giây/câu'}`,
    changed: correct === results.length
      ? 'Đúng hết. Lượt sau sẽ lấy câu mới.'
      : 'Câu nào sai sẽ được ưu tiên quay lại ở lượt sau — không phải tự nhớ để luyện lại.',
    extra: [el('div', { class: 'gaps' }, rows)],
    actions: [
      el('button', { class: 'primary', onClick: () => { newRound(store); } }, [
        el('span', { text: 'Lượt mới' }),
        el('small', { text: `${results.length} câu · ~${Math.max(1, Math.round(results.length * 20 / 60))} phút` }),
      ]),
      backButton('exams'),
    ],
  });
}

/** Ghi kết quả trả lời. Sự kiện mang theo loại kiến thức để thống kê lỗ hổng. */
async function answer(store, question, letter) {
  if (picked) return;
  picked = letter;
  const result = gradeAnswer(question, letter);
  results.push({ question, picked: letter, correct: result.correct, seconds: (Date.now() - askedAt) / 1000 });
  await store.record('question.answered', {
    questionId: question.id,
    choice: originalLetter(question, letter),   // nhật ký ghi chữ cái GỐC, không phải chữ vừa hiện
    correct: result.correct,
    errorType: result.errorType,
  });
}

/** Sang câu kế tiếp. */
function next(store) {
  at += 1;
  picked = null;
  askedAt = Date.now();
  resetCapture();
  store.refresh();
}

/** Bắt đầu lượt mới (dựng lại từ trạng thái mới nhất nên câu vừa sai sẽ quay lại). */
function newRound(store) {
  roundList = [];
  resetCapture();
  ensureRound(store);
  store.refresh();
}

/** Báo câu hỏi có vấn đề — câu đó bị loại khỏi lượt và khỏi ngân hàng (D12). */
async function report(store, question) {
  roundList = roundList.filter((q) => q.id !== question.id);
  picked = null;
  askedAt = Date.now();
  resetCapture();
  await store.record('question.reported', { questionId: question.id });
}

/**
 * Phím tắt: 1-4 hoặc A-D để chọn, Space để sang câu kế.
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handleQuizKey(store, event) {
  const question = roundList[at];
  if (!question) return;

  if (picked) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      next(store);
    }
    return;
  }

  const letter = letterFromKey(event, LETTERS);
  if (letter) answer(store, question, letter);
}

/** Đặt lại khi rời màn: bỏ lượt đang làm dở. */
export function resetQuiz() {
  roundList = [];
  at = 0;
  picked = null;
  results = [];
  resetCapture();
}

/** Số câu mặc định của một lượt Part 5 = đề thật. */
export { PART5_COUNT };
