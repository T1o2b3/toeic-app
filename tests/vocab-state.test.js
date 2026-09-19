import { describe, it, expect } from 'vitest';
import {
  reduceVocabState, getWordState, triageQueue, reviewQueue, weakWords,
} from '../src/logic/vocab-state.js';

const T0 = Date.UTC(2026, 8, 19, 10, 0, 0);
const ev = (type, payload, ts = T0) => ({ id: `e-${ts}-${type}`, deviceId: 'mac', ts, type, payload });
const NOW = new Date(T0 + 60_000);
const DECK = [{ id: 'tsl-0001' }, { id: 'tsl-0002' }, { id: 'tsl-0003' }];
const DECK_WITH_RETIRED = [...DECK, { id: 'tsl-0004', status: 'retired' }];

describe('reduceVocabState', () => {
  it('nhật ký rỗng thì không có trạng thái nào', () => {
    expect(reduceVocabState([]).size).toBe(0);
    expect(reduceVocabState(undefined).size).toBe(0);
  });

  it('ghi nhận triage biết / chưa biết', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', { wordId: 'tsl-0001', known: true }),
      ev('vocab.triaged', { wordId: 'tsl-0002', known: false }),
    ]);
    expect(states.get('tsl-0001')).toMatchObject({ triaged: true, known: true });
    expect(states.get('tsl-0002')).toMatchObject({ triaged: true, known: false });
  });

  it('đếm số lần ôn và số lần quên (để highlight từ hay sai)', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', { wordId: 'w', known: false }, T0),
      ev('vocab.reviewed', { wordId: 'w', grade: 'good' }, T0 + 1000),
      ev('vocab.reviewed', { wordId: 'w', grade: 'again' }, T0 + 2000),
      ev('vocab.reviewed', { wordId: 'w', grade: 'again' }, T0 + 3000),
    ]);
    expect(states.get('w')).toMatchObject({ reviews: 3, lapses: 2, lastGrade: 'again' });
  });

  it('ôn lại một từ từng đánh dấu "đã biết" thì đưa nó trở lại danh sách học', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', { wordId: 'w', known: true }, T0),
      ev('vocab.reviewed', { wordId: 'w', grade: 'again' }, T0 + 1000),
    ]);
    expect(states.get('w').known).toBe(false);
  });

  it('bookmark bật rồi tắt được', () => {
    const states = reduceVocabState([
      ev('vocab.bookmarked', { wordId: 'w', bookmarked: true }, T0),
      ev('vocab.bookmarked', { wordId: 'w', bookmarked: false }, T0 + 1),
    ]);
    expect(states.get('w').bookmarked).toBe(false);
  });

  it('bỏ qua sự kiện thiếu wordId, loại lạ, hoặc mức đánh giá lạ', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', {}, T0),
      ev('session.started', { wordId: 'w' }, T0 + 1),
      ev('vocab.reviewed', { wordId: 'w', grade: 'sieu-de' }, T0 + 2),
    ]);
    expect(states.get('w')?.reviews ?? 0).toBe(0);
  });

  it('cùng một nhật ký luôn cho ra cùng kết quả (tính lại được, D23)', () => {
    const events = [
      ev('vocab.triaged', { wordId: 'w', known: false }, T0),
      ev('vocab.reviewed', { wordId: 'w', grade: 'good' }, T0 + 1000),
    ];
    expect(JSON.stringify([...reduceVocabState(events)]))
      .toBe(JSON.stringify([...reduceVocabState(events)]));
  });
});

describe('getWordState', () => {
  it('từ chưa có sự kiện vẫn trả về trạng thái mặc định', () => {
    const state = getWordState(new Map(), 'tsl-9999', { now: NOW });
    expect(state).toMatchObject({ wordId: 'tsl-9999', triaged: false, reviews: 0 });
  });
});

describe('triageQueue', () => {
  it('chỉ lấy từ chưa phân loại, giữ thứ tự deck', () => {
    const states = reduceVocabState([ev('vocab.triaged', { wordId: 'tsl-0002', known: true })]);
    expect(triageQueue(DECK, states).map((e) => e.id)).toEqual(['tsl-0001', 'tsl-0003']);
  });

  it('bỏ qua mục đã gỡ (D16: không sửa mục đã phát hành, chỉ đánh dấu retired)', () => {
    const ids = triageQueue(DECK_WITH_RETIRED, new Map()).map((e) => e.id);
    expect(ids).not.toContain('tsl-0004');
    expect(ids).toHaveLength(3);
  });

  it('cắt theo số lượng yêu cầu', () => {
    expect(triageQueue(DECK, new Map(), 2)).toHaveLength(2);
  });
});

describe('reviewQueue', () => {
  it('bỏ từ chưa triage và từ đã đánh dấu đã biết', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', { wordId: 'tsl-0001', known: true }),
      ev('vocab.triaged', { wordId: 'tsl-0002', known: false }),
    ]);
    expect(reviewQueue(DECK, states, { now: NOW }).map((i) => i.entry.id)).toEqual(['tsl-0002']);
  });

  it('từ đến hạn xếp trước từ mới', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', { wordId: 'tsl-0001', known: false }, T0),
      ev('vocab.reviewed', { wordId: 'tsl-0001', grade: 'again' }, T0),
      ev('vocab.triaged', { wordId: 'tsl-0002', known: false }, T0),
    ]);
    const queue = reviewQueue(DECK, states, { now: new Date(T0 + 3 * 24 * 3600_000) });
    expect(queue[0].entry.id).toBe('tsl-0001');
    expect(queue[0].isNew).toBe(false);
    expect(queue.at(-1).isNew).toBe(true);
  });

  it('không đưa mục đã gỡ vào hàng đợi ôn, kể cả khi đã từng học', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', { wordId: 'tsl-0004', known: false }, T0),
    ]);
    expect(reviewQueue(DECK_WITH_RETIRED, states, { now: NOW }).map((i) => i.entry.id))
      .not.toContain('tsl-0004');
  });

  it('giới hạn số từ mới mỗi phiên (D03: nhịp học ngắn)', () => {
    const states = reduceVocabState(
      DECK.map((e, i) => ev('vocab.triaged', { wordId: e.id, known: false }, T0 + i)),
    );
    expect(reviewQueue(DECK, states, { now: NOW, maxNew: 2 })).toHaveLength(2);
  });

  it('giới hạn tổng số thẻ mỗi phiên', () => {
    const states = reduceVocabState(
      DECK.map((e, i) => ev('vocab.triaged', { wordId: e.id, known: false }, T0 + i)),
    );
    expect(reviewQueue(DECK, states, { now: NOW, maxNew: 10, maxTotal: 1 })).toHaveLength(1);
  });
});

describe('weakWords', () => {
  it('xếp từ quên nhiều lên trước, bỏ từ chưa từng quên', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', { wordId: 'a', known: false }, T0),
      ev('vocab.reviewed', { wordId: 'a', grade: 'again' }, T0 + 1),
      ev('vocab.triaged', { wordId: 'b', known: false }, T0 + 2),
      ev('vocab.reviewed', { wordId: 'b', grade: 'again' }, T0 + 3),
      ev('vocab.reviewed', { wordId: 'b', grade: 'again' }, T0 + 4),
      ev('vocab.triaged', { wordId: 'c', known: false }, T0 + 5),
      ev('vocab.reviewed', { wordId: 'c', grade: 'good' }, T0 + 6),
    ]);
    expect(weakWords(states).map((w) => w.wordId)).toEqual(['b', 'a']);
  });
});
