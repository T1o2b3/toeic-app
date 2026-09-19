import { describe, it, expect } from 'vitest';
import {
  FILTERS, FILTER_ORDER, normalizeFilter, fold, matchesFilter, filterWords, countByFilter,
} from '../src/logic/word-library.js';
import { LEVELS } from '../src/logic/vocab-levels.js';
import { reduceVocabState } from '../src/logic/vocab-state.js';

const T0 = Date.UTC(2026, 8, 19, 10, 0, 0);
const ev = (type, payload, ts = T0) => ({ id: `e-${ts}-${type}-${payload.wordId}`, deviceId: 'mac', ts, type, payload });

const entries = [
  { id: 'a', word: 'amend', vi: 'sửa đổi' },
  { id: 'b', word: 'abolish', vi: 'bãi bỏ' },
  { id: 'c', word: 'enforce', vi: 'thi hành' },
  { id: 'd', word: 'erratic', vi: 'thất thường' },
  { id: 'x', word: 'old', vi: 'cũ', status: 'retired' },
];

const states = reduceVocabState([
  ev('vocab.triaged', { wordId: 'a', level: LEVELS.FLUENT, known: true }),
  ev('vocab.triaged', { wordId: 'b', level: LEVELS.UNKNOWN, known: false }),
  ev('vocab.triaged', { wordId: 'x', level: LEVELS.UNKNOWN, known: false }),
  ev('vocab.bookmarked', { wordId: 'b', bookmarked: true }),
  ev('vocab.bookmarked', { wordId: 'c', bookmarked: true }),
]);

const ids = (list) => list.map((entry) => entry.id);

describe('bộ lọc', () => {
  it('mọi giá trị hợp lệ đều nhận ra, giá trị lạ về "tất cả"', () => {
    for (const filter of FILTER_ORDER) expect(normalizeFilter(filter)).toBe(filter);
    expect(normalizeFilter('rác')).toBe(FILTERS.ALL);
    expect(normalizeFilter(null)).toBe(FILTERS.ALL);
  });

  it('từ chưa có sự kiện nào cũng tính là chưa phân loại', () => {
    expect(matchesFilter(undefined, FILTERS.UNTRIAGED)).toBe(true);
    expect(matchesFilter(undefined, LEVELS.FLUENT)).toBe(false);
  });

  it('từ được đánh dấu mà chưa phân loại: thuộc cả "chưa phân loại" lẫn "đánh dấu"', () => {
    const c = states.get('c');
    expect(matchesFilter(c, FILTERS.UNTRIAGED)).toBe(true);
    expect(matchesFilter(c, FILTERS.BOOKMARKED)).toBe(true);
  });
});

describe('filterWords', () => {
  it('lọc theo mức', () => {
    expect(ids(filterWords(entries, states, { filter: LEVELS.FLUENT }))).toEqual(['a']);
    expect(ids(filterWords(entries, states, { filter: LEVELS.UNKNOWN }))).toEqual(['b']);
  });

  it('không bao giờ hiện mục đã gỡ (retired), kể cả khi từ đó đã phân loại', () => {
    expect(ids(filterWords(entries, states, { filter: LEVELS.UNKNOWN }))).not.toContain('x');
    expect(ids(filterWords(entries, states))).not.toContain('x');
  });

  it('chưa phân loại = những từ chưa chạm tới', () => {
    expect(ids(filterWords(entries, states, { filter: FILTERS.UNTRIAGED }))).toEqual(['c', 'd']);
  });

  it('tìm theo từ tiếng Anh và theo nghĩa, không phân biệt hoa thường', () => {
    expect(ids(filterWords(entries, states, { query: 'ABO' }))).toEqual(['b']);
    expect(ids(filterWords(entries, states, { query: 'thi hành' }))).toEqual(['c']);
  });

  it('tìm không cần gõ dấu tiếng Việt', () => {
    expect(ids(filterWords(entries, states, { query: 'sua doi' }))).toEqual(['a']);
    expect(ids(filterWords(entries, states, { query: 'that thuong' }))).toEqual(['d']);
    expect(ids(filterWords(entries, states, { query: 'bai bo' }))).toEqual(['b']);
  });

  it('bộ lọc và từ khoá kết hợp được, giữ thứ tự deck', () => {
    expect(ids(filterWords(entries, states, { filter: FILTERS.UNTRIAGED, query: 'e' }))).toEqual(['c', 'd']);
    expect(ids(filterWords(entries, states, { filter: FILTERS.UNTRIAGED, query: 'erra' }))).toEqual(['d']);
  });

  it('từ khoá chỉ có khoảng trắng coi như không tìm gì', () => {
    expect(filterWords(entries, states, { query: '   ' })).toHaveLength(4);
  });
});

