import { describe, it, expect } from 'vitest';
import { pace, targetFor, TARGET_SECONDS } from '../src/logic/pace.js';
import { PART5_TARGET_SECONDS } from '../src/logic/part5.js';

describe('pace', () => {
  // Năm kiểm tra này chuyển nguyên văn từ tests/part5.test.js khi hàm `pace` dọn sang module dùng chung.
  it('nhịp: 20 giây là kịp, chậm hơn thì nói rõ', () => {
    expect(pace(12).onPace).toBe(true);
    expect(pace(20).onPace).toBe(true);
    expect(pace(31).onPace).toBe(false);
    expect(pace(31).label).toContain('20 giây');
    expect(pace(-5).seconds).toBe(0);
  });

  it('Part 5 vẫn lấy đúng mốc 20 giây từ đây, không giữ bản sao riêng', () => {
    expect(PART5_TARGET_SECONDS).toBe(TARGET_SECONDS[5]);
    expect(PART5_TARGET_SECONDS).toBe(20);
  });

  it('so với mốc truyền vào chứ không phải lúc nào cũng 20 giây', () => {
    expect(pace(100, 120).onPace).toBe(true);
    expect(pace(100, 120).diff).toBe(20);
    expect(pace(150, 120).onPace).toBe(false);
    expect(pace(150, 120).diff).toBe(30);
  });
});

describe('targetFor', () => {
  it('nhịp chuẩn của một bộ = số câu × mốc của Part đó', () => {
    expect(targetFor(6, 4)).toBe(120);   // Part 6: 4 câu × 30 giây = 2 phút
    expect(targetFor(7, 5)).toBe(300);   // Part 7: 5 câu × 60 giây = 5 phút
    expect(targetFor(3, 3)).toBe(15);    // Part 3: chỉ tính khoảng trả lời sau khi nghe xong
  });

  it('Part lạ hoặc số câu vô lý thì trả về 0, không vỡ màn hình', () => {
    expect(targetFor(1, 6)).toBe(0);
    expect(targetFor(6, 0)).toBe(0);
    expect(targetFor(6, undefined)).toBe(0);
  });
});
