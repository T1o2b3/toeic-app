import { describe, it, expect } from 'vitest';
import {
  normalizeRoundSize, ROUND_SIZES, DEFAULT_ROUND_SIZE,
  normalizeShowMeaning, DEFAULT_SHOW_MEANING,
} from '../src/logic/prefs.js';

describe('normalizeRoundSize', () => {
  it('chấp nhận đúng ba lựa chọn', () => {
    for (const size of ROUND_SIZES) expect(normalizeRoundSize(size)).toBe(size);
  });

  it('đọc được giá trị lưu dạng chuỗi (localStorage luôn trả chuỗi)', () => {
    expect(normalizeRoundSize('10')).toBe(10);
  });

  it('giá trị lạ hoặc rác thì về mặc định', () => {
    expect(normalizeRoundSize(7)).toBe(DEFAULT_ROUND_SIZE);
    expect(normalizeRoundSize('rác')).toBe(DEFAULT_ROUND_SIZE);
    expect(normalizeRoundSize(null)).toBe(DEFAULT_ROUND_SIZE);
    expect(normalizeRoundSize(-20)).toBe(DEFAULT_ROUND_SIZE);
  });

  it('mặc định nằm trong danh sách lựa chọn', () => {
    expect(ROUND_SIZES).toContain(DEFAULT_ROUND_SIZE);
  });
});

describe('normalizeShowMeaning', () => {
  it('localStorage chỉ trả chuỗi nên phải đọc được "1"/"0"', () => {
    expect(normalizeShowMeaning('1')).toBe(true);
    expect(normalizeShowMeaning('0')).toBe(false);
  });

  it('chưa đặt bao giờ thì hiện nghĩa — không thấy nghĩa rất dễ tự chấm sai', () => {
    expect(normalizeShowMeaning(null)).toBe(DEFAULT_SHOW_MEANING);
    expect(DEFAULT_SHOW_MEANING).toBe(true);
  });

  it('giá trị rác thì về mặc định chứ không ném lỗi', () => {
    expect(normalizeShowMeaning('rác')).toBe(DEFAULT_SHOW_MEANING);
    expect(normalizeShowMeaning(undefined)).toBe(DEFAULT_SHOW_MEANING);
  });
});
