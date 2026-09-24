import { describe, it, expect } from 'vitest';
import {
  activityByDay, examOverview, estimateStudyMinutes, matureWords, matureTrend, combinedExam, STUDY_SECONDS, MATURE_DAYS,
} from '../src/logic/dashboard.js';
import { reduceVocabState } from '../src/logic/vocab-state.js';
import { at, eventMaker, answeredWith } from './helpers/events.js';

const NOW = at(2026, 9, 20);
const ev = eventMaker();
const answered = answeredWith(ev);

describe('estimateStudyMinutes', () => {
  const cost = STUDY_SECONDS;
  it('cộng thời gian ước tính của từng loại việc trong 7 ngày gần nhất và làm tròn ra phút', () => {
    const events = [
      ...Array.from({ length: 6 }, (_, i) => ev('vocab.reviewed', { wordId: 'a', grade: 'good' }, at(2026, 9, 20, 8) + i)),
      ev('vocab.triaged', { wordId: 'b', level: 'unknown' }, at(2026, 9, 19)),
      answered('p5-1', true, at(2026, 9, 18)),
      answered('l2-1', true, at(2026, 9, 17)),
    ];
    const seconds = 6 * cost['vocab.reviewed'] + cost['vocab.triaged'] + cost.part5 + cost.part2;
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

  it('nghe chép (M11) tính vào thời gian học và vào cột Nghe của biểu đồ hoạt động', () => {
    const events = Array.from({ length: 4 }, (_, i) => ev('dictation.checked', { unitId: `l2-1:${i}`, correct: 3, total: 4, perfect: false }, at(2026, 9, 20, 9) + i));
    expect(estimateStudyMinutes(events, { now: NOW })).toBe(Math.round((4 * cost['dictation.checked']) / 60));
    expect(activityByDay(events, { now: NOW, days: 1 })[0]).toMatchObject({ listening: 4, total: 4 });
  });

  it('việc cuối ngày hôm nay vẫn được tính; không có sự kiện thì 0', () => {
    const late = [answered('l2-1', true, at(2026, 9, 20, 23)), answered('l2-2', true, at(2026, 9, 20, 23))];
    expect(estimateStudyMinutes(late, { now: NOW })).toBe(Math.round((2 * cost.part2) / 60));
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
