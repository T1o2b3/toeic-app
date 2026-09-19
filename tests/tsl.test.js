import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseTslCsv, makeVocabId, TSL_ATTRIBUTION } from '../pipeline/lib/tsl.js';

const CSV = `Word,TSL Rank,SFI,U
mister,1,71.28,1342.2
Vacation,2,65.56,359.64
client,3,65.26,335.37`;

describe('parseTslCsv', () => {
  it('đọc được từ và thứ hạng, chuyển về chữ thường', () => {
    expect(parseTslCsv(CSV)).toEqual([
      { word: 'mister', rank: 1 },
      { word: 'vacation', rank: 2 },
      { word: 'client', rank: 3 },
    ]);
  });

  it('sắp xếp theo rank kể cả khi file xáo trộn', () => {
    const shuffled = 'Word,TSL Rank\nclient,3\nmister,1\nvacation,2';
    expect(parseTslCsv(shuffled).map((w) => w.rank)).toEqual([1, 2, 3]);
  });

  it('bỏ qua dòng hỏng thay vì làm hỏng cả lô', () => {
    const dirty = 'Word,TSL Rank\nmister,1\n,2\nbroken,x\n\nclient,3';
    expect(parseTslCsv(dirty).map((w) => w.word)).toEqual(['mister', 'client']);
  });

  it('báo lỗi rõ ràng khi sai định dạng file', () => {
    expect(() => parseTslCsv('a,b\n1,2')).toThrow(/thiếu cột/);
  });

  it('CSV rỗng trả về mảng rỗng', () => {
    expect(parseTslCsv('')).toEqual([]);
  });
});

describe('makeVocabId', () => {
  it('đệm số 0 cho đủ 4 chữ số', () => {
    expect(makeVocabId(7)).toBe('tsl-0007');
    expect(makeVocabId(1250)).toBe('tsl-1250');
  });

  it('từ chối rank không hợp lệ', () => {
    expect(() => makeVocabId(0)).toThrow();
    expect(() => makeVocabId(1.5)).toThrow();
  });
});

describe('file TSL thật đã tải về', () => {
  it('đọc được đủ 1250 từ', () => {
    const csv = readFileSync(new URL('../pipeline/data/TSL_12_stats.csv', import.meta.url), 'utf8');
    const words = parseTslCsv(csv);
    expect(words).toHaveLength(1250);
    expect(words[0]).toEqual({ word: 'mister', rank: 1 });
    expect(new Set(words.map((w) => w.rank)).size).toBe(1250);
  });
});

describe('TSL_ATTRIBUTION', () => {
  it('giữ đúng giấy phép CC BY-SA 4.0 (D18)', () => {
    expect(TSL_ATTRIBUTION.license).toBe('CC BY-SA 4.0');
  });
});
