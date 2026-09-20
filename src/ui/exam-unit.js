/**
 * Dựng một đơn vị của bài thi thử: một câu lẻ (Part 2, Part 5) hoặc một bộ (Part 3, 4, 6, 7).
 *
 * **Bố cục hai bên (D41):** tài liệu (đoạn văn / nút nghe / câu đề) ở BÊN TRÁI, câu hỏi và phương án ở
 * BÊN PHẢI khi màn hình đủ rộng; trên điện thoại thì xếp dọc như cũ. CSS lo phần chia cột (`.split`),
 * ở đây chỉ dựng đúng hai khối.
 *
 * Khác màn luyện: KHÔNG chấm ngay, KHÔNG giải thích, KHÔNG gạt từ — chọn xong chỉ tô đáp án đã chọn, đổi lại được.
 * Part 2 chỉ hiện chữ A/B/C (đề thật không in chữ của câu hỏi và câu đáp).
 * Câu mang SỐ HIỆU THẬT của đề (Part 5 = 101–130, Part 6 = 131–146…) chứ không phải 1, 2, 3.
 */
import { el } from './dom.js';
import { splitBlanks } from '../logic/part5.js';
import { optionList, splitPane, questionLabel } from './blocks.js';

const LETTERS4 = ['A', 'B', 'C', 'D'];
const LETTERS3 = ['A', 'B', 'C'];

/** Nút Nghe của một đơn vị âm thanh. */
function renderPlay(ctx, label) {
  return el('div', { class: 'card big' }, [
    el('button', { class: 'primary listen-play', onClick: ctx.play }, [
      el('span', { text: ctx.playing ? '🔊 Đang phát…' : ctx.heard > 0 ? `▶ Nghe lại (đã nghe ${ctx.heard} lần)` : `▶ ${label}` }),
      el('small', { text: 'đề thật chỉ phát một lần — ở đây nghe lại được' }),
    ]),
    ctx.error ? el('div', { class: 'warn', text: ctx.error }) : '',
  ]);
}

/**
 * In chữ kèm chỗ trống đúng kiểu đề thật: dãy gạch nối dài, có số câu thì in số ngay trước
 * ("… chairs 131. ------- by the shortage …") — nhìn đoạn văn là biết đang điền câu nào.
 * @param {string} text
 * @param {number[]} [numbers]
 * @returns {Array<HTMLElement|string>}
 */
export function renderBlanks(text, numbers = []) {
  return splitBlanks(text, numbers).map((piece) => {
    if (piece.type === 'text') return piece.text;
    if (piece.number === null) return el('span', { class: 'blank', text: piece.text });
    return el('span', { class: 'blank numbered' }, [
      el('span', { class: 'blank-no', text: `${piece.number}.` }),
      el('span', { text: ` ${piece.text}` }),
    ]);
  });
}

/**
 * @param {object} unit - {kind: 'single'|'set', part, item, questions}
 * @param {{answers: Record<string, string>, pick: Function, play: Function, playing: boolean, heard: number, error: string|null}} ctx
 * @param {Map<string, number>} [numbers] - id câu → số hiệu trong đề thật
 * @returns {HTMLElement}
 */
export function renderUnit(unit, ctx, numbers = new Map()) {
  const { item, part } = unit;
  const numberOf = (question) => numbers.get(question.id) ?? null;

  if (unit.kind === 'single' && part === 'part2') {
    const number = numberOf(item);
    return splitPane(
      [renderPlay(ctx, 'Nghe câu này'), el('p', { class: 'footnote', text: 'Part 2: chỉ nghe, không có chữ. Chọn A, B hoặc C.' })],
      [
        number ? el('div', { class: 'q-no', text: `Câu ${number}` }) : '',
        optionList({ letters: LETTERS3, picked: ctx.answers[item.id], onPick: (l) => ctx.pick(item.id, l) }),
      ],
    );
  }

  if (unit.kind === 'single') {
    const number = numberOf(item);
    return splitPane(
      [el('div', { class: 'card' }, [
        number ? el('span', { class: 'q-no inline', text: `${number}.` }) : '',
        el('span', { class: 'stem' }, renderBlanks(item.stem)),
      ])],
      [optionList({ letters: LETTERS4, textOf: (l) => item.options[l], picked: ctx.answers[item.id], onPick: (l) => ctx.pick(item.id, l) })],
    );
  }

  const numberList = unit.questions.map((q) => numberOf(q));
  const material = part === 'part3' || part === 'part4'
    ? [renderPlay(ctx, 'Nghe đoạn này')]
    : item.passages.map((passage) => el('div', { class: 'card passage' }, [
        item.passages.length > 1 ? el('div', { class: 'gaps-title', text: passage.label }) : '',
        el('div', { class: 'stem' }, renderBlanks(passage.text, part === 'part6' ? numberList : [])),
      ]));

  return splitPane(material, unit.questions.map((question, i) => el('section', { class: 'set-q' }, [
    questionLabel(question, numberList[i] ?? i + 1),
    optionList({ letters: LETTERS4, textOf: (l) => question.options[l], picked: ctx.answers[question.id], onPick: (l) => ctx.pick(question.id, l) }),
  ])));
}

/** Mô tả một câu để xem lại sau bài thi: đề + phương án (Part 2 là chữ nghe được). */
export function describeQuestion(question) {
  if (question.responses) {
    return {
      stem: `(Nghe) ${question.question}`,
      options: question.responses,
      letters: LETTERS3,
    };
  }
  return { stem: question.stem, options: question.options, letters: LETTERS4 };
}
