import { describe, it, expect } from 'vitest';
import {
  reduceVocabState, getWordState, triageQueue, reviewQueue, weakWords,
  countUntriaged, reviewCounts,
} from '../src/logic/vocab-state.js';
import { T0, eventMaker } from './helpers/events.js';

const ev = eventMaker();
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

  describe('có hạt giống (D65): xáo theo lượt, trộn từ mới với từ đến hạn', () => {
    const BIG = Array.from({ length: 60 }, (_, i) => ({ id: `tsl-${String(i).padStart(4, '0')}` }));
    // 30 từ đã ôn (đến hạn sau 3 ngày), 30 từ mới — đều đã triage "chưa biết".
    const states = reduceVocabState(BIG.flatMap((e, i) => [
      ev('vocab.triaged', { wordId: e.id, known: false }, T0 + i),
      ...(i < 30 ? [ev('vocab.reviewed', { wordId: e.id, grade: 'again' }, T0 + 100 + i)] : []),
    ]));
    const later = new Date(T0 + 3 * 24 * 3600_000);
    const queue = (seed, opts = {}) => reviewQueue(BIG, states, { now: later, seed, ...opts });

    it('không còn đi tuyến tính; cùng hạt giống thì cùng thứ tự, khác hạt giống thì khác', () => {
      const ids = (q) => q.map((x) => x.entry.id);
      expect(ids(queue(1))).toEqual(ids(queue(1)));
      expect(ids(queue(1))).not.toEqual(ids(queue(2)));
      expect(ids(queue(1)).slice(0, 5)).not.toEqual(['tsl-0000', 'tsl-0001', 'tsl-0002', 'tsl-0003', 'tsl-0004']);
    });

    it('từ mới xen giữa từ đến hạn chứ không dồn cuối; vẫn giữ hạn mức từ mới', () => {
      const q = queue(3);
      expect(q.filter((x) => x.isNew)).toHaveLength(10);
      expect(q.slice(0, 20).some((x) => x.isNew)).toBe(true);
    });

    it('chạm trần tổng số thẻ thì thẻ ĐẾN HẠN được giữ trước (quên từ đã học tốn công hơn học từ mới)', () => {
      const q = queue(4, { maxTotal: 25 });
      expect(q).toHaveLength(25);
      expect(q.every((x) => !x.isNew)).toBe(true);
    });
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

describe('countUntriaged / reviewCounts — bộ đếm KHÔNG bị cắt', () => {
  // Lỗi thật đã gặp hai lần: màn hình lấy độ dài hàng đợi làm "số việc còn lại".
  // Hàng đợi là cửa sổ trượt nên con số đó đứng yên. Hai hàm này phải trả số ĐẦY ĐỦ.
  const BIG_DECK = Array.from({ length: 100 }, (_, i) => ({ id: `w-${i}` }));

  it('countUntriaged trả số thật, trong khi triageQueue(limit) đứng yên ở limit', () => {
    const states = reduceVocabState([ev('vocab.triaged', { wordId: 'w-0', known: false })]);
    expect(triageQueue(BIG_DECK, states, 20)).toHaveLength(20);   // cửa sổ trượt: vẫn 20
    expect(countUntriaged(BIG_DECK, states)).toBe(99);            // số thật: đã giảm
  });

  it('countUntriaged bỏ qua mục đã gỡ (D16)', () => {
    expect(countUntriaged(DECK_WITH_RETIRED, new Map())).toBe(3);
  });

  it('reviewCounts trả số từ mới thật, trong khi reviewQueue cắt ở maxNew', () => {
    const states = reduceVocabState(BIG_DECK.map((e) => ev('vocab.triaged', { wordId: e.id, known: false })));
    expect(reviewQueue(BIG_DECK, states, { now: NOW })).toHaveLength(10); // cửa sổ trượt
    expect(reviewCounts(BIG_DECK, states, { now: NOW })).toEqual({ due: 0, fresh: 100 });
  });

  it('reviewCounts tách thẻ đến hạn khỏi từ mới', () => {
    const states = reduceVocabState([
      ev('vocab.triaged', { wordId: 'tsl-0001', known: false }, T0),
      ev('vocab.reviewed', { wordId: 'tsl-0001', grade: 'good' }, T0 + 1000),
      ev('vocab.triaged', { wordId: 'tsl-0002', known: false }, T0),
      ev('vocab.triaged', { wordId: 'tsl-0003', known: true }, T0),
    ]);
    // tsl-0001 đã ôn -> hạn ở tương lai, chưa đến hạn; tsl-0002 còn mới; tsl-0003 đã biết -> bỏ.
    expect(reviewCounts(DECK, states, { now: NOW })).toEqual({ due: 0, fresh: 1 });
    // Một năm sau thì thẻ đã ôn đến hạn.
    const later = new Date(T0 + 400 * 24 * 3600 * 1000);
    expect(reviewCounts(DECK, states, { now: later })).toEqual({ due: 1, fresh: 1 });
  });
});
