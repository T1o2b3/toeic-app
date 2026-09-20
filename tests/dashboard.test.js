import { describe, it, expect } from 'vitest';
import {
  dayKey, partOfQuestion, activityByDay, studyStreak, examOverview, vocabProgress, weakestTypes,
  estimateStudyMinutes, matureWords, matureTrend, combinedExam, STUDY_SECONDS, MATURE_DAYS,
} from '../src/logic/dashboard.js';
import { reduceVocabState } from '../src/logic/vocab-state.js';
import { reduceQuizState } from '../src/logic/quiz.js';

// Giữa trưa để múi giờ máy chạy test không kéo ngày lệch.
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime();
const NOW = at(2026, 9, 20);
let seq = 0;
const ev = (type, payload, ts) => ({ id: `e${seq++}`, deviceId: 'd', ts, type, payload });
const answered = (id, correct, ts, errorType = 'wh-who') => ev('question.answered', { questionId: id, choice: 'A', correct, errorType }, ts);

describe('dayKey / partOfQuestion', () => {
  it('ngày theo giờ địa phương', () => {
    expect(dayKey(at(2026, 9, 20, 23))).toBe('2026-09-20');
    expect(dayKey(at(2026, 1, 5, 0))).toBe('2026-01-05');
  });

  it('phân loại câu hỏi theo tiền tố id', () => {
    expect(partOfQuestion('p5-0001')).toBe('part5');
    expect(partOfQuestion('l2-0001')).toBe('listening');
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
    expect(activity.at(-1)).toMatchObject({ vocab: 2, part5: 1, listening: 0, total: 3 });
    expect(activity.at(-2)).toMatchObject({ vocab: 0, part5: 0, listening: 1, total: 1 });
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

describe('studyStreak', () => {
  const learn = (y, m, d) => ev('vocab.reviewed', { wordId: 'a', grade: 'good' }, at(y, m, d));

  it('đếm ngày liên tiếp tới hôm nay', () => {
    expect(studyStreak([learn(2026, 9, 20), learn(2026, 9, 19), learn(2026, 9, 18)], NOW)).toBe(3);
  });

  it('hôm nay chưa học nhưng hôm qua có: chuỗi vẫn còn', () => {
    expect(studyStreak([learn(2026, 9, 19), learn(2026, 9, 18)], NOW)).toBe(2);
  });

  it('bỏ một ngày thì chuỗi đứt', () => {
    expect(studyStreak([learn(2026, 9, 20), learn(2026, 9, 18)], NOW)).toBe(1);
    expect(studyStreak([learn(2026, 9, 18)], NOW)).toBe(0);
  });

  it('không có sự kiện học thì 0; đánh dấu/gạt từ không tính', () => {
    expect(studyStreak([], NOW)).toBe(0);
    expect(studyStreak([ev('vocab.bookmarked', { wordId: 'a' }, NOW)], NOW)).toBe(0);
  });

  it('làm câu hỏi cũng tính là học', () => {
    expect(studyStreak([answered('l2-1', true, NOW)], NOW)).toBe(1);
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

describe('estimateStudyMinutes', () => {
  const cost = STUDY_SECONDS;
  it('cộng thời gian ước tính của từng loại việc trong 7 ngày gần nhất và làm tròn ra phút', () => {
    const events = [
      ...Array.from({ length: 6 }, (_, i) => ev('vocab.reviewed', { wordId: 'a', grade: 'good' }, at(2026, 9, 20, 8) + i)),
      ev('vocab.triaged', { wordId: 'b', level: 'unknown' }, at(2026, 9, 19)),
      answered('p5-1', true, at(2026, 9, 18)),
      answered('l2-1', true, at(2026, 9, 17)),
    ];
    const seconds = 6 * cost['vocab.reviewed'] + cost['vocab.triaged'] + cost.part5 + cost.listening;
    expect(estimateStudyMinutes(events, { now: NOW })).toBe(Math.round(seconds / 60));
  });

  it('bỏ việc ngoài cửa sổ 7 ngày, việc không phải học (đánh dấu, gạt) và câu không rõ phần nào', () => {
    const events = [
      ev('vocab.reviewed', { wordId: 'a', grade: 'good' }, at(2026, 9, 13)), // 8 ngày trước: ngoài
      ev('vocab.bookmarked', { wordId: 'a' }, at(2026, 9, 20)),
      ev('vocab.captured', { word: 'zoning' }, at(2026, 9, 20)),
      answered('zz-1', true, at(2026, 9, 20)),
    ];
    expect(estimateStudyMinutes(events, { now: NOW })).toBe(0);
  });

  it('việc cuối ngày hôm nay vẫn được tính; không có sự kiện thì 0', () => {
    const late = [answered('l2-1', true, at(2026, 9, 20, 23)), answered('l2-2', true, at(2026, 9, 20, 23))];
    expect(estimateStudyMinutes(late, { now: NOW })).toBe(Math.round((2 * cost.listening) / 60));
    expect(estimateStudyMinutes([], { now: NOW })).toBe(0);
    expect(estimateStudyMinutes(undefined, { now: NOW })).toBe(0);
  });
});

describe('matureWords / matureTrend', () => {
  const day = 86400000;
  // Ôn "easy" nhiều lần thì khoảng cách lần ôn kế tiếp tăng dần: đủ để có thẻ vượt ngưỡng 21 ngày.
  const reviews = (wordId, from, count) => Array.from({ length: count }, (_, i) => (
    ev('vocab.reviewed', { wordId, grade: 'easy' }, from + i * 3 * day)));
  const triage = (wordId, ts) => ev('vocab.triaged', { wordId, level: 'unknown', known: false }, ts);

  const events = [
    triage('a', NOW - 40 * day), ...reviews('a', NOW - 39 * day, 8),  // ôn dày từ lâu: vững từ trước tuần trước
    triage('b', NOW - 20 * day), ...reviews('b', NOW - 19 * day, 5),  // mới vững gần đây
    triage('c', NOW - 5 * day), ev('vocab.reviewed', { wordId: 'c', grade: 'good' }, NOW - 4 * day), // chưa vững
  ];
  const states = reduceVocabState(events, { now: new Date(NOW) });

  it('chỉ đếm thẻ có lần ôn kế tiếp cách từ ngưỡng trở lên; từ chưa ôn hoặc mới ôn ít thì không', () => {
    const scheduled = Object.fromEntries([...states].map(([id, st]) => [id, st.card.scheduled_days]));
    expect(scheduled.c).toBeLessThan(MATURE_DAYS);
    expect(matureWords(states)).toBe([...states.values()].filter((st) => st.card.scheduled_days >= MATURE_DAYS).length);
    expect(matureWords(states)).toBeGreaterThan(0);
    expect(matureWords(new Map())).toBe(0);
  });

  it('từ đang ở mức "thành thạo" tự chấm (known) không được tính là nhớ vững', () => {
    const fake = new Map([['x', { known: true, card: { scheduled_days: 400 } }]]);
    expect(matureWords(fake)).toBe(0);
  });

  it('xu hướng: dựng lại trạng thái cách đây 7 ngày từ nhật ký, delta = bây giờ − tuần trước', () => {
    const trend = matureTrend(events, states, NOW);
    expect(trend.now).toBe(matureWords(states));
    expect(trend.delta).toBe(trend.now - trend.weekAgo);
    expect(trend.weekAgo).toBeLessThanOrEqual(trend.now);
  });

  it('không có nhật ký thì mọi số bằng 0', () => {
    expect(matureTrend([], new Map(), NOW)).toEqual({ now: 0, weekAgo: 0, delta: 0 });
  });
});

describe('combinedExam', () => {
  const events = [
    answered('p5-1', true, at(2026, 9, 20)), answered('p5-2', false, at(2026, 9, 19)),
    answered('l2-1', true, at(2026, 9, 18)), answered('l2-2', true, at(2026, 9, 17)),
    answered('p5-3', false, at(2026, 9, 10)), answered('l2-3', false, at(2026, 9, 9)),
  ];
  const result = combinedExam(events, NOW);

  it('gộp hai phần: 7 ngày gần nhất 3/4, tuần trước 0/2', () => {
    expect(result.recent).toEqual({ attempts: 4, correct: 3, accuracy: 0.75 });
    expect(result.previous).toEqual({ attempts: 2, correct: 0, accuracy: 0 });
    expect(result.delta).toBe(75);
  });

  it('thiếu số liệu một bên thì delta null; chưa làm câu nào thì accuracy null', () => {
    expect(combinedExam([answered('p5-1', true, at(2026, 9, 20))], NOW).delta).toBeNull();
    expect(combinedExam([], NOW).recent.accuracy).toBeNull();
  });
});
