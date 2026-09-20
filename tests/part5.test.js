import { describe, it, expect } from 'vitest';
import {
  PART5_COUNT, PART5_FIRST_NUMBER, PART5_TARGET_SECONDS, PART5_GROUPS, PART5_GROUP_KEYS,
  groupOf, blueprintQuotas, composeRound, groupBreakdown, questionNumber, hasBlank, BLANK_TEXT,
} from '../src/logic/part5.js';
import { reduceQuizState } from '../src/logic/quiz.js';

/** Ngân hàng giả giống thật: 12 dạng câu, số lượng gần bằng nhau. */
const TYPES = PART5_GROUP_KEYS.flatMap((key) => PART5_GROUPS[key].types);
const bank = TYPES.flatMap((errorType, t) => Array.from({ length: 20 }, (_, i) => ({
  id: `p5-${t}-${i}`, status: 'active', errorType, answer: 'A',
  stem: `Câu ${t}-${i} có chỗ trống ---- ở giữa.`,
  options: { A: 'a', B: 'b', C: 'c', D: 'd' },
})));
const seeded = (seed = 7) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

describe('quy cách Part 5 theo đề thật', () => {
  it('30 câu, đánh số 101–130, nhịp 20 giây/câu', () => {
    expect(PART5_COUNT).toBe(30);
    expect(PART5_FIRST_NUMBER).toBe(101);
    expect(questionNumber(0)).toBe(101);
    expect(questionNumber(PART5_COUNT - 1)).toBe(130);
    expect(PART5_TARGET_SECONDS).toBe(20);
    // 30 câu × 20 giây = 10 phút, còn 65 phút cho Part 6 và Part 7 trong 75 phút của phần Đọc.
    expect(PART5_COUNT * PART5_TARGET_SECONDS).toBe(600);
  });

  it('ba nhóm chia đều 10/10/10 câu', () => {
    expect(PART5_GROUP_KEYS).toEqual(['word-form', 'vocabulary', 'grammar']);
    const quotas = blueprintQuotas();
    expect(quotas).toEqual({ 'word-form': 10, vocabulary: 10, grammar: 10 });
    expect(Object.values(quotas).reduce((a, b) => a + b, 0)).toBe(PART5_COUNT);
  });

  it('mỗi dạng câu của ngân hàng thuộc đúng một nhóm', () => {
    const seen = new Set();
    for (const key of PART5_GROUP_KEYS) {
      for (const type of PART5_GROUPS[key].types) {
        expect(seen.has(type)).toBe(false);
        seen.add(type);
        expect(groupOf(type)).toBe(key);
      }
    }
    expect(groupOf('dạng-lạ')).toBe(null);
  });

  it('hạn mức luôn cộng đúng bằng số câu của lượt, kể cả lượt lẻ', () => {
    for (const size of [1, 5, 10, 11, 15, 20, 29, 30, 31]) {
      const quotas = blueprintQuotas(size);
      expect(Object.values(quotas).reduce((a, b) => a + b, 0)).toBe(size);
    }
  });
});

describe('composeRound', () => {
  const states = reduceQuizState([]);

  it('một lượt 30 câu có đúng mặt cắt đề thật, không lệch về ngữ pháp', () => {
    const round = composeRound(bank, states, { random: seeded() });
    expect(round).toHaveLength(30);
    expect(groupBreakdown(round)).toEqual({ 'word-form': 10, vocabulary: 10, grammar: 10 });
  });

  it('KHÔNG lấy đều tay — lấy đều 12 dạng thì 2/3 số câu là ngữ pháp (lỗi cần tránh)', () => {
    // Chứng minh vấn đề tồn tại thật: ngân hàng có 2 dạng từ loại, 1 từ vựng, 9 ngữ pháp.
    const evenly = bank.slice(0, 30);
    expect(groupBreakdown(evenly).grammar).toBeLessThan(10); // 30 câu đầu chưa tới nhóm ngữ pháp
    const random = composeRound(bank, states, { random: seeded(3) });
    expect(groupBreakdown(random).grammar).toBe(10);
  });

  it('không lặp câu, và xáo thứ tự nên không xếp theo nhóm', () => {
    const round = composeRound(bank, states, { random: seeded(11) });
    expect(new Set(round.map((q) => q.id)).size).toBe(30);
    const groups = round.map((q) => groupOf(q.errorType));
    const sorted = [...groups].sort();
    expect(groups).not.toEqual(sorted); // đã xáo, không gom nhóm
  });

  it('trong một nhóm thì trải đều các dạng, không dồn hết vào một dạng', () => {
    const round = composeRound(bank, states, { random: seeded(5) });
    const grammar = round.filter((q) => groupOf(q.errorType) === 'grammar');
    expect(new Set(grammar.map((q) => q.errorType)).size).toBeGreaterThanOrEqual(5);
  });

  it('ưu tiên câu từng làm SAI trước (giữ quy tắc của quizQueue)', () => {
    const wrongIds = ['p5-0-0', 'p5-3-0', 'p5-5-0'];
    const events = wrongIds.map((questionId, i) => ({
      type: 'question.answered', ts: 1000 + i, payload: { questionId, correct: false },
    }));
    const round = composeRound(bank, reduceQuizState(events), { random: seeded(2) });
    for (const id of wrongIds) expect(round.map((q) => q.id)).toContain(id);
  });

  it('bỏ câu đã làm trong lượt này, câu retired và câu đã báo lỗi', () => {
    const exclude = new Set(bank.slice(0, 5).map((q) => q.id));
    const withRetired = [...bank, { id: 'p5-die', status: 'retired', errorType: 'vocabulary', stem: 'x ----' }];
    const reported = reduceQuizState([{ type: 'question.reported', ts: 1, payload: { questionId: 'p5-1-1' } }]);
    const round = composeRound(withRetired, reported, { exclude, random: seeded(4) });
    const ids = round.map((q) => q.id);
    expect(ids).not.toContain('p5-die');
    expect(ids).not.toContain('p5-1-1');
    for (const id of exclude) expect(ids).not.toContain(id);
  });

  it('ngân hàng thiếu câu của một nhóm thì bù bằng nhóm khác để lượt vẫn đủ số câu', () => {
    const noVocab = bank.filter((q) => q.errorType !== 'vocabulary');
    const round = composeRound(noVocab, states, { random: seeded(6) });
    expect(round).toHaveLength(30);
    expect(groupBreakdown(round).vocabulary).toBe(0);
  });

  it('ngân hàng nhỏ hơn một lượt thì trả về hết, không lặp', () => {
    const tiny = bank.slice(0, 7);
    const round = composeRound(tiny, states, { random: seeded() });
    expect(round).toHaveLength(7);
    expect(new Set(round.map((q) => q.id)).size).toBe(7);
  });
});

describe('chỗ trống và nhịp làm bài', () => {
  it('nhận ra câu có chỗ trống; câu KHÔNG có chỗ trống là câu hỏng', () => {
    expect(hasBlank('The council will ---- the rules.')).toBe(true);
    expect(hasBlank('The council will ____ the rules.')).toBe(true);
    expect(hasBlank('The manager was irritated by the constant interruptions.')).toBe(false);
    expect(hasBlank('A well-known author wrote it.')).toBe(false); // gạch nối trong từ ghép không phải chỗ trống
    expect(hasBlank(undefined)).toBe(false);
  });

  it('chỗ trống in dài như đề thật', () => {
    expect(BLANK_TEXT).toBe('-------');
  });
});
