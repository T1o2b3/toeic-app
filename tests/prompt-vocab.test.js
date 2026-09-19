import { describe, it, expect } from 'vitest';
import {
  buildVocabPrompt, parseVocabResponse, matchVocabResponse, VOCAB_PROMPT_VERSION,
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

  it('báo lỗi khi rỗng, không có mảng, hoặc JSON hỏng', () => {
    expect(() => parseVocabResponse('')).toThrow(/rỗng/);
    expect(() => parseVocabResponse('không có gì')).toThrow(/Không tìm thấy mảng/);
    expect(() => parseVocabResponse('[{"word":]')).toThrow(/hỏng/);
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
