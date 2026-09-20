import { describe, it, expect } from 'vitest';
import { buildSearchIndex, searchWords, lookupAction, MATCH } from '../src/logic/lookup.js';
import { reduceVocabState } from '../src/logic/vocab-state.js';

const entries = [
  { id: 'a', word: 'amend', rank: 5, vi: 'sửa đổi, tu chính', collocations: ['amend a contract'], synonyms: ['revise'], examples: [{ en: 'They will amend the policy.', vi: 'Họ sẽ sửa đổi chính sách.' }] },
  { id: 'b', word: 'amendment', rank: 20, vi: 'bản sửa đổi' },
  { id: 'c', word: 'raise', rank: 3, vi: 'nâng lên, tăng' },
  { id: 'd', word: 'revise', rank: 9, vi: 'xem lại, điều chỉnh' },
  { id: 'e', word: 'quản', rank: 1, vi: 'x' },
  { id: 'f', word: 'budget', rank: 2, vi: 'ngân sách', note: 'Dễ nhầm với fund.' },
  { id: 'x', word: 'retired', vi: 'đã gỡ', status: 'retired' },
];
const index = buildSearchIndex(entries);
const words = (query, opts) => searchWords(index, query, opts).map((h) => h.entry.word);
const first = (query) => searchWords(index, query)[0];

describe('xếp hạng', () => {
  it('gõ đúng từ thì đứng đầu, trước từ bắt đầu bằng chuỗi đó', () => {
    expect(words('amend')).toEqual(['amend', 'amendment']);
    expect(first('amend').score).toBe(MATCH.EXACT);
  });

  it('gõ dạng chia thì ra từ gốc (raised → raise)', () => {
    expect(first('raised').entry.word).toBe('raise');
    expect(first('raised').score).toBe(MATCH.FORM);
    expect(first('amending').entry.word).toBe('amend');
  });

  it('gõ dở chữ thì ra các từ bắt đầu bằng chuỗi đó, hay gặp trước (rank nhỏ)', () => {
    expect(words('ame')).toEqual(['amend', 'amendment']);
  });

  it('tìm theo nghĩa tiếng Việt, không cần gõ dấu', () => {
    expect(first('ngan sach').entry.word).toBe('budget');
    expect(first('sua doi').score).toBe(MATCH.MEANING_START);
    expect(words('sua doi')).toEqual(['amend', 'amendment']);
  });

  it('tìm trong cụm từ, đồng nghĩa và ví dụ — xếp sau khớp từ và khớp nghĩa', () => {
    const phrase = searchWords(index, 'contract').map((h) => [h.entry.word, h.score]);
    expect(phrase).toEqual([['amend', MATCH.PHRASE]]);
    expect(first('policy').score).toBe(MATCH.EXAMPLE);
    expect(first('fund').entry.word).toBe('budget');
  });

  it('cùng độ khớp thì từ hay gặp hơn (rank nhỏ) lên trước', () => {
    const hits = searchWords(index, 're');
    const same = hits.filter((h) => h.score === hits[0].score).map((h) => h.entry.rank);
    expect([...same].sort((a, b) => a - b)).toEqual(same);
  });
});

describe('biên', () => {
  it('chuỗi rỗng hoặc chỉ khoảng trắng thì không trả gì', () => {
    expect(words('')).toEqual([]);
    expect(words('   ')).toEqual([]);
  });

  it('không có kết quả thì mảng rỗng', () => {
    expect(words('zzzqx')).toEqual([]);
  });

  it('không bao giờ trả mục đã gỡ (retired)', () => {
    expect(words('retired')).toEqual([]);
    expect(words('da go')).toEqual([]);
  });

  it('chuỗi 1–2 ký tự chỉ khớp đầu từ, không lôi cả kho ví dụ ra', () => {
    expect(words('a')).toEqual(['amend', 'amendment']);
  });

  it('tôn trọng giới hạn số kết quả', () => {
    expect(words('a', { limit: 1 })).toHaveLength(1);
  });

  it('hoa/thường không quan trọng', () => {
    expect(words('AMEND')).toEqual(words('amend'));
  });
});

describe('lookupAction', () => {
  const ev = (payload) => ({ id: `e-${payload.level}`, deviceId: 'd', ts: 1, type: 'vocab.triaged', payload });
  const stateOf = (payload) => reduceVocabState(payload ? [ev(payload)] : []).get('a');

  it('từ chưa học → thêm vào danh sách học với mức "không biết"', () => {
    const action = lookupAction(entries[0], stateOf(null));
    expect(action.kind).toBe('add');
    expect(action.event.payload).toEqual({ wordId: 'a', level: 'unknown', known: false });
  });

  it('từ đang "thành thạo" → học lại, hạ xuống "đoán được"', () => {
    const action = lookupAction(entries[0], stateOf({ wordId: 'a', level: 'fluent', known: true }));
    expect(action.kind).toBe('relearn');
    expect(action.event.payload.level).toBe('context');
  });

  it('từ đang học sẵn → không có hành động, không ghi gì', () => {
    const action = lookupAction(entries[0], stateOf({ wordId: 'a', level: 'spelling', known: false }));
    expect(action.kind).toBe('learning');
    expect(action.event).toBeNull();
  });
});
