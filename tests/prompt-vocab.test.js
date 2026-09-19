import { describe, it, expect } from 'vitest';
import {
  buildVocabPrompt, parseVocabResponse, matchVocabResponse, salvageObjects, VOCAB_PROMPT_VERSION,
} from '../pipeline/lib/prompt-vocab.js';

const WORDS = [{ word: 'client', rank: 3 }, { word: 'invoice', rank: 12 }];

describe('buildVocabPrompt', () => {
  it('liệt kê đủ từ và nêu đúng số lượng cần trả về', () => {
    const prompt = buildVocabPrompt(WORDS);
    expect(prompt).toContain('- client');
    expect(prompt).toContain('- invoice');
    expect(prompt).toContain('2 object');
  });

  it('từ chối lô rỗng', () => {
    expect(() => buildVocabPrompt([])).toThrow();
  });

  it('có phiên bản prompt để ghi vào gen.promptVersion (D13)', () => {
    expect(VOCAB_PROMPT_VERSION).toMatch(/^vocab-v\d+$/);
  });
});

describe('parseVocabResponse', () => {
  it('đọc được JSON sạch', () => {
    expect(parseVocabResponse('[{"word":"client"}]')).toEqual([{ word: 'client' }]);
  });

  it('đọc được khi AI bọc trong ```json', () => {
    const text = 'Đây là kết quả:\n```json\n[{"word":"client"}]\n```\nHết.';
    expect(parseVocabResponse(text)).toEqual([{ word: 'client' }]);
  });

  it('đọc được khi có chữ thừa quanh mảng', () => {
    expect(parseVocabResponse('Kết quả: [{"word":"a"}] xong')).toEqual([{ word: 'a' }]);
  });

  it('báo lỗi khi rỗng hoặc không có JSON nào', () => {
    expect(() => parseVocabResponse('')).toThrow(/rỗng/);
    expect(() => parseVocabResponse('không có gì')).toThrow(/Không tìm thấy mảng/);
    expect(() => parseVocabResponse('[{"word":]')).toThrow(/không vớt được/);
  });

  it('VỚT được các mục nguyên vẹn khi kết quả bị cắt giữa chừng', () => {
    // Trường hợp thật: lô lớn chạm trần token, mảng chưa đóng, mục cuối đứt ngang.
    const truncated = '[{"word":"a","vi":"x"},{"word":"b","vi":"y"},{"word":"c","vi":';
    expect(parseVocabResponse(truncated)).toEqual([
      { word: 'a', vi: 'x' },
      { word: 'b', vi: 'y' },
    ]);
  });
});

describe('matchVocabResponse', () => {
  it('khớp theo từ, không phân biệt hoa thường và khoảng trắng', () => {
    const { matched, missing } = matchVocabResponse(WORDS, [
      { word: ' Invoice ', vi: 'hoá đơn' },
      { word: 'client', vi: 'khách hàng' },
    ]);
    expect(matched.map((m) => m.word)).toEqual(['client', 'invoice']);
    expect(matched[0].rank).toBe(3);
    expect(missing).toEqual([]);
  });

  it('báo từ nào AI bỏ sót để thử lại sau', () => {
    const { matched, missing } = matchVocabResponse(WORDS, [{ word: 'client' }]);
    expect(matched).toHaveLength(1);
    expect(missing).toEqual(['invoice']);
  });

  it('bỏ qua mục AI trả về mà không có trong lô đã gửi', () => {
    const { matched, missing } = matchVocabResponse(WORDS, [{ word: 'banana' }]);
    expect(matched).toEqual([]);
    expect(missing).toEqual(['client', 'invoice']);
  });
});

describe('salvageObjects', () => {
  it('không nhầm dấu ngoặc nằm trong chuỗi', () => {
    const text = '[{"word":"a","vi":"dấu } trong câu"},{"word":"b","vi":"ok"}]';
    expect(salvageObjects(text)).toEqual([
      { word: 'a', vi: 'dấu } trong câu' },
      { word: 'b', vi: 'ok' },
    ]);
  });

  it('xử lý được dấu nháy có ký tự thoát', () => {
    const text = '[{"word":"a","vi":"chữ \\" trong câu"}]';
    expect(salvageObjects(text)).toEqual([{ word: 'a', vi: 'chữ " trong câu' }]);
  });

  it('giữ object lồng nhau nguyên vẹn', () => {
    const text = '[{"word":"a","examples":[{"en":"x","vi":"y"}]}]';
    expect(salvageObjects(text)).toEqual([{ word: 'a', examples: [{ en: 'x', vi: 'y' }] }]);
  });

  it('không có object nào thì trả mảng rỗng', () => {
    expect(salvageObjects('chỉ là chữ')).toEqual([]);
  });
});
