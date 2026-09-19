import { describe, it, expect } from 'vitest';
import {
  LEVELS, LEVEL_ORDER, LEVEL_INFO,
  needsStudy, studyPriority, levelFromPayload, payloadForLevel, countByLevel,
} from '../src/logic/vocab-levels.js';
import { reduceVocabState, reviewQueue } from '../src/logic/vocab-state.js';

const T0 = Date.UTC(2026, 8, 19, 10, 0, 0);
const ev = (type, payload, ts = T0) => ({ id: `e-${ts}-${type}-${payload.wordId}`, deviceId: 'mac', ts, type, payload });

describe('định nghĩa 4 mức', () => {
  it('mỗi mức có nhãn và phím tắt riêng', () => {
    expect(LEVEL_ORDER).toHaveLength(4);
    const keys = LEVEL_ORDER.map((level) => LEVEL_INFO[level].key);
    expect(keys).toEqual(['1', '2', '3', '4']);
    expect(new Set(keys).size).toBe(4);
  });

  it('chỉ mức thành thạo mới được bỏ qua', () => {
    expect(needsStudy(LEVELS.UNKNOWN)).toBe(true);
    expect(needsStudy(LEVELS.CONTEXT)).toBe(true);
    expect(needsStudy(LEVELS.SPELLING)).toBe(true);
    expect(needsStudy(LEVELS.FLUENT)).toBe(false);
  });

  it('thứ tự học: chưa biết gì được học trước', () => {
    expect(studyPriority(LEVELS.UNKNOWN)).toBeLessThan(studyPriority(LEVELS.CONTEXT));
    expect(studyPriority(LEVELS.CONTEXT)).toBeLessThan(studyPriority(LEVELS.SPELLING));
    expect(studyPriority('rác')).toBe(0); // giá trị lạ thì coi như chưa biết, học trước cho chắc
  });
});

describe('tương thích ngược với nhật ký cũ (ràng buộc #5)', () => {
  // Nhật ký là append-only. Sự kiện Huy đã ghi bằng bản app cũ chỉ có {known}
  // và phải đọc đúng mãi mãi — không được sửa nhật ký cũ.
  it('sự kiện cũ {known: true} đọc thành thành thạo', () => {
    expect(levelFromPayload({ known: true })).toBe(LEVELS.FLUENT);
  });

  it('sự kiện cũ {known: false} đọc thành không biết', () => {
    expect(levelFromPayload({ known: false })).toBe(LEVELS.UNKNOWN);
  });

  it('payload rỗng hoặc mức lạ thì coi như chưa biết, không được ném lỗi', () => {
    expect(levelFromPayload({})).toBe(LEVELS.UNKNOWN);
    expect(levelFromPayload(undefined)).toBe(LEVELS.UNKNOWN);
    expect(levelFromPayload({ level: 'sieu-gioi' })).toBe(LEVELS.UNKNOWN);
  });

  it('có level thì dùng level, bỏ qua known kèm theo', () => {
    expect(levelFromPayload({ level: LEVELS.CONTEXT, known: true })).toBe(LEVELS.CONTEXT);
  });

  // Chiều ngược lại: bản app CŨ trên iPhone đọc sự kiện MỚI vẫn phải xếp đúng chỗ.
  it('sự kiện mới luôn kèm known để bản app cũ hiểu được', () => {
    expect(payloadForLevel('w', LEVELS.FLUENT)).toEqual({ wordId: 'w', level: 'fluent', known: true });
    expect(payloadForLevel('w', LEVELS.SPELLING)).toEqual({ wordId: 'w', level: 'spelling', known: false });
    expect(payloadForLevel('w', LEVELS.CONTEXT)).toEqual({ wordId: 'w', level: 'context', known: false });
    expect(payloadForLevel('w', LEVELS.UNKNOWN)).toEqual({ wordId: 'w', level: 'unknown', known: false });
  });

  it('mức lạ lọt vào thì hạ về "không biết" chứ không ghi bừa', () => {
    expect(payloadForLevel('w', 'rác')).toEqual({ wordId: 'w', level: 'unknown', known: false });
  });

  it('known của sự kiện mới luôn khớp với needsStudy — đây là điều kiện để hai bản app không lệch nhau', () => {
    for (const level of LEVEL_ORDER) {
      expect(payloadForLevel('w', level).known).toBe(!needsStudy(level));
    }
  });
});

