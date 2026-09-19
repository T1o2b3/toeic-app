import { describe, it, expect } from 'vitest';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { buildEntry, normalizePos, normalizeExamples } from '../pipeline/lib/vocab-entry.js';

const GEN = { model: 'gemini-test', promptVersion: 'v1', batch: '2026-09-19-01', date: '2026-09-19' };

const schema = JSON.parse(
  readFileSync(new URL('../schemas/vocab.schema.json', import.meta.url), 'utf8'),
);
const validateEntry = addFormats(new Ajv({ allErrors: true })).compile(schema.$defs.entry);

const FULL_AI = {
  pos: ['noun'],
  vi: 'khách hàng',
  examples: [{ en: 'The client signed the contract.', vi: 'Khách hàng đã ký hợp đồng.' }],
  collocations: ['potential client', 'client base'],
  synonyms: ['customer'],
  antonyms: [],
  note: 'Trong TOEIC hay đi với công ty dịch vụ.',
};

describe('normalizePos', () => {
  it('nhận viết tắt và loại bỏ trùng', () => {
    expect(normalizePos(['n', 'noun', 'v'])).toEqual(['noun', 'verb']);
  });

  it('nhận chuỗi đơn lẻ và bỏ dấu chấm cuối', () => {
    expect(normalizePos('adj.')).toEqual(['adjective']);
  });

  it('không nhận ra thì trả về phrase thay vì hỏng', () => {
    expect(normalizePos(['???'])).toEqual(['phrase']);
    expect(normalizePos(undefined)).toEqual(['phrase']);
  });
});

describe('normalizeExamples', () => {
  it('bỏ ví dụ thiếu một vế và cắt còn tối đa 3', () => {
    const input = [
      { en: 'a', vi: 'a' }, { en: 'b' }, { vi: 'c' },
      { en: 'd', vi: 'd' }, { en: 'e', vi: 'e' }, { en: 'f', vi: 'f' },
    ];
    expect(normalizeExamples(input)).toEqual([
      { en: 'a', vi: 'a' }, { en: 'd', vi: 'd' }, { en: 'e', vi: 'e' },
    ]);
  });

  it('dữ liệu không phải mảng trả về mảng rỗng', () => {
    expect(normalizeExamples('hỏng')).toEqual([]);
  });
});

describe('buildEntry', () => {
  it('dựng mục đầy đủ và hợp lệ theo schema', () => {
    const entry = buildEntry({ word: 'client', rank: 3, ai: FULL_AI, ipa: '/ˈklaɪənt/', gen: GEN });
    expect(validateEntry(entry) || validateEntry.errors).toBe(true);
    expect(entry.id).toBe('tsl-0003');
    expect(entry.deck).toBe('toeic-tsl');
    expect(entry.status).toBe('active');
    expect(entry.ipa).toBe('/ˈklaɪənt/');
  });

  it('bỏ trường tuỳ chọn rỗng thay vì để mảng rỗng', () => {
    const entry = buildEntry({ word: 'client', rank: 3, ai: FULL_AI, gen: GEN });
    expect(entry.antonyms).toBeUndefined();
    expect(entry.ipa).toBeUndefined();
    expect(validateEntry(entry) || validateEntry.errors).toBe(true);
  });

  it('bỏ collocation trùng nhau (không phân biệt hoa thường)', () => {
    const ai = { ...FULL_AI, collocations: ['New client', 'new client', 'client base'] };
    expect(buildEntry({ word: 'client', rank: 3, ai, gen: GEN }).collocations)
      .toEqual(['New client', 'client base']);
  });

  it('ném lỗi khi AI thiếu nghĩa Việt hoặc ví dụ', () => {
    expect(() => buildEntry({ word: 'x', rank: 1, ai: { ...FULL_AI, vi: '  ' }, gen: GEN }))
      .toThrow(/nghĩa tiếng Việt/);
    expect(() => buildEntry({ word: 'x', rank: 1, ai: { ...FULL_AI, examples: [] }, gen: GEN }))
      .toThrow(/ví dụ/);
  });
});
