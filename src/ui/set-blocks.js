/**
 * Các khối hiển thị của màn luyện bộ đề (câu hỏi có chấm ngay, transcript). Tách khỏi sets-screen.js cho gọn.
 */
import { el } from './dom.js';
import { gradeSetAnswer } from '../logic/sets.js';
import { renderStem } from './capture-tray.js';

const LETTERS = ['A', 'B', 'C', 'D'];

/** Một câu hỏi: đề + 4 phương án; trả lời xong hiện đúng/sai và giải thích ngay dưới câu đó. */
export function renderQuestion(question, index, picked, onPick) {
  const result = picked ? gradeSetAnswer(question, picked) : null;
  const blocks = [
    el('div', { class: 'set-q-stem', text: `${index + 1}. ${question.stem}` }),
    el('div', { class: 'options' }, LETTERS.map((letter) => {
      let className = 'option';
      if (result) {
        if (letter === question.answer) className += ' correct';
        else if (letter === picked) className += ' wrong';
      }
      return el('button', {
        class: className,
        onClick: () => !picked && onPick(letter),
      }, [
        el('span', { class: 'letter', text: letter }),
        el('span', { class: 'option-text', text: question.options[letter] }),
      ]);
    })),
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

