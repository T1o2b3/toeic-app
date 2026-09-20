import { describe, it, expect } from 'vitest';
import {
  SET_PARTS, SET_ROUND_SIZE, flattenQuestions, questionsBySkill, setState, setQueue, countAvailableSets,
  gradeSetAnswer, estimateSetMinutes, nextUnanswered,
} from '../src/logic/sets.js';
import { reduceQuizState } from '../src/logic/quiz.js';

let seq = 0;
const answered = (id, correct, ts = 1000 + seq) => ({ id: `e${seq++}`, deviceId: 'd', ts, type: 'question.answered', payload: { questionId: id, choice: 'A', correct, errorType: 'gist' } });
const reported = (id) => ({ id: `e${seq++}`, deviceId: 'd', ts: 1, type: 'question.reported', payload: { questionId: id } });
const makeSet = (id, part = 3, n = 3) => ({
  id, part, status: 'active',
  questions: Array.from({ length: n }, (_, i) => ({ id: `${id}-${i + 1}`, answer: 'A', errorType: 'gist', stem: 's', options: {} })),
});
const sets = [makeSet('p3-0001'), makeSet('p3-0002'), makeSet('p3-0003'), makeSet('p3-0004')];
const ids = (list) => list.map((s) => s.id);

describe('hằng số', () => {
  it('các phần dùng bộ và cỡ lượt', () => {
    expect(SET_PARTS).toEqual([3, 4, 6, 7]);
    for (const part of SET_PARTS) expect(SET_ROUND_SIZE[part]).toBeGreaterThan(0);
  });
});

describe('flattenQuestions / questionsBySkill', () => {
  it('trải mọi câu, mang theo phần thi và id bộ', () => {
    const flat = flattenQuestions([makeSet('p6-0001', 6, 4)]);
    expect(flat).toHaveLength(4);
    expect(flat[0]).toMatchObject({ id: 'p6-0001-1', part: 6, setId: 'p6-0001' });
    expect(flattenQuestions(undefined)).toEqual([]);
  });

  it('gom theo kỹ năng: Nghe = Part 2+3+4, Đọc = Part 5+6+7', () => {
    const store = {
      questions: [{ id: 'p5-1' }], listening: [{ id: 'l2-1' }],
      sets: { 3: [makeSet('p3-0001', 3, 3)], 4: [], 6: [makeSet('p6-0001', 6, 4)], 7: [makeSet('p7-0001', 7, 2)] },
    };
    const by = questionsBySkill(store);
    expect(by.reading.map((q) => q.id)).toEqual(['p5-1', 'p6-0001-1', 'p6-0001-2', 'p6-0001-3', 'p6-0001-4', 'p7-0001-1', 'p7-0001-2']);
    expect(by.listening.map((q) => q.id)).toEqual(['l2-1', 'p3-0001-1', 'p3-0001-2', 'p3-0001-3']);
  });

  it('thiếu ngân hàng bộ thì vẫn chạy', () => {
    expect(questionsBySkill({ questions: [], listening: [] })).toEqual({ reading: [], listening: [] });
  });
});

describe('setState', () => {
  it('bộ chưa làm: chưa thấy, không sai', () => {
    expect(setState(sets[0], new Map())).toMatchObject({ seen: false, wrong: 0, reported: false });
  });

  it('đếm số câu đang sai, nhớ lần làm cuối, và báo lỗi nếu bất kỳ câu nào bị báo', () => {
    const states = reduceQuizState([answered('p3-0001-1', false, 10), answered('p3-0001-2', true, 20), reported('p3-0001-3')]);
    expect(setState(sets[0], states)).toEqual({ seen: true, wrong: 1, reported: true, lastTs: 20 });
  });
});

describe('setQueue', () => {
  const states = reduceQuizState([
    answered('p3-0001-1', true, 100), answered('p3-0001-2', true, 100), answered('p3-0001-3', true, 100), // đúng hết, cũ
    answered('p3-0002-1', false, 200),                                                                    // có câu sai
    answered('p3-0003-1', true, 300), answered('p3-0003-2', true, 300), answered('p3-0003-3', true, 300), // đúng hết, mới hơn
  ]);

  it('ưu tiên bộ có câu sai, rồi bộ chưa làm, cuối cùng bộ đã đúng (cũ nhất trước)', () => {
    expect(ids(setQueue(sets, states, { size: 10 }))).toEqual(['p3-0002', 'p3-0004', 'p3-0001', 'p3-0003']);
  });

  it('cắt theo size và loại bộ đã làm trong lượt này (exclude)', () => {
    expect(ids(setQueue(sets, states, { size: 2 }))).toEqual(['p3-0002', 'p3-0004']);
    expect(ids(setQueue(sets, states, { size: 10, exclude: new Set(['p3-0002']) }))).not.toContain('p3-0002');
  });

  it('bộ đã báo lỗi hoặc đã gỡ thì loại hẳn', () => {
    const withReport = reduceQuizState([reported('p3-0004-2')]);
    expect(ids(setQueue(sets, withReport, { size: 10 }))).not.toContain('p3-0004');
    const retired = [{ ...sets[0], status: 'retired' }, sets[1]];
    expect(ids(setQueue(retired, new Map(), { size: 10 }))).toEqual(['p3-0002']);
  });

  it('bộ sai nhiều câu hơn lên trước', () => {
    const many = reduceQuizState([answered('p3-0001-1', false), answered('p3-0002-1', false), answered('p3-0002-2', false)]);
    expect(ids(setQueue(sets, many, { size: 2 }))).toEqual(['p3-0002', 'p3-0001']);
  });

  it('countAvailableSets đếm đầy đủ, không bị cắt bởi size (quy tắc số 7)', () => {
    expect(countAvailableSets(sets, states)).toBe(4);
    expect(countAvailableSets(sets, reduceQuizState([reported('p3-0001-1')]))).toBe(3);
    expect(countAvailableSets(undefined, states)).toBe(0);
  });
});

describe('chấm và tiện ích', () => {
  it('gradeSetAnswer cùng hình dạng với Part 5', () => {
    expect(gradeSetAnswer({ answer: 'B', errorType: 'gist' }, 'B')).toEqual({ correct: true, errorType: 'gist', answer: 'B' });
    expect(gradeSetAnswer({ answer: 'B', errorType: 'gist' }, 'C').correct).toBe(false);
  });

  it('nextUnanswered trả câu đầu chưa trả lời, hoặc null khi xong hết', () => {
    expect(nextUnanswered(sets[0], {}).id).toBe('p3-0001-1');
    expect(nextUnanswered(sets[0], { 'p3-0001-1': 'A' }).id).toBe('p3-0001-2');
    expect(nextUnanswered(sets[0], { 'p3-0001-1': 'A', 'p3-0001-2': 'B', 'p3-0001-3': 'C' })).toBeNull();
  });

  it('estimateSetMinutes theo số câu, tối thiểu 1 phút', () => {
    expect(estimateSetMinutes(3, [makeSet('a', 3, 3), makeSet('b', 3, 3)])).toBe(5); // 6 câu × 45s
    expect(estimateSetMinutes(7, [makeSet('a', 7, 2)])).toBe(2);
    expect(estimateSetMinutes(3, [])).toBe(1);
  });
});
