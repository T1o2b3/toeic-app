import { describe, it, expect } from 'vitest';
import { suggestSessions, pickTwo } from '../src/logic/suggest.js';
import { createNewCard } from '../src/logic/scheduler.js';

const NOW = new Date('2026-09-23T10:00:00');
const at = (daysAgo) => NOW.getTime() - daysAgo * 86400000;

const entry = (i) => ({ id: `w${i}`, word: `w${i}`, rank: i, vi: 'x' });
const ENTRIES = Array.from({ length: 70 }, (_, i) => entry(i));

/** Trạng thái từ: `due` thẻ đã tới hạn ôn, `fresh` thẻ đã phân loại nhưng chưa học lần nào. */
function states({ due = 0, fresh = 0 } = {}) {
  const map = new Map();
  for (let i = 0; i < due; i += 1) {
    map.set(`w${i}`, {
      triaged: true, known: false, level: 'hard',
      card: { ...createNewCard(NOW), state: 2, due: at(1), reps: 1, lastReview: at(2) },
    });
  }
  for (let i = 0; i < fresh; i += 1) {
    map.set(`w${50 + i}`, { triaged: true, known: false, level: 'again', card: createNewCard(NOW) });
  }
  return map;
}

const question = (i) => ({ id: `p5-${i}`, stem: 'a ___ b', options: { A: 'a', B: 'b', C: 'c', D: 'd' }, answer: 'A', errorType: 'vocabulary' });
const answered = (id, correct, n) => Array.from({ length: n }, () => ({
  type: 'question.answered', ts: at(2), payload: { questionId: id, correct },
}));

const BANKS = {
  questions: [question(1), question(2)],
  listening: [{ id: 'l2-1', audio: {}, responses: { A: 'a', B: 'b', C: 'c' }, answer: 'A' }],
  sets: { 3: [], 4: [], 6: [], 7: [] },
};

const run = (over = {}) => suggestSessions({
  entries: ENTRIES, states: new Map(), quizStates: new Map(), events: [], now: NOW, ...BANKS, ...over,
});

describe('suggestSessions — xếp theo CHỖ ĐANG YẾU', () => {
  it('phần chưa làm câu nào xếp trên phần đang làm tốt', () => {
    // Part 5 đúng 100% (10 câu) còn Part 2 chưa đụng → Part 2 phải lên trước.
    const events = answered('p5-1', true, 10);
    const ranked = run({ events });
    const p2 = ranked.findIndex((s) => s.key === 'part2');
    const p5 = ranked.findIndex((s) => s.key === 'part5');
    expect(p2).toBeLessThan(p5);
    expect(ranked[p2].reason).toContain('chưa làm câu nào');
  });

  it('cùng đã có số liệu thì phần SAI NHIỀU hơn xếp trên', () => {
    const events = [...answered('p5-1', false, 8), ...answered('l2-1', true, 8)];
    const ranked = run({ events });
    expect(ranked.findIndex((s) => s.key === 'part5')).toBeLessThan(ranked.findIndex((s) => s.key === 'part2'));
    expect(ranked.find((s) => s.key === 'part5').reason).toMatch(/đang đúng 0%/);
  });

  it('làm quá ít câu thì nói rõ là chưa đủ để kết luận, không vội xếp là yếu', () => {
    const ranked = run({ events: answered('p5-1', false, 2) });
    expect(ranked.find((s) => s.key === 'part5').reason).toContain('chưa đủ để biết mạnh yếu');
  });

  it('thẻ quá hạn càng nhiều càng lên cao — và vượt mọi phần thi', () => {
    const ranked = run({ states: states({ due: 25 }), events: answered('p5-1', false, 10) });
    expect(ranked[0].key).toBe('review');
    expect(ranked[0].reason).toContain('25 thẻ');
  });

  it('không còn thẻ đến hạn thì gợi ý từ mới, nhưng nhường chỗ cho phần thi đang yếu', () => {
    const ranked = run({ states: states({ fresh: 6 }), events: answered('p5-1', false, 10) });
    const review = ranked.find((s) => s.key === 'review');
    expect(review.title).toBe('Học từ mới');
    expect(ranked.findIndex((s) => s.key === 'part5')).toBeLessThan(ranked.indexOf(review));
  });

  it('vài thẻ quá hạn là việc vặt — KHÔNG chen lên trước phần thi chưa làm bao giờ', () => {
    const ranked = run({ states: states({ due: 3 }) });
    expect(ranked.findIndex((s) => s.key === 'part2')).toBeLessThan(ranked.findIndex((s) => s.key === 'review'));
  });

  it('hàng đợi học CẠN thì phân loại được đẩy lên cao; còn việc học thì nó chờ', () => {
    const canKiet = run({ states: new Map() });                       // chưa phân loại từ nào → hàng đợi rỗng
    expect(canKiet.find((s) => s.key === 'triage').reason).toContain('cạn');
    const conViec = run({ states: states({ due: 20 }) });
    const t = conViec.findIndex((s) => s.key === 'triage');
    expect(conViec[t].reason).not.toContain('cạn');
    expect(conViec.findIndex((s) => s.key === 'review')).toBeLessThan(t);
  });

  it('phân loại hết cả deck thì không gợi ý phân loại nữa', () => {
    const allKnown = new Map(ENTRIES.map((e) => [e.id, { triaged: true, known: true, level: 'easy' }]));
    const ranked = suggestSessions({
      entries: ENTRIES, states: allKnown, quizStates: new Map(), events: [], now: NOW, ...BANKS,
    });
    expect(ranked.find((s) => s.key === 'triage')).toBeUndefined();
  });

  it('chỉ gợi ý việc thật sự làm được — ngân hàng rỗng thì không xuất hiện', () => {
    const keys = run({ questions: [], listening: [] }).map((s) => s.key);
    expect(keys).not.toContain('part5');
    expect(keys).not.toContain('part2');
  });

  it('mọi gợi ý đều có đường dẫn, thời lượng và LÝ DO', () => {
    for (const s of run()) {
      expect(s.path).toMatch(/^\//);
      expect(s.note).toMatch(/phút/);
      expect(s.reason.length).toBeGreaterThan(5);
      expect(s.need).toBeGreaterThan(0);
    }
  });
});

describe('pickTwo — hai lựa chọn phải KHÁC LOẠI nhau', () => {
  const s = (key, need) => ({ key, need });

  it('không đưa ra hai việc cùng một loại khi còn loại khác', () => {
    const picked = pickTwo([s('part2', 90), s('part3', 85), s('part5', 40)]);
    expect(picked.map((x) => x.key)).toEqual(['part2', 'part5']);   // nghe + đọc, không phải hai phần nghe
  });

  it('ôn thẻ và phân loại tính chung là "từ vựng"', () => {
    const picked = pickTwo([s('review', 90), s('triage', 80), s('part5', 50)]);
    expect(picked.map((x) => x.key)).toEqual(['review', 'part5']);
  });

  it('chỉ còn một loại thì lấy hai mục đầu', () => {
    expect(pickTwo([s('part2', 90), s('part3', 80)]).map((x) => x.key)).toEqual(['part2', 'part3']);
  });

  it('một gợi ý thì trả một, rỗng thì trả rỗng', () => {
    expect(pickTwo([s('review', 90)])).toHaveLength(1);
    expect(pickTwo([])).toHaveLength(0);
  });
});
