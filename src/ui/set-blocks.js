/**
 * Các khối hiển thị của màn luyện bộ đề (Part 3, 4, 6, 7). Tách khỏi sets-screen.js cho gọn.
 *
 * **Chấm cả bộ một lượt (D42).** Bộ có nhiều câu dựa trên CÙNG một tài liệu, nên chấm ngay từng câu sẽ
 * lộ bài: biết câu 1 sai là đoán được câu 2, 3 nói về gì. Vì vậy chọn đáp án chỉ tô lại (đổi lại được),
 * tới khi trả lời hết cả bộ mới hiện đúng/sai và giải thích — giống thi thật, và đúng ý Huy.
 */
import { el } from './dom.js';
import { gradeSetAnswer } from '../logic/sets.js';
import { renderStem } from './capture-tray.js';
import { optionList, noticeCard } from './blocks.js';

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Một câu hỏi của bộ.
 * @param {object} question
 * @param {number} index - vị trí trong bộ (0-based)
 * @param {string|null} picked - chữ cái đã chọn
 * @param {(letter: string) => void} onPick
 * @param {boolean} revealed - đã trả lời hết bộ chưa (mới hiện đúng/sai + giải thích)
 * @returns {HTMLElement}
 */
export function renderQuestion(question, index, picked, onPick, revealed) {
  const result = revealed && picked ? gradeSetAnswer(question, picked) : null;
  const blocks = [
    el('div', { class: 'set-q-stem' }, [
      el('span', { class: 'q-no inline', text: `${index + 1}.` }),
      ` ${question.stem}`,
    ]),
    // Chưa chấm thì đổi đáp án thoải mái; chấm rồi thì khoá và mới lộ đúng/sai.
    optionList({
      letters: LETTERS, textOf: (l) => question.options[l], picked,
      answer: revealed ? question.answer : null, locked: revealed, onPick,
    }),
  ];
  if (result) {
    blocks.push(
      el('div', { class: `verdict ${result.correct ? 'ok' : 'no'}`, text: result.correct ? 'Đúng' : `Sai — đáp án là ${question.answer}` }),
      el('div', { class: 'card back' }, [
        el('div', { class: 'meaning', text: question.explanation }),
        question.trap ? el('div', { class: 'note', text: question.trap }) : '',
      ]),
    );
  }
  return el('section', { class: 'set-q' }, blocks);
}

/** Nhắc còn mấy câu nữa mới được xem giải thích — để không ai tưởng app quên chấm. */
export function renderHold(left) {
  return noticeCard(`Còn ${left} câu nữa. Trả lời hết cả bộ rồi mới hiện đáp án và giải thích — chấm từng câu sẽ lộ bài cho các câu sau.`);
}

/** Chữ của đoạn vừa nghe, chỉ hiện sau khi trả lời hết. Từng từ gạt được. */
export function renderTranscript(store, set, nowTurn) {
  return el('div', { class: 'card back' }, [
    el('div', { class: 'gaps-title', text: 'Chữ của đoạn vừa nghe' }),
    ...set.script.map((turn, i) => el('div', { class: nowTurn === i ? 'transcript-line now' : 'transcript-line' }, [
      el('span', { class: 'letter', text: shortSpeaker(turn.speaker) }),
      renderStem(store, { stem: turn.text }),
    ])),
  ]);
}

const shortSpeaker = (name) => (name.startsWith('Man') ? 'M' : name.startsWith('Woman') ? 'W' : name[0]);
