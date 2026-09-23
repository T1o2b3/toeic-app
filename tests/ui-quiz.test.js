// @vitest-environment jsdom
/**
 * Màn luyện Part 5 dựng theo đề thật (D39) chạy thật qua giao diện.
 * Các `it` chạy nối tiếp, dùng chung một app (xem tests/helpers/ui-app.js).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { bootApp } from './helpers/ui-app.js';
import { PART5_GROUPS, PART5_GROUP_KEYS, groupOf } from '../src/logic/part5.js';

let store; let root; let tick; let go; let key; let text; let click;

/**
 * Ngân hàng giả: 12 dạng × 12 câu, các dạng gần bằng nhau như ngân hàng thật.
 * Phải đủ 12 câu mỗi dạng: nhóm "Từ vựng" chỉ có MỘT dạng, ít hơn 10 câu là không đủ hạn mức của nhóm.
 */
const TYPES = PART5_GROUP_KEYS.flatMap((k) => PART5_GROUPS[k].types);
const BANK = TYPES.flatMap((errorType, t) => Array.from({ length: 12 }, (_, i) => ({
  id: `p5-9${t}${i}0`, set: 'part5-core', part: 5, status: 'active',
  // Mã T<nhóm>I<số> thay cho tên dạng câu: tên dạng nằm trong đề sẽ làm hỏng chính test "không mách dạng câu".
  stem: `The committee ---- the report coded T${t}I${i} before the deadline.`,
  options: { A: 'alpha', B: 'beta', C: 'gamma', D: 'delta' },
  answer: 'ABCD'[i % 4], errorType,
  explanation: `Giải thích cho dạng ${errorType} số ${i}.`, trap: `Bẫy của dạng ${errorType}.`,
})));

const stemText = () => root.querySelector('.split-material .stem').textContent;
const answerCurrent = async (letter) => {
  [...root.querySelectorAll('.option')].find((b) => b.querySelector('.letter').textContent === letter).click();
  await tick(40);
};
const groupCounts = (list) => {
  const counts = Object.fromEntries(PART5_GROUP_KEYS.map((k) => [k, 0]));
  for (const type of list) counts[groupOf(type)] += 1;
  return counts;
};

beforeAll(async () => {
  ({ store, root, tick, go, key, text, click } = await bootApp({ questions: BANK, realRandom: true }));
});

describe('một lượt = một mẻ Part 5 của đề thật', () => {
  it('30 câu, đánh số từ 101, hai cột: câu đề bên trái, phương án bên phải', async () => {
    await go('#/quiz');
    expect(text()).toContain('còn 30 câu');
    expect(root.querySelector('.split-material')).not.toBe(null);
    expect(root.querySelector('.split-questions .options')).not.toBe(null);
    expect(root.querySelector('.q-no').textContent).toBe('101.');
    expect(root.querySelectorAll('.option')).toHaveLength(4);
  });

  it('chỗ trống in dài như đề thật, không phải dấu gạch thô của dữ liệu', () => {
    expect(stemText()).toContain('-------');
    expect(root.querySelector('.split-material .blank')).not.toBe(null);
  });

  it('KHÔNG mách loại kiến thức trước khi trả lời (biết trước là mất nửa bài tập)', () => {
    for (const type of TYPES) expect(text()).not.toContain(type);
    expect(text()).not.toContain('Từ loại');
  });

  it('trả lời xong mới hiện đúng/sai, loại kiến thức, nhịp làm bài và giải thích', async () => {
    const before = store.eventCount;
    await answerCurrent('A');
    expect(text()).toMatch(/Đúng|Sai — đáp án là/);
    expect(text()).toMatch(/Từ loại|Từ vựng|Ngữ pháp/);
    expect(text()).toMatch(/\d+ giây/);
    expect(text()).toContain('Giải thích cho dạng');
    expect(store.eventCount).toBe(before + 1);
  });

  it('bấm lại phương án khác sau khi đã chấm thì không ghi thêm', async () => {
    const before = store.eventCount;
    await answerCurrent('B');
    expect(store.eventCount).toBe(before);
  });

  it('bộ đếm ĐẾM NGƯỢC theo số câu đã làm (quy tắc bắt buộc #7)', async () => {
    await key(' ');
    await tick(30);
    expect(text()).toContain('còn 29 câu');
    expect(root.querySelector('.q-no').textContent).toBe('102.');
  });

  it('cả lượt có đúng mặt cắt đề thật: 10 từ loại · 10 từ vựng · 10 ngữ pháp', async () => {
    const types = [];
    for (let i = 0; i < 29; i += 1) {                       // câu 1 đã làm ở test trên
      const before = stemText();
      await answerCurrent('A');
      types.push(TYPES[Number(before.match(/coded T(\d+)I/)[1])]);
      if (i < 28) { await key(' '); await tick(20); }
    }
    // 29 câu quan sát được + 1 câu đã làm ở test trên = 30; tổng kết dưới đây chốt con số chính xác.
    const counts = groupCounts(types);
    expect(counts['word-form'] + counts.vocabulary + counts.grammar).toBe(29);
    for (const key of PART5_GROUP_KEYS) expect(counts[key]).toBeGreaterThanOrEqual(9);
  });

  it('hết lượt: tổng kết số câu đúng, nhịp trung bình và kết quả theo từng nhóm', async () => {
    await key(' ');
    await tick(30);
    expect(text()).toContain('Xong lượt Part 5');
    expect(text()).toMatch(/\/ 30 câu đúng/);
    expect(text()).toMatch(/nhịp trung bình \d+ giây\/câu/);
    expect(text()).toContain('Từ loại (10 câu)');
    expect(text()).toContain('Từ vựng (10 câu)');
    expect(text()).toContain('Ngữ pháp (10 câu)');
  });

  it('"Lượt mới" dựng lại lượt khác và đếm lại từ đầu', async () => {
    await click((t) => t.includes('Lượt mới'));
    await tick(30);
    expect(text()).toContain('còn 30 câu');
    expect(root.querySelector('.q-no').textContent).toBe('101.');
  });

  it('phương án bị XÁO mỗi lần hiện (D65) nhưng nhật ký vẫn ghi chữ cái GỐC và chấm đúng', async () => {
    const moved = [];
    for (let i = 0; i < 6; i += 1) {
      const [, t, n] = stemText().match(/coded T(\d+)I(\d+)/);
      const original = BANK.find((q) => q.stem.includes(`coded T${t}I${n} `));
      const rightText = original.options[original.answer];
      const shown = [...root.querySelectorAll('.option')].find((b) => b.querySelector('.option-text').textContent === rightText);
      moved.push(shown.querySelector('.letter').textContent !== original.answer);
      shown.click();
      await tick(40);
      const last = store.exportEvents().at(-1).payload;
      expect(last).toMatchObject({ questionId: original.id, choice: original.answer, correct: true });
      expect(text()).toContain('Đúng');
      await key(' '); await tick(20);
    }
    expect(moved.some(Boolean)).toBe(true);                   // 6 câu mà đáp án chưa từng rời chỗ gốc = chưa xáo
  });
});
