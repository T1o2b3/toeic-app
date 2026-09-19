/**
 * Màn luyện Part 5: làm câu, chấm ngay, đọc giải thích tiếng Việt (RESEARCH.md R5).
 * Mỗi câu ghi lại loại kiến thức để sau này biết lỗ hổng nằm ở đâu.
 */
import { el, goTo } from './dom.js';
import { quizQueue, gradeAnswer, roundProgress } from '../logic/quiz.js';

import { getRoundSize } from '../data/prefs.js';

const LETTERS = ['A', 'B', 'C', 'D'];

/** Số câu mỗi lượt do Huy chọn ở màn chính (10/15/20). */
function roundSize() {
  return getRoundSize();
}

/** Trạng thái riêng của màn: phương án vừa chọn (null = chưa trả lời). */
let picked = null;

/**
 * Câu đang làm, được KHOÁ lại khi đã trả lời.
 * Nếu không khoá, việc ghi sự kiện làm hàng đợi sắp xếp lại và màn hình nhảy sang câu kế,
 * khiến lựa chọn vừa bấm bị chấm nhầm cho câu khác.
 */
let locked = null;

/** Câu đã làm trong lượt này — không hiện lại ngay, để dành cho lượt sau. */
let doneThisRound = new Set();

/** Lấy câu đang làm. */
function currentQuestion(store) {
  if (locked) return locked;
  return roundQueue(store)[0] ?? null;
}

/**
 * Hàng đợi của lượt hiện tại. Chỉ lấy đúng số câu CÒN LẠI của lượt, không phải cả lượt —
 * nhờ vậy lượt kết thúc sau đủ 20 câu thay vì kéo dài mãi.
 */
function roundQueue(store) {
  const left = Math.max(0, roundSize() - doneThisRound.size);
  if (left === 0) return [];
  return quizQueue(store.questions, store.quizStates, { size: left, exclude: doneThisRound });
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
      el('button', { class: 'secondary', onClick: () => goTo('/') }, [el('span', { text: 'Về màn chính' })]),
    ]);
  }

  const question = currentQuestion(store);
  if (!question) {
    picked = null;
    locked = null;
    const doneCount = doneThisRound.size;
    return el('div', {}, [
      el('h1', { text: doneCount > 0 ? 'Xong lượt này' : 'Hết câu rồi' }),
      el('p', { class: 'empty', text: doneCount > 0
        ? `Đã làm ${doneCount} câu. Câu nào sai sẽ quay lại ở lượt sau.`
        : 'Đã làm hết ngân hàng câu hỏi hiện có.' }),
      el('button', { class: 'primary', onClick: () => goTo('/') }, [el('span', { text: 'Về màn chính' })]),
    ]);
  }

  const { remaining } = roundProgress({
    roundSize: roundSize(),
    doneCount: doneThisRound.size,
    availableCount: roundQueue(store).length,
    locked: Boolean(locked),
  });
  const result = picked ? gradeAnswer(question, picked) : null;

  const children = [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Về màn chính', onClick: () => goTo('/') }),
      el('span', { class: 'progress', text: `còn ${remaining} câu · ${question.errorType}` }),
    ]),
    el('div', { class: 'card' }, [el('div', { class: 'stem', text: question.stem })]),
    el('div', { class: 'options' }, LETTERS.map((letter) => {
      let className = 'option';
      if (result) {
        if (letter === question.answer) className += ' correct';
        else if (letter === picked) className += ' wrong';
      }
      return el('button', {
        class: className,
        onClick: () => !picked && answer(store, question, letter),
      }, [
        el('span', { class: 'letter', text: letter }),
        el('span', { class: 'option-text', text: question.options[letter] }),
      ]);
    })),
  ];

  if (result) {
    children.push(
      el('div', { class: `verdict ${result.correct ? 'ok' : 'no'}` , text: result.correct ? 'Đúng' : `Sai — đáp án là ${question.answer}` }),
      el('div', { class: 'card back' }, [
        el('div', { class: 'meaning', text: question.explanation }),
        question.trap ? el('div', { class: 'note', text: question.trap }) : '',
      ]),
      el('div', { class: 'actions' }, [
        el('button', { class: 'primary', onClick: () => next(store) }, [
          el('span', { text: 'Câu tiếp theo' }),
          el('small', { text: 'phím Space' }),
        ]),
      ]),
      el('div', { class: 'actions' }, [
        el('button', {
          class: 'link',
          text: '⚑ Báo câu này sai',
          onClick: () => report(store, question),
        }),
      ]),
    );
  } else {
    children.push(el('p', { class: 'footnote', text: 'Phím tắt: 1–4 hoặc A–D để chọn' }));
  }

  return el('div', {}, children);
}

/** Ghi kết quả trả lời. Sự kiện mang theo loại kiến thức để thống kê lỗ hổng. */
async function answer(store, question, letter) {
  picked = letter;
  locked = question;
  doneThisRound.add(question.id);
  const result = gradeAnswer(question, letter);
  await store.record('question.answered', {
    questionId: question.id,
    choice: letter,
    correct: result.correct,
    errorType: result.errorType,
  });
}

/** Sang câu kế tiếp. */
function next(store) {
  picked = null;
  locked = null;
  store.refresh();
}

/** Báo câu hỏi có vấn đề — câu đó bị loại khỏi hàng đợi (D12). */
async function report(store, question) {
  picked = null;
  locked = null;
  doneThisRound.add(question.id);
  await store.record('question.reported', { questionId: question.id });
}

/**
 * Phím tắt: 1-4 hoặc A-D để chọn, Space để sang câu kế.
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handleQuizKey(store, event) {
  const question = currentQuestion(store);
  if (!question) return;

  if (picked) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      next(store);
    }
    return;
  }

  const byNumber = LETTERS[Number.parseInt(event.key, 10) - 1];
  const byLetter = LETTERS.includes(event.key.toUpperCase?.()) ? event.key.toUpperCase() : null;
  const letter = byNumber ?? byLetter;
  if (letter) answer(store, question, letter);
}

/** Đặt lại khi rời màn. */
export function resetQuiz() {
  picked = null;
  locked = null;
  doneThisRound = new Set();
}
