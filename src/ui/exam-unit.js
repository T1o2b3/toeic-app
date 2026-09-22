/**
 * Dựng một đơn vị của bài thi thử: một câu lẻ (Part 2, Part 5) hoặc một bộ (Part 3, 4, 6, 7).
 *
 * **Bố cục hai bên (D41):** tài liệu (đoạn văn / nút nghe / câu đề) ở BÊN TRÁI, câu hỏi và phương án ở
 * BÊN PHẢI khi màn hình đủ rộng; trên điện thoại thì xếp dọc như cũ.
 * Câu mang SỐ HIỆU THẬT của đề (Part 5 = 101–130, Part 6 = 131–146…) chứ không phải 1, 2, 3.
 */
import { el } from './dom.js';
import { splitBlanks } from '../logic/part5.js';
import { optionList, splitPane, questionLabel } from './blocks.js';

const LETTERS4 = ['A', 'B', 'C', 'D'];
const LETTERS3 = ['A', 'B', 'C'];

/**
 * Nút Nghe của một đơn vị âm thanh trong THI THỬ: mỗi đoạn phát ĐÚNG MỘT LẦN.
 */
function renderPlay(ctx, label) {
  const done = ctx.heard > 0;
  const off = done || ctx.playing;
  return el('div', { class: 'card big' }, [
    el('button', {
      class: 'primary listen-play',
      disabled: off ? 'disabled' : false,
      onClick: () => { if (!off) ctx.play(); },
    }, [
      el('span', { text: ctx.playing ? '🔊 Đang phát…' : done ? '✓ Đã nghe xong' : `▶ ${label}` }),
      el('small', { text: done ? 'đề thật không cho nghe lại' : 'phát MỘT lần duy nhất, không tua lại' }),
    ]),
    ctx.error ? el('div', { class: 'warn', text: ctx.error }) : '',
  ]);
}

/**
 * In chữ kèm chỗ trống đúng kiểu đề thật.
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
 * @param {{answers: Record<string, string>, pick: Function, play: Function, playing: boolean, heard: number, error: string|null, highlight: string|number|null}} ctx
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
        optionList({ 
          letters: LETTERS3, 
          picked: ctx.answers[item.id], 
          onPick: (l) => ctx.pick(item.id, l),
          highlight: ctx.highlight // 'A', 'B', hoặc 'C'
        }),
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

  return splitPane(material, unit.questions.map((question, i) => {
    // Highlight cho Part 3, 4: Mapping từ clip key sang option.
    // Nếu clip key là 'A', 'B', 'C', 'D' cho câu i, thì highlight option đó.
    // Vì currentClip ở exam-screen là key của clip đang phát.
    const isHighlighted = ctx.highlight === i; // Đơn giản hóa: highlight cả khối câu hỏi
    
    return el('section', { class: `set-q ${isHighlighted ? 'highlight' : ''}` }, [
      questionLabel(question, numberList[i] ?? i + 1),
      optionList({ 
        letters: LETTERS4, 
        textOf: (l) => question.options[l], 
        picked: ctx.answers[question.id], 
        onPick: (l) => ctx.pick(question.id, l),
        highlight: (ctx.highlight && typeof ctx.highlight === 'string') ? ctx.highlight : null
      }),
    ]);
  }));
}

/** Mô tả một câu để xem lại sau bài thi. */
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
