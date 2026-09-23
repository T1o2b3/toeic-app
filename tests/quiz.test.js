import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { isVietnameseOrEmpty } from '../pipeline/lib/prompt-listening.js';
import { reduceQuizState, gradeAnswer, quizQueue, accuracyByErrorType, ERROR_TYPE_LABEL, errorTypeLabel } from '../src/logic/quiz.js';

const T0 = Date.UTC(2026, 8, 19, 10, 0, 0);
const ev = (type, payload, ts = T0) => ({ id: `e-${ts}-${Math.random()}`, deviceId: 'mac', ts, type, payload });

const QUESTIONS = [
  { id: 'p5-0001', status: 'active', answer: 'B', errorType: 'verb-tense' },
  { id: 'p5-0002', status: 'active', answer: 'A', errorType: 'preposition' },
  { id: 'p5-0003', status: 'active', answer: 'C', errorType: 'verb-tense' },
  { id: 'p5-0004', status: 'retired', answer: 'D', errorType: 'vocabulary' },
];

describe('reduceQuizState', () => {
  it('đếm số lần làm và số lần sai', () => {
    const states = reduceQuizState([
      ev('question.answered', { questionId: 'p5-0001', correct: false }, T0),
      ev('question.answered', { questionId: 'p5-0001', correct: true }, T0 + 1000),
    ]);
    expect(states.get('p5-0001')).toMatchObject({ attempts: 2, wrong: 1, lastCorrect: true });
  });

  it('ghi nhận câu bị báo lỗi', () => {
    const states = reduceQuizState([ev('question.reported', { questionId: 'p5-0002' })]);
    expect(states.get('p5-0002').reported).toBe(true);
  });

  it('bỏ qua sự kiện thiếu questionId hoặc loại lạ', () => {
    expect(reduceQuizState([ev('question.answered', {}), ev('vocab.reviewed', { questionId: 'x' })]).size).toBe(0);
  });
});

describe('gradeAnswer', () => {
  it('chấm đúng và trả kèm loại kiến thức để gắn vào sự kiện', () => {
    expect(gradeAnswer(QUESTIONS[0], 'B')).toEqual({ correct: true, answer: 'B', errorType: 'verb-tense' });
    expect(gradeAnswer(QUESTIONS[0], 'A').correct).toBe(false);
  });
});

describe('quizQueue', () => {
  it('câu từng làm SAI được ưu tiên lên đầu', () => {
    const states = reduceQuizState([
      ev('question.answered', { questionId: 'p5-0003', correct: false }, T0),
    ]);
    expect(quizQueue(QUESTIONS, states)[0].id).toBe('p5-0003');
  });

  it('câu đã làm đúng xếp sau câu chưa làm bao giờ', () => {
    const states = reduceQuizState([
      ev('question.answered', { questionId: 'p5-0001', correct: true }, T0),
    ]);
    const ids = quizQueue(QUESTIONS, states).map((q) => q.id);
    expect(ids.indexOf('p5-0002')).toBeLessThan(ids.indexOf('p5-0001'));
  });

  it('loại câu đã retired và câu bị báo lỗi', () => {
    const states = reduceQuizState([ev('question.reported', { questionId: 'p5-0002' })]);
    const ids = quizQueue(QUESTIONS, states).map((q) => q.id);
    expect(ids).not.toContain('p5-0004');
    expect(ids).not.toContain('p5-0002');
  });

  it('lọc được theo một loại kiến thức', () => {
    const ids = quizQueue(QUESTIONS, new Map(), { errorType: 'verb-tense' }).map((q) => q.id);
    expect(ids).toEqual(['p5-0001', 'p5-0003']);
  });

  it('không lặp lại câu đã làm trong cùng một lượt, dù câu đó làm sai', () => {
    const states = reduceQuizState([
      ev('question.answered', { questionId: 'p5-0001', correct: false }, T0),
    ]);
    const ids = quizQueue(QUESTIONS, states, { exclude: new Set(['p5-0001']) }).map((q) => q.id);
    expect(ids).not.toContain('p5-0001');
    expect(ids).toContain('p5-0002');
  });

  it('nhưng LƯỢT SAU thì câu sai vẫn được ưu tiên lên đầu', () => {
    const states = reduceQuizState([
      ev('question.answered', { questionId: 'p5-0001', correct: false }, T0),
    ]);
    expect(quizQueue(QUESTIONS, states)[0].id).toBe('p5-0001');
  });

  it('cắt đúng số câu mỗi lượt', () => {
    expect(quizQueue(QUESTIONS, new Map(), { size: 2 })).toHaveLength(2);
  });

  it('sai nhiều lần hơn thì lên trước', () => {
    const states = reduceQuizState([
      ev('question.answered', { questionId: 'p5-0001', correct: false }, T0),
      ev('question.answered', { questionId: 'p5-0003', correct: false }, T0 + 1),
      ev('question.answered', { questionId: 'p5-0003', correct: false }, T0 + 2),
    ]);
    expect(quizQueue(QUESTIONS, states)[0].id).toBe('p5-0003');
  });
});

describe('accuracyByErrorType', () => {
  it('xếp loại kiến thức yếu nhất lên đầu', () => {
    const states = reduceQuizState([
      ev('question.answered', { questionId: 'p5-0001', correct: false }, T0),
      ev('question.answered', { questionId: 'p5-0003', correct: false }, T0 + 1),
      ev('question.answered', { questionId: 'p5-0002', correct: true }, T0 + 2),
    ]);
    const stats = accuracyByErrorType(QUESTIONS, states);
    expect(stats[0]).toMatchObject({ errorType: 'verb-tense', attempts: 2, wrong: 2, accuracy: 0 });
    expect(stats[1]).toMatchObject({ errorType: 'preposition', accuracy: 1 });
  });

  it('chưa làm câu nào thì không có thống kê', () => {
    expect(accuracyByErrorType(QUESTIONS, new Map())).toEqual([]);
  });
});

describe('nội dung hiển thị bằng tiếng Việt', () => {
  it('MỌI dạng câu có tên tiếng Việt; MỌI lời giải/bẫy viết bằng tiếng Việt', () => {
    const load = (file) => JSON.parse(readFileSync(`public/content/${file}`, 'utf8')).entries;
    const questions = [
      ...load('questions-part5.json'), ...load('listening-part2.json'),
      ...[3, 4, 6, 7].flatMap((part) => load(`sets-part${part}.json`).flatMap((set) => set.questions)),
    ];
    const missing = [...new Set(questions.map((q) => q.errorType))].filter((type) => !(type in ERROR_TYPE_LABEL));
    expect(missing).toEqual([]);
    // Cùng dữ liệu đó: lời giải và bẫy phải là tiếng Việt (10 bộ Part 7 từng lọt 40 lời giải tiếng Anh).
    const english = questions.filter((q) => !isVietnameseOrEmpty(q.explanation) || !isVietnameseOrEmpty(q.trap));
    expect(english.map((q) => q.id)).toEqual([]);
  });

  it('dạng lạ thì trả nguyên mã, không để trống', () => {
    expect(errorTypeLabel('word-form')).toBe('Từ loại');
    expect(errorTypeLabel('dang-moi')).toBe('dang-moi');
  });
});
