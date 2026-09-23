// @vitest-environment jsdom
/**
 * Xáo trộn (D65) chạy thật qua giao diện, với NGẪU NHIÊN THẬT (các file test giao diện khác cố định random để chọn
 * đáp án theo chữ cái). Kiểm: thứ tự từ vựng không còn tuyến tính và trộn cả cụm từ; phương án xáo nhưng nhật ký
 * vẫn ghi chữ cái GỐC và chấm đúng.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { bootApp } from './helpers/ui-app.js';
import { setListenPlayerFactory } from '../src/ui/listen-screen.js';

let store; let root; let tick; let go; let key; let text; let click;
const calls = [];
const fake = {
  preload: vi.fn(async () => {}), stop: vi.fn(), dispose: vi.fn(),
  play: vi.fn(async (steps) => { calls.push(steps); return 'done'; }),
};
const lastAnswered = () => store.exportEvents().filter((e) => e.type === 'question.answered').at(-1).payload;

beforeAll(async () => {
  setListenPlayerFactory(() => fake);
  ({ store, root, tick, go, key, text, click } = await bootApp({ realRandom: true }));
});

describe('phân loại: ngẫu nhiên, trộn cả cụm từ', () => {
  it('lướt hết kho bằng "Để sau": không đi theo thứ tự deck, cụm từ xen giữa, hỏi đúng "CỤM" khi gặp cụm', async () => {
    await go('#/triage');
    const seen = [];
    for (let i = 0; i < 70 && root.querySelector('.actions.four'); i += 1) {
      const word = root.querySelector('.word').textContent;
      const card = [...store.entries, ...store.collocationCards].find((e) => e.word === word);
      seen.push(card);
      expect(text()).toContain(card.isCollocation ? 'Bạn dùng được CỤM này' : 'Bạn dùng được từ này');
      await key('s');
    }
    expect(seen).toHaveLength(store.entries.length + store.collocationCards.length);
    expect(seen.slice(0, 10).map((e) => e.id)).not.toEqual(store.entries.slice(0, 10).map((e) => e.id));
    const collocAt = seen.map((e, i) => (e.isCollocation ? i : -1)).filter((i) => i >= 0);
    expect(collocAt).toHaveLength(2);
    expect(Math.min(...collocAt)).toBeLessThan(seen.length - 2);   // không dồn hết xuống cuối
    await go('#/');
  });
});

describe('phương án xáo, nhật ký ghi chữ cái gốc', () => {
  it('bộ Part 6: chọn theo NỘI DUNG đáp án đúng → chấm đúng cả 4 câu, choice là chữ cái gốc', async () => {
    await go('#/sets?part=6');
    const set = store.sets[6][0];
    for (const [i, question] of set.questions.entries()) {
      const right = question.options[question.answer];
      const node = [...[...root.querySelectorAll('.set-q')][i].querySelectorAll('.option')]
        .find((b) => b.querySelector('.option-text').textContent === right);
      node.click();
      await tick(40);
    }
    const events = store.exportEvents().filter((e) => e.payload.questionId?.startsWith('p6-0001-')).map((e) => e.payload);
    expect(events).toHaveLength(4);
    for (const payload of events) {
      const question = set.questions.find((q) => q.id === payload.questionId);
      expect(payload).toMatchObject({ choice: question.answer, correct: true });
    }
    await go('#/');
  });

  it('Part 2: câu đáp và âm thanh đổi chỗ CÙNG NHAU; chọn A thì nhật ký ghi chữ cái gốc của câu đáp đó', async () => {
    await go('#/listen');
    await click((t) => t.includes('Nghe câu này'));
    const clipOf = Object.fromEntries(calls.at(-1).filter((s) => s.type === 'clip').map((s) => [s.key, s.src]));
    await key('1');
    await tick(40);
    const lines = Object.fromEntries([...root.querySelectorAll('.transcript-line')]
      .map((line) => [line.querySelector('.letter').textContent, line.querySelector('.stem').textContent]));
    const question = store.listening.find((q) => q.question === lines.Q);
    const originalOfA = ['A', 'B', 'C'].find((l) => question.responses[l] === lines.A);
    expect(lastAnswered()).toMatchObject({ questionId: question.id, choice: originalOfA, correct: originalOfA === question.answer });
    for (const shown of ['A', 'B', 'C']) {
      const original = ['A', 'B', 'C'].find((l) => question.responses[l] === lines[shown]);
      expect(clipOf[shown]).toBe(`/${question.audio[original]}`);        // đoạn phát ở vị trí đó đúng là câu đáp đó
    }
  });
});
