import { describe, it, expect } from 'vitest';
import {
  dayKey, partOfQuestion, skillOfQuestion, activityByDay, activeWeeks, examOverview, vocabProgress, weakestTypes,
} from '../src/logic/dashboard.js';
import { reduceVocabState } from '../src/logic/vocab-state.js';
import { reduceQuizState } from '../src/logic/quiz.js';
import { at, eventMaker, answeredWith } from './helpers/events.js';

const NOW = at(2026, 9, 20);
const ev = eventMaker();
const answered = answeredWith(ev);

describe('dayKey / partOfQuestion', () => {
  it('ngày theo giờ địa phương', () => {
    expect(dayKey(at(2026, 9, 20, 23))).toBe('2026-09-20');
    expect(dayKey(at(2026, 1, 5, 0))).toBe('2026-01-05');
  });

  it('phân loại câu hỏi theo tiền tố id, kể cả câu trong bộ (p3-0001-2)', () => {
    expect(partOfQuestion('p5-0001')).toBe('part5');
    expect(partOfQuestion('l2-0001')).toBe('part2');
    expect(partOfQuestion('p3-0004-2')).toBe('part3');
    expect(partOfQuestion('p4-0001-1')).toBe('part4');
    expect(partOfQuestion('p6-0002-4')).toBe('part6');
    expect(partOfQuestion('p7-0010-5')).toBe('part7');
    expect(skillOfQuestion('p5-0001')).toBe('reading');
    expect(skillOfQuestion('p7-0010-5')).toBe('reading');
    expect(skillOfQuestion('l2-0001')).toBe('listening');
    expect(skillOfQuestion('p4-0001-1')).toBe('listening');
    expect(skillOfQuestion('vocab-1')).toBe('other');
    expect(partOfQuestion('zz-1')).toBe('other');
    expect(partOfQuestion(undefined)).toBe('other');
  });
});

describe('activityByDay', () => {
  const events = [
    ev('vocab.reviewed', { wordId: 'a', grade: 'good' }, at(2026, 9, 20, 8)),
    ev('vocab.triaged', { wordId: 'b', level: 'unknown' }, at(2026, 9, 20, 23)),
    answered('p5-0001', true, at(2026, 9, 20, 9)),
    answered('l2-0001', false, at(2026, 9, 19)),
    ev('vocab.bookmarked', { wordId: 'a' }, at(2026, 9, 20)),      // không tính là việc học
    ev('vocab.captured', { word: 'zoning' }, at(2026, 9, 20)),      // không tính
    ev('question.reported', { questionId: 'p5-0002' }, at(2026, 9, 20)),
    answered('zz-1', true, at(2026, 9, 20)),                        // câu không rõ phần nào: bỏ
    ev('vocab.reviewed', { wordId: 'a', grade: 'good' }, at(2026, 8, 1)), // ngoài cửa sổ
  ];
  const activity = activityByDay(events, { now: NOW, days: 14 });

  it('đủ 14 cột, cũ → mới, cột cuối là hôm nay, ngày trống là 0', () => {
    expect(activity).toHaveLength(14);
    expect(activity.at(-1).day).toBe('2026-09-20');
    expect(activity[0].day).toBe('2026-09-07');
    expect(activity.slice(0, 5).every((d) => d.total === 0)).toBe(true);
  });

  it('đếm đúng theo nhóm và chỉ tính việc học thật', () => {
    expect(activity.at(-1)).toMatchObject({ vocab: 2, reading: 1, listening: 0, total: 3 });
    expect(activity.at(-2)).toMatchObject({ vocab: 0, reading: 0, listening: 1, total: 1 });
  });

  it('bỏ sự kiện ngoài cửa sổ; không có sự kiện thì toàn số 0', () => {
    expect(activity.reduce((s, d) => s + d.total, 0)).toBe(4);
    expect(activityByDay([], { now: NOW }).every((d) => d.total === 0)).toBe(true);
    expect(activityByDay(undefined, { now: NOW })).toHaveLength(14);
  });

  it('các ngày liền nhau khác nhau đúng 1 ngày kể cả qua ranh giới tháng', () => {
    const days = activityByDay([], { now: at(2026, 3, 2), days: 5 }).map((d) => d.day);
    expect(days).toEqual(['2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']);
  });
});

