import { describe, it, expect } from 'vitest';
import { formatDuration, estimateSessionTime, summarizeQueue } from '../src/logic/format.js';
import { createNewCard, previewIntervals, reviewCard, GRADES } from '../src/logic/scheduler.js';

describe('formatDuration', () => {
  it('chọn đơn vị hợp lý theo độ lớn', () => {
    expect(formatDuration(30_000)).toBe('dưới 1 phút');
    expect(formatDuration(10 * 60_000)).toBe('10 phút');
    expect(formatDuration(3 * 3600_000)).toBe('3 giờ');
    expect(formatDuration(2 * 24 * 3600_000)).toBe('2 ngày');
    expect(formatDuration(60 * 24 * 3600_000)).toBe('2 tháng');
  });

  it('khoảng rất dài hiện theo năm, bỏ số 0 thừa', () => {
    expect(formatDuration(365 * 24 * 3600_000)).toBe('1 năm');
    expect(formatDuration(550 * 24 * 3600_000)).toBe('1.5 năm');
  });
});

describe('estimateSessionTime', () => {
  it('thẻ mới tốn thời gian hơn thẻ ôn lại', () => {
    expect(estimateSessionTime(0, 10)).toBe('~3 phút');
    expect(estimateSessionTime(10, 0)).toBe('~1 phút');
  });

  it('phiên rất ngắn vẫn hiện ít nhất 1 phút', () => {
    expect(estimateSessionTime(1, 0)).toBe('~1 phút');
  });
});

describe('summarizeQueue', () => {
  it('tách số từ mới và từ đến hạn (R2)', () => {
    const queue = [{ isNew: false }, { isNew: false }, { isNew: true }];
    expect(summarizeQueue(queue)).toEqual({ total: 3, fresh: 1, due: 2 });
  });

  it('hàng đợi rỗng', () => {
    expect(summarizeQueue([])).toEqual({ total: 0, fresh: 0, due: 0 });
  });
});

describe('previewIntervals', () => {
  const NOW = new Date('2026-09-19T10:00:00.000Z');

  it('trả về khoảng cách cho cả 4 mức, tăng dần từ quên tới dễ', () => {
    const card = reviewCard(createNewCard(NOW), GRADES.GOOD, NOW);
    const preview = previewIntervals(card, NOW);
    expect(Object.keys(preview).sort()).toEqual(['again', 'easy', 'good', 'hard']);
    expect(preview.again).toBeLessThan(preview.good);
    expect(preview.good).toBeLessThanOrEqual(preview.easy);
  });

  it('không làm thay đổi thẻ gốc', () => {
    const card = createNewCard(NOW);
    const before = JSON.stringify(card);
    previewIntervals(card, NOW);
    expect(JSON.stringify(card)).toBe(before);
  });
});
