import { describe, it, expect } from 'vitest';
import { planToday, describePlan, COST } from '../src/logic/today.js';
import { reduceVocabState } from '../src/logic/vocab-state.js';
import { reduceQuizState } from '../src/logic/quiz.js';

const T0 = Date.UTC(2026, 8, 19, 10, 0, 0);
const ev = (type, payload, ts = T0) => ({ id: `e-${ts}-${Math.random()}`, deviceId: 'mac', ts, type, payload });
const NOW = new Date(T0 + 10 * 24 * 3600_000);

const entries = Array.from({ length: 60 }, (_, i) => ({ id: `tsl-${String(i + 1).padStart(4, '0')}` }));
const questions = Array.from({ length: 30 }, (_, i) => ({
  id: `p5-${String(i + 1).padStart(4, '0')}`, status: 'active', answer: 'A', errorType: 'vocabulary',
}));

/** n từ đầu đã triage là chưa biết; m từ trong số đó đã ôn 1 lần (nên đến hạn sau 10 ngày). */
const makeStates = (triaged, reviewed) => reduceVocabState([
  ...entries.slice(0, triaged).map((e, i) => ev('vocab.triaged', { wordId: e.id, known: false }, T0 + i)),
  ...entries.slice(0, reviewed).map((e, i) => ev('vocab.reviewed', { wordId: e.id, grade: 'good' }, T0 + 100 + i)),
]);

describe('planToday', () => {
  it('không có gì để học thì báo rỗng', () => {
    const plan = planToday({ entries, states: new Map(), questions: [], quizStates: new Map(), now: NOW });
    expect(plan.empty).toBe(true);
    expect(describePlan(plan)).toMatch(/không còn việc/);
  });

  it('ưu tiên từ đến hạn trước từ mới', () => {
    const plan = planToday({ entries, states: makeStates(50, 30), questions: [], quizStates: new Map(), now: NOW });
    expect(plan.vocabDue).toBeGreaterThan(0);
    expect(plan.vocabDue).toBeGreaterThanOrEqual(plan.vocabNew);
  });

  it('giới hạn từ mới để không nhồi quá nhiều thứ mới cùng lúc (D03)', () => {
    const plan = planToday({ entries, states: makeStates(60, 0), questions: [], quizStates: new Map(), now: NOW });
    expect(plan.vocabNew).toBeLessThanOrEqual(Math.floor((15 * 60 * 0.35) / COST.vocabNew));
  });

  it('không vượt quá quỹ thời gian được giao', () => {
    const plan = planToday({
      entries, states: makeStates(60, 40), questions, quizStates: new Map(), minutes: 15, now: NOW,
    });
    expect(plan.seconds).toBeLessThanOrEqual(15 * 60);
  });

  it('quỹ ngắn hơn thì làm ít việc hơn', () => {
    const args = { entries, states: makeStates(60, 40), questions, quizStates: new Map(), now: NOW };
    const short = planToday({ ...args, minutes: 5 });
    const long = planToday({ ...args, minutes: 20 });
    expect(short.seconds).toBeLessThan(long.seconds);
  });

  it('có câu Part 5 thì xen vào phiên', () => {
    const plan = planToday({ entries, states: makeStates(20, 10), questions, quizStates: new Map(), now: NOW });
    expect(plan.quiz).toBeGreaterThan(0);
  });

  it('không đòi nhiều hơn số việc thực có', () => {
    const plan = planToday({
      entries: entries.slice(0, 3), states: makeStates(3, 0),
      questions: questions.slice(0, 2), quizStates: new Map(), now: NOW,
    });
    expect(plan.vocabNew).toBeLessThanOrEqual(3);
    expect(plan.quiz).toBeLessThanOrEqual(2);
  });

  it('câu đã báo lỗi không được tính vào kế hoạch', () => {
    const quizStates = reduceQuizState(questions.map((q) => ev('question.reported', { questionId: q.id })));
    const plan = planToday({ entries, states: makeStates(20, 10), questions, quizStates, now: NOW });
    expect(plan.quiz).toBe(0);
  });
});

describe('describePlan', () => {
  it('liệt kê từng loại việc kèm thời lượng', () => {
    const text = describePlan({ vocabDue: 12, vocabNew: 5, quiz: 4, seconds: 12 * 8 + 5 * 20 + 4 * 25 });
    expect(text).toContain('12 từ ôn lại');
    expect(text).toContain('5 từ mới');
    expect(text).toContain('4 câu Part 5');
    expect(text).toMatch(/~\d+ phút/);
  });

  it('bỏ qua loại việc không có', () => {
    expect(describePlan({ vocabDue: 0, vocabNew: 3, quiz: 0, seconds: 60 })).toBe('3 từ mới · ~1 phút');
  });
});