describe('activeWeeks — số tuần đã học, KHÔNG BAO GIỜ tụt', () => {
  const learn = (y, m, d) => ev('vocab.reviewed', { wordId: 'a', grade: 'good' }, at(y, m, d));

  it('nhiều ngày trong CÙNG một tuần chỉ tính là một tuần', () => {
    // 2026-09-18 (T6), 19 (T7), 20 (CN) cùng tuần bắt đầu thứ Hai 14/9.
    expect(activeWeeks([learn(2026, 9, 18), learn(2026, 9, 19), learn(2026, 9, 20)], NOW).total).toBe(1);
  });

  it('nghỉ hẳn mấy tuần rồi học lại thì con số CỘNG THÊM, không reset', () => {
    const events = [learn(2026, 8, 3), learn(2026, 8, 25), learn(2026, 9, 20)];
    expect(activeWeeks(events, NOW).total).toBe(3);
  });

  it('nói rõ tuần NÀY đã học chưa', () => {
    expect(activeWeeks([learn(2026, 9, 20)], NOW).thisWeek).toBe(true);
    expect(activeWeeks([learn(2026, 8, 3)], NOW).thisWeek).toBe(false);
  });

  it('chưa học gì thì 0; đánh dấu từ không tính là học', () => {
    expect(activeWeeks([], NOW).total).toBe(0);
    expect(activeWeeks([ev('vocab.bookmarked', { wordId: 'a' }, NOW)], NOW).total).toBe(0);
  });

  it('làm câu hỏi cũng tính là học', () => {
    expect(activeWeeks([answered('l2-1', true, NOW)], NOW).total).toBe(1);
  });

  it('tuần bắt đầu từ THỨ HAI: chủ nhật và thứ hai kế tiếp là HAI tuần khác nhau', () => {
    // 2026-09-20 là chủ nhật, 2026-09-21 là thứ hai.
    expect(activeWeeks([learn(2026, 9, 20), learn(2026, 9, 21)], NOW).total).toBe(2);
  });
});

describe('examOverview theo kỹ năng và theo phần', () => {
  const events = [
    answered('p5-1', true, at(2026, 9, 20)), answered('p6-0001-1', false, at(2026, 9, 20)),
    answered('p7-0001-2', true, at(2026, 9, 19)), answered('l2-1', true, at(2026, 9, 20)),
    answered('p3-0001-1', false, at(2026, 9, 18)), answered('p4-0002-3', true, at(2026, 9, 18)),
  ];

  it('kỹ năng Đọc gộp Part 5, 6, 7; Nghe gộp Part 2, 3, 4', () => {
    expect(examOverview(events, 'reading', NOW).recent).toMatchObject({ attempts: 3, correct: 2 });
    expect(examOverview(events, 'listening', NOW).recent).toMatchObject({ attempts: 3, correct: 2 });
  });

  it('cũng tra được riêng từng phần', () => {
    expect(examOverview(events, 'part6', NOW).recent).toMatchObject({ attempts: 1, correct: 0 });
    expect(examOverview(events, 'part3', NOW).recent).toMatchObject({ attempts: 1, correct: 0 });
    expect(examOverview(events, 'part7', NOW).recent).toMatchObject({ attempts: 1, correct: 1 });
  });

  it('hoạt động mỗi ngày gộp theo kỹ năng', () => {
    const day = activityByDay(events, { now: NOW, days: 3 });
    expect(day.at(-1)).toMatchObject({ reading: 2, listening: 1 });
  });
});

