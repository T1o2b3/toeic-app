import { describe, it, expect } from 'vitest';
import {
  normalizeShowMeaning, DEFAULT_SHOW_MEANING,
} from '../src/logic/prefs.js';

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
