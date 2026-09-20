import { describe, it, expect } from 'vitest';
import {
  GOAL_SCORE, FULL_QUESTIONS, SECTION_MIN, SECTION_MAX,
  tableBand, sectionScore, samplingSpread, estimateSection, estimateScore, formatBand,
} from '../src/logic/score.js';

describe('bảng quy đổi', () => {
  it('đúng hết = 495, sai hết = 5, mọi điểm là bội số của 5', () => {
    for (const skill of ['listening', 'reading']) {
      expect(sectionScore(100, skill)).toBe(SECTION_MAX);
      expect(sectionScore(0, skill)).toBe(SECTION_MIN);
      for (let raw = 0; raw <= 100; raw += 1) expect(sectionScore(raw, skill) % 5).toBe(0);
    }
  });

  it('càng đúng nhiều càng không bị TỤT điểm (lỗi khi nội suy theo hai đầu khoảng)', () => {
    for (const skill of ['listening', 'reading']) {
      let previous = -1;
      for (let raw = 0; raw <= 100; raw += 1) {
        const score = sectionScore(raw, skill);
        expect(score).toBeGreaterThanOrEqual(previous);
        previous = score;
      }
    }
  });

  it('cùng số câu đúng, phần Đọc không được điểm cao hơn phần Nghe (đúng như bảng của ETS)', () => {
    for (let raw = 20; raw <= 95; raw += 5) {
      expect(sectionScore(raw, 'reading')).toBeLessThanOrEqual(sectionScore(raw, 'listening'));
    }
  });

  it('điểm luôn nằm trong khoảng của bảng, và khoảng luôn trong 5–495', () => {
    for (const skill of ['listening', 'reading']) {
      for (let raw = 0; raw <= 100; raw += 1) {
        const band = tableBand(raw, skill);
        expect(band.low).toBeGreaterThanOrEqual(SECTION_MIN);
        expect(band.high).toBeLessThanOrEqual(SECTION_MAX);
        expect(band.low).toBeLessThanOrEqual(band.high);
      }
    }
  });

  it('số câu ngoài thang bị kẹp lại, kỹ năng lạ thì báo lỗi rõ', () => {
    expect(tableBand(-10, 'listening')).toEqual(tableBand(0, 'listening'));
    expect(tableBand(999, 'reading')).toEqual(tableBand(100, 'reading'));
    expect(() => sectionScore(50, 'speaking')).toThrow(/Kỹ năng/);
  });
});

describe('sai số lấy mẫu', () => {
  it('làm càng ít câu thì khoảng càng rộng', () => {
    expect(samplingSpread(24, 30)).toBeGreaterThan(samplingSpread(80, 100));
    expect(samplingSpread(0, 0)).toBe(50); // chưa làm câu nào: không biết gì cả
  });

  it('đúng hết hoặc sai hết thì sai số lấy mẫu bằng 0 (không còn gì để dao động)', () => {
    expect(samplingSpread(30, 30)).toBe(0);
    expect(samplingSpread(0, 30)).toBe(0);
  });
});

describe('ước lượng điểm một kỹ năng', () => {
  it('quy số câu đúng về thang 100 câu khi đề thiếu câu', () => {
    const section = estimateSection({ correct: 47, total: 94 }, 'listening');
    expect(section.raw).toBe(50);
    expect(section.projected).toBe(true); // 94 < 100 câu của đề thật
    expect(section.low).toBeLessThanOrEqual(section.point);
    expect(section.high).toBeGreaterThanOrEqual(section.point);
  });

  it('làm đủ 100 câu thì không còn là suy ra', () => {
    expect(estimateSection({ correct: 75, total: FULL_QUESTIONS }, 'reading').projected).toBe(false);
  });

  it('30 câu Part 5 cho khoảng RỘNG HƠN hẳn 100 câu cùng tỉ lệ đúng', () => {
    const few = estimateSection({ correct: 24, total: 30 }, 'reading');
    const many = estimateSection({ correct: 80, total: 100 }, 'reading');
    expect(few.high - few.low).toBeGreaterThan(many.high - many.low);
  });

  it('số câu vô lý cũng không làm vỡ: đúng nhiều hơn tổng, số âm', () => {
    expect(estimateSection({ correct: 999, total: 30 }, 'reading').correct).toBe(30);
    expect(estimateSection({ correct: -5, total: 30 }, 'reading').correct).toBe(0);
    expect(estimateSection({ correct: 0, total: 0 }, 'listening').point).toBe(SECTION_MIN);
  });
});

describe('ước lượng điểm cả bài', () => {
  const full = { bySkill: { listening: { correct: 80, total: 94 }, reading: { correct: 75, total: 100 } } };

  it('đề đủ: có tổng 10–990 và khoảng cách tới mục tiêu', () => {
    const result = estimateScore(full);
    expect(result.complete).toBe(true);
    expect(result.sections).toHaveLength(2);
    expect(result.total.point).toBe(result.sections[0].point + result.sections[1].point);
    expect(result.total.point).toBeGreaterThanOrEqual(10);
    expect(result.total.point).toBeLessThanOrEqual(990);
    expect(result.goalGap).toBe(GOAL_SCORE - result.total.point);
  });

  it('chỉ làm một kỹ năng thì KHÔNG bịa điểm kỹ năng kia, cũng không có tổng', () => {
    const readingOnly = estimateScore({ bySkill: { listening: { correct: 0, total: 0 }, reading: { correct: 24, total: 30 } } });
    expect(readingOnly.complete).toBe(false);
    expect(readingOnly.total).toBe(null);
    expect(readingOnly.goalGap).toBe(null);
    expect(readingOnly.sections.map((s) => s.skill)).toEqual(['reading']);
  });

  it('chưa làm gì cả thì không có phần nào', () => {
    expect(estimateScore({ bySkill: { listening: { correct: 0, total: 0 }, reading: { correct: 0, total: 0 } } }).sections).toEqual([]);
    expect(estimateScore(undefined).sections).toEqual([]);
  });

  it('cách viết khoảng điểm', () => {
    expect(formatBand({ low: 395, high: 445 })).toBe('395–445');
    expect(formatBand({ low: 495, high: 495 })).toBe('495');
  });
});
