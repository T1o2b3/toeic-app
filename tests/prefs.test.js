import { describe, it, expect } from 'vitest';
import { normalizeRoundSize, ROUND_SIZES, DEFAULT_ROUND_SIZE } from '../src/logic/prefs.js';

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