describe('examOverview', () => {
  const events = [
    answered('p5-1', true, at(2026, 9, 20)), answered('p5-2', true, at(2026, 9, 19)),
    answered('p5-3', false, at(2026, 9, 18)), answered('p5-4', true, at(2026, 9, 17)), // tuần này: 3/4
    answered('p5-5', false, at(2026, 9, 10)), answered('p5-6', false, at(2026, 9, 9)),   // tuần trước: 0/2
    answered('p5-7', true, at(2026, 8, 1)),                                              // cũ hơn
    answered('l2-1', true, at(2026, 9, 20)),
  ];
  const p5 = examOverview(events, 'part5', NOW);

  it('tách toàn bộ / 7 ngày gần nhất / 7 ngày trước đó', () => {
    expect(p5.all).toMatchObject({ attempts: 7, correct: 4 });
    expect(p5.recent).toMatchObject({ attempts: 4, correct: 3, accuracy: 0.75 });
    expect(p5.previous).toMatchObject({ attempts: 2, correct: 0, accuracy: 0 });
  });

  it('delta là chênh lệch điểm phần trăm', () => {
    expect(p5.delta).toBe(75);
  });

  it('thiếu số liệu một bên thì delta là null, không phải 0', () => {
    expect(examOverview(events, 'listening', NOW).delta).toBeNull();
    expect(examOverview(events, 'listening', NOW).recent.accuracy).toBe(1);
  });

  it('chưa làm câu nào thì accuracy là null', () => {
    expect(examOverview([], 'part5', NOW).all).toEqual({ attempts: 0, correct: 0, accuracy: null });
  });

  it('câu làm cuối ngày hôm nay vẫn được tính vào 7 ngày gần nhất', () => {
    const late = examOverview([answered('p5-9', true, at(2026, 9, 20, 23))], 'part5', NOW);
    expect(late.recent.attempts).toBe(1);
  });
});

describe('vocabProgress', () => {
  const entries = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, word: id }));
  entries.push({ id: 'x', word: 'x', status: 'retired' });
  const states = reduceVocabState([
    ev('vocab.triaged', { wordId: 'a', level: 'fluent', known: true }, 1),
    ev('vocab.triaged', { wordId: 'b', level: 'unknown', known: false }, 1),
    ev('vocab.triaged', { wordId: 'c', level: 'context', known: false }, 1),
    ev('vocab.triaged', { wordId: 'd', level: 'spelling', known: false }, 1),
    ev('vocab.triaged', { wordId: 'x', level: 'fluent', known: true }, 1),
  ]);
  const progress = vocabProgress(entries, states);

  it('mỗi từ đúng một nhóm: tổng các nhóm = tổng số từ, mục đã gỡ không tính', () => {
    expect(progress.total).toBe(6);
    expect(progress.segments.reduce((s, x) => s + x.count, 0)).toBe(6);
    expect(progress.segments.map((s) => s.key)).toEqual(['untriaged', 'unknown', 'context', 'spelling', 'fluent']);
    expect(progress.segments.find((s) => s.key === 'untriaged').count).toBe(2);
  });

  it('tỉ lệ cộng lại đúng 1; đếm đang học và đã thành thạo', () => {
    expect(progress.segments.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1);
    expect(progress.learning).toBe(3);
    expect(progress.mastered).toBe(1);
    expect(progress.triaged).toBe(4);
    expect(progress.triaged + progress.segments[0].count).toBe(progress.total);
  });

  it('deck rỗng không chia cho 0', () => {
    expect(vocabProgress([], new Map()).segments.every((s) => s.share === 0)).toBe(true);
  });
});

describe('weakestTypes', () => {
  const questions = [
    { id: 'p5-1', errorType: 'comparison' }, { id: 'p5-2', errorType: 'comparison' }, { id: 'p5-3', errorType: 'comparison' },
    { id: 'p5-4', errorType: 'pronoun' }, { id: 'p5-5', errorType: 'pronoun' }, { id: 'p5-6', errorType: 'pronoun' },
    { id: 'p5-7', errorType: 'quantifier' },
  ];
  const states = reduceQuizState([
    answered('p5-1', false, 1), answered('p5-2', false, 2), answered('p5-3', true, 3),
    answered('p5-4', true, 4), answered('p5-5', true, 5), answered('p5-6', true, 6),
    answered('p5-7', false, 7),
  ]);

  it('yếu nhất trước, và bỏ dạng chưa đủ số câu (1 câu sai không phải lỗ hổng)', () => {
    const rows = weakestTypes(questions, states);
    expect(rows.map((r) => r.errorType)).toEqual(['comparison', 'pronoun']);
    expect(rows[0].accuracy).toBeCloseTo(1 / 3);
  });

  it('tôn trọng limit', () => {
    expect(weakestTypes(questions, states, { limit: 1 })).toHaveLength(1);
  });
});
