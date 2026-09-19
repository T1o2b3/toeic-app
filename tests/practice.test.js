import { describe, it, expect } from 'vitest';
import {
  POOLS, POOL_ORDER, PRACTICE_SIZE, DEMOTED_LEVEL, poolEntries, countPools, pickRound, eventForResult,
} from '../src/logic/practice.js';
import { LEVELS, levelFromPayload } from '../src/logic/vocab-levels.js';
import { reduceVocabState, reviewQueue } from '../src/logic/vocab-state.js';

const T0 = Date.UTC(2026, 8, 19, 10, 0, 0);
let seq = 0;
const ev = (type, payload, ts = T0 + seq) => ({ id: `e-${seq++}`, deviceId: 'mac', ts, type, payload });

const entries = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, word: id, vi: id }));

const events = [
  ev('vocab.triaged', { wordId: 'a', level: LEVELS.FLUENT, known: true }),
  ev('vocab.triaged', { wordId: 'b', level: LEVELS.FLUENT, known: true }),
  ev('vocab.triaged', { wordId: 'c', level: LEVELS.UNKNOWN, known: false }),
  ev('vocab.triaged', { wordId: 'd', level: LEVELS.SPELLING, known: false }),
  ev('vocab.reviewed', { wordId: 'd', grade: 'again' }),
  ev('vocab.reviewed', { wordId: 'd', grade: 'again' }),
  ev('vocab.reviewed', { wordId: 'c', grade: 'again' }),
  ev('vocab.bookmarked', { wordId: 'e', bookmarked: true }),
];
const states = reduceVocabState(events, { now: new Date(T0 + 1000) });
const ids = (list) => list.map((entry) => entry.id);

describe('các nhóm từ', () => {
  it('thành thạo = đã phân loại và không còn phải học', () => {
    expect(ids(poolEntries(POOLS.FLUENT, entries, states))).toEqual(['a', 'b']);
  });

  it('từ hay sai xếp theo số lần quên giảm dần', () => {
    expect(ids(poolEntries(POOLS.WEAK, entries, states))).toEqual(['d', 'c']);
  });

  it('đánh dấu: kể cả từ chưa phân loại', () => {
    expect(ids(poolEntries(POOLS.BOOKMARKED, entries, states))).toEqual(['e']);
  });

  it('đang học = đã phân loại và còn phải học', () => {
    expect(ids(poolEntries(POOLS.LEARNING, entries, states))).toEqual(['c', 'd']);
  });

  it('mục đã gỡ (retired) không bao giờ vào nhóm nào', () => {
    const withRetired = [...entries, { id: 'z', word: 'z', vi: 'z', status: 'retired' }];
    const st = reduceVocabState([
      ...events, ev('vocab.triaged', { wordId: 'z', level: LEVELS.FLUENT, known: true }),
    ]);
    expect(ids(poolEntries(POOLS.FLUENT, withRetired, st))).not.toContain('z');
    expect(countPools(withRetired, st)[POOLS.FLUENT]).toBe(2);
  });

  it('countPools khớp poolEntries và đủ mọi nhóm', () => {
    const counts = countPools(entries, states);
    expect(Object.keys(counts).sort()).toEqual([...POOL_ORDER].sort());
    for (const pool of POOL_ORDER) expect(counts[pool]).toBe(poolEntries(pool, entries, states).length);
  });
});

describe('pickRound', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ id: `w${i}`, word: `w${i}`, vi: '' }));
  const manyStates = reduceVocabState(
    many.map((entry) => ev('vocab.triaged', { wordId: entry.id, level: LEVELS.FLUENT, known: true })),
  );

  it('lấy đúng một lượt, không trùng từ', () => {
    const round = pickRound(POOLS.FLUENT, many, manyStates);
    expect(round).toHaveLength(PRACTICE_SIZE);
    expect(new Set(round).size).toBe(PRACTICE_SIZE);
  });

  it('nhóm nhỏ hơn một lượt thì lấy hết, không đệm thêm', () => {
    expect(pickRound(POOLS.FLUENT, entries, states)).toHaveLength(2);
  });

  it('nhóm rỗng cho lượt rỗng', () => {
    expect(pickRound(POOLS.WEAK, entries, reduceVocabState([]))).toEqual([]);
  });

  it('xáo ngẫu nhiên: hai bộ số ngẫu nhiên khác nhau cho hai lượt khác nhau', () => {
    const low = pickRound(POOLS.FLUENT, many, manyStates, { random: () => 0 });
    const high = pickRound(POOLS.FLUENT, many, manyStates, { random: () => 0.99 });
    expect(low).not.toEqual(high);
  });

  it('cùng số ngẫu nhiên thì cùng kết quả (test được)', () => {
    const one = pickRound(POOLS.FLUENT, many, manyStates, { random: () => 0.3 });
    const two = pickRound(POOLS.FLUENT, many, manyStates, { random: () => 0.3 });
    expect(one).toEqual(two);
  });

  it('từ hay sai lấy đầu danh sách (sai nhiều nhất), không xáo', () => {
    expect(pickRound(POOLS.WEAK, entries, states, { size: 1 })).toEqual(['d']);
  });

  it('tôn trọng size tuỳ chọn', () => {
    expect(pickRound(POOLS.FLUENT, many, manyStates, { size: 3 })).toHaveLength(3);
  });
});

describe('eventForResult — chỗ duy nhất ôn chủ động được phép ghi', () => {
  it('quên từ đã thành thạo → hạ mức, đọc lại được bằng cả bản app cũ', () => {
    const result = eventForResult('a', states.get('a'), false);
    expect(result.type).toBe('vocab.triaged');
    expect(result.payload).toEqual({ wordId: 'a', level: DEMOTED_LEVEL, known: false });
    expect(levelFromPayload(result.payload)).toBe(LEVELS.CONTEXT);
  });

  it('nhớ từ đã thành thạo → không ghi gì', () => {
    expect(eventForResult('a', states.get('a'), true)).toBeNull();
  });

  it('quên từ đang học → KHÔNG ghi gì (lịch FSRS giữ nguyên)', () => {
    expect(eventForResult('c', states.get('c'), false)).toBeNull();
  });

  it('từ chưa có trạng thái → không ghi gì', () => {
    expect(eventForResult('nope', undefined, false)).toBeNull();
  });

  it('sau khi hạ mức, từ vào lại hàng đợi học và rời nhóm thành thạo', () => {
    const demote = eventForResult('a', states.get('a'), false);
    const after = reduceVocabState([...events, ev(demote.type, demote.payload, T0 + 5000)],
      { now: new Date(T0 + 10000) });
    expect(after.get('a').known).toBe(false);
    expect(after.get('a').level).toBe(LEVELS.CONTEXT);
    expect(ids(poolEntries(POOLS.FLUENT, entries, after))).toEqual(['b']);
    const queue = reviewQueue(entries, after, { now: new Date(T0 + 10000) });
    expect(queue.some((item) => item.entry.id === 'a')).toBe(true);
  });
});