describe('countByFilter', () => {
  it('đếm đủ mọi khoá, không tính mục đã gỡ', () => {
    const counts = countByFilter(entries, states);
    expect(counts[FILTERS.ALL]).toBe(4);
    expect(counts[FILTERS.UNTRIAGED]).toBe(2);
    expect(counts[LEVELS.FLUENT]).toBe(1);
    expect(counts[LEVELS.UNKNOWN]).toBe(1);
    expect(counts[LEVELS.CONTEXT]).toBe(0);
    expect(counts[FILTERS.BOOKMARKED]).toBe(2);
    expect(Object.keys(counts).sort()).toEqual([...FILTER_ORDER].sort());
  });

  it('tổng chưa phân loại + 4 mức = tất cả', () => {
    const counts = countByFilter(entries, states);
    const sum = counts[FILTERS.UNTRIAGED] + counts[LEVELS.UNKNOWN] + counts[LEVELS.CONTEXT]
      + counts[LEVELS.SPELLING] + counts[LEVELS.FLUENT];
    expect(sum).toBe(counts[FILTERS.ALL]);
  });

  it('số đếm khớp với số từ filterWords trả về', () => {
    const counts = countByFilter(entries, states);
    for (const filter of FILTER_ORDER) {
      expect(filterWords(entries, states, { filter })).toHaveLength(counts[filter]);
    }
  });
});

describe('bộ lọc "đã gạt" (D34)', () => {
  it('lọc theo id mục deck của các từ đã gạt, giữ thứ tự deck', () => {
    expect(ids(filterWords(entries, states, { filter: FILTERS.CAPTURED, capturedIds: new Set(['d', 'b']) }))).toEqual(['b', 'd']);
  });

  it('không có từ nào đã gạt thì rỗng; mục đã gỡ không bao giờ hiện', () => {
    expect(filterWords(entries, states, { filter: FILTERS.CAPTURED })).toEqual([]);
    expect(ids(filterWords(entries, states, { filter: FILTERS.CAPTURED, capturedIds: new Set(['x']) }))).toEqual([]);
  });

  it('kết hợp được với tìm kiếm', () => {
    const capturedIds = new Set(['a', 'b']);
    expect(ids(filterWords(entries, states, { filter: FILTERS.CAPTURED, capturedIds, query: 'abo' }))).toEqual(['b']);
  });

  it('countByFilter lấy tổng số từ đã gạt từ ngoài vào (kể cả từ chưa có trong deck)', () => {
    expect(countByFilter(entries, states, { capturedTotal: 5 })[FILTERS.CAPTURED]).toBe(5);
    expect(countByFilter(entries, states)[FILTERS.CAPTURED]).toBe(0);
  });

  it('không lẫn vào mức: "đã gạt" không nằm trong tổng chưa phân loại + 4 mức', () => {
    const counts = countByFilter(entries, states, { capturedTotal: 9 });
    const sum = counts[FILTERS.UNTRIAGED] + counts[LEVELS.UNKNOWN] + counts[LEVELS.CONTEXT]
      + counts[LEVELS.SPELLING] + counts[LEVELS.FLUENT];
    expect(sum).toBe(counts[FILTERS.ALL]);
  });
});

describe('fold', () => {
  it('bỏ dấu, đ thành d, hạ chữ hoa', () => {
    expect(fold('Đường Hầm')).toBe('duong ham');
    expect(fold(undefined)).toBe('');
  });
});