describe('4 mức chạy qua reducer trạng thái', () => {
  it('nhật ký trộn lẫn sự kiện cũ và mới vẫn ra đúng', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', { wordId: 'a', known: true }, T0),                       // bản cũ
      ev('vocab.triaged', { wordId: 'b', known: false }, T0 + 1),                  // bản cũ
      ev('vocab.triaged', payloadForLevel('c', LEVELS.CONTEXT), T0 + 2),           // bản mới
      ev('vocab.triaged', payloadForLevel('d', LEVELS.SPELLING), T0 + 3),          // bản mới
    ]);
    expect(states.get('a')).toMatchObject({ level: LEVELS.FLUENT, known: true });
    expect(states.get('b')).toMatchObject({ level: LEVELS.UNKNOWN, known: false });
    expect(states.get('c')).toMatchObject({ level: LEVELS.CONTEXT, known: false });
    expect(states.get('d')).toMatchObject({ level: LEVELS.SPELLING, known: false });
  });

  it('chấm lại một từ thì mức mới đè lên mức cũ', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', payloadForLevel('w', LEVELS.FLUENT), T0),
      ev('vocab.triaged', payloadForLevel('w', LEVELS.UNKNOWN), T0 + 1),
    ]);
    expect(states.get('w')).toMatchObject({ level: LEVELS.UNKNOWN, known: false });
  });

  it('ôn một từ đã đánh "thành thạo" thì hạ xuống mức quên chính tả', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', payloadForLevel('w', LEVELS.FLUENT), T0),
      ev('vocab.reviewed', { wordId: 'w', grade: 'again' }, T0 + 1000),
    ]);
    expect(states.get('w')).toMatchObject({ level: LEVELS.SPELLING, known: false });
  });

  it('từ chưa biết gì được xếp học trước từ đã đoán được nghĩa', () => {
    const deck = [{ id: 'ngu-canh' }, { id: 'chua-biet' }];   // thứ tự deck cố tình ngược lại
    const states = reduceVocabState([
      ev('vocab.triaged', payloadForLevel('ngu-canh', LEVELS.CONTEXT), T0),
      ev('vocab.triaged', payloadForLevel('chua-biet', LEVELS.UNKNOWN), T0 + 1),
    ]);
    const queue = reviewQueue(deck, states, { now: new Date(T0 + 60_000) });
    expect(queue.map((item) => item.entry.id)).toEqual(['chua-biet', 'ngu-canh']);
  });

  it('từ thành thạo không vào hàng đợi ôn', () => {
    const deck = [{ id: 'w' }];
    const states = reduceVocabState([ev('vocab.triaged', payloadForLevel('w', LEVELS.FLUENT), T0)]);
    expect(reviewQueue(deck, states, { now: new Date(T0 + 60_000) })).toEqual([]);
  });
});

describe('countByLevel', () => {
  it('luôn trả đủ 4 khoá kể cả khi chưa phân loại gì', () => {
    expect(countByLevel(new Map())).toEqual({ unknown: 0, context: 0, spelling: 0, fluent: 0 });
  });

  it('đếm đúng theo từng mức, bỏ qua từ chưa phân loại', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', payloadForLevel('a', LEVELS.UNKNOWN), T0),
      ev('vocab.triaged', payloadForLevel('b', LEVELS.UNKNOWN), T0 + 1),
      ev('vocab.triaged', payloadForLevel('c', LEVELS.FLUENT), T0 + 2),
      ev('vocab.bookmarked', { wordId: 'd', bookmarked: true }, T0 + 3), // chưa phân loại
    ]);
    expect(countByLevel(states)).toEqual({ unknown: 2, context: 0, spelling: 0, fluent: 1 });
  });
});
