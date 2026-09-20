/**
 * Dựng một đơn vị của bài thi thử: một câu lẻ (Part 2, Part 5) hoặc một bộ (Part 3, 4, 6, 7).
 *
 * Khác màn luyện: KHÔNG chấm ngay, KHÔNG giải thích, KHÔNG gạt từ — chọn xong chỉ tô đáp án đã chọn, đổi lại được.
 * Part 2 chỉ hiện chữ A/B/C (đề thật không in chữ của câu hỏi và câu đáp).
 */
import { el } from './dom.js';

const LETTERS4 = ['A', 'B', 'C', 'D'];
const LETTERS3 = ['A', 'B', 'C'];

/**
 * Một dãy nút chọn đáp án. `labels` = false thì chỉ hiện chữ cái (Part 2).
 * @param {{id: string}} question
 * @param {string[]} letters
 * @param {(letter: string) => string|null} textOf
 * @param {Record<string, string>} answers
 * @param {(id: string, letter: string) => void} pick
 */
function renderOptions(question, letters, textOf, answers, pick) {
  return el('div', { class: 'options' }, letters.map((letter) => el('button', {
    class: answers[question.id] === letter ? 'option picked' : 'option',
    onClick: () => pick(question.id, letter),
  }, [
    el('span', { class: 'letter', text: letter }),
    el('span', { class: 'option-text', text: textOf(letter) ?? '' }),
  ])));
}

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
 * @param {object} unit - {kind: 'single'|'set', part, item, questions}
 * @param {{answers: Record<string, string>, pick: Function, play: Function, playing: boolean, heard: number, error: string|null}} ctx
 * @returns {HTMLElement}
 */
export function renderUnit(unit, ctx) {
  const { item, part } = unit;

  if (unit.kind === 'single' && part === 'part2') {
    return el('div', {}, [
      renderPlay(ctx, 'Nghe câu này'),
      renderOptions(item, LETTERS3, () => '', ctx.answers, ctx.pick),
      el('p', { class: 'footnote', text: 'Part 2: chỉ nghe, không có chữ. Chọn A, B hoặc C.' }),
    ]);
  }

  if (unit.kind === 'single') {
    return el('div', {}, [
      el('div', { class: 'card' }, [el('div', { class: 'stem', text: item.stem })]),
      renderOptions(item, LETTERS4, (l) => item.options[l], ctx.answers, ctx.pick),
    ]);
  }

  const material = part === 'part3' || part === 'part4'
    ? renderPlay(ctx, 'Nghe đoạn này')
    : el('div', {}, item.passages.map((p) => el('div', { class: 'card passage' }, [
        item.passages.length > 1 ? el('div', { class: 'gaps-title', text: p.label }) : '',
        el('div', { class: 'stem', text: p.text }),
      ])));

  return el('div', {}, [
    material,
    ...unit.questions.map((question, i) => el('section', { class: 'set-q' }, [
      el('div', { class: 'set-q-stem', text: `${i + 1}. ${question.stem}` }),
      renderOptions(question, LETTERS4, (l) => question.options[l], ctx.answers, ctx.pick),
    ])),
  ]);
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
