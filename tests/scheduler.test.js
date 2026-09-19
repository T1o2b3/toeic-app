import { describe, it, expect } from 'vitest';
import { createNewCard, reviewCard, isDue, isNew, dueItems, GRADES } from '../src/logic/scheduler.js';

const NOW = new Date('2026-09-19T10:00:00.000Z');
const later = (minutes) => new Date(NOW.getTime() + minutes * 60_000);

describe('createNewCard', () => {
  it('thẻ mới thì đến hạn ngay và đánh dấu là mới', () => {
    const card = createNewCard(NOW);
    expect(isNew(card)).toBe(true);
    expect(isDue(card, NOW)).toBe(true);
  });

  it('trả về dữ liệu thuần (lưu IndexedDB / gửi qua mạng được)', () => {
    const card = createNewCard(NOW);
    expect(typeof card.due).toBe('string');
    expect(JSON.parse(JSON.stringify(card))).toEqual(card);
  });
});

describe('reviewCard', () => {
  it('nhớ tốt nhiều lần thì khoảng cách ôn giãn dần ra', () => {
    let card = createNewCard(NOW);
    card = reviewCard(card, GRADES.GOOD, NOW);
    const firstGap = new Date(card.due) - NOW;

    const secondReview = later(60 * 24);
    card = reviewCard(card, GRADES.GOOD, secondReview);
    const secondGap = new Date(card.due) - secondReview;

    expect(secondGap).toBeGreaterThan(firstGap);
  });

  it('quên (again) làm giảm độ bền trí nhớ và kéo hạn ôn về gần', () => {
    let card = reviewCard(createNewCard(NOW), GRADES.GOOD, NOW);
    const strong = card.stability;

    card = reviewCard(card, GRADES.AGAIN, later(60 * 24));
    expect(card.stability).toBeLessThan(strong);
    expect(new Date(card.due) - later(60 * 24)).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it('easy cho khoảng cách dài hơn good', () => {
    const base = createNewCard(NOW);
    const good = reviewCard(base, GRADES.GOOD, NOW);
    const easy = reviewCard(base, GRADES.EASY, NOW);
    expect(new Date(easy.due).getTime()).toBeGreaterThan(new Date(good.due).getTime());
  });

  it('sau lần ôn đầu thì không còn là thẻ mới', () => {
    expect(isNew(reviewCard(createNewCard(NOW), GRADES.GOOD, NOW))).toBe(false);
  });

  it('không nhận mức đánh giá lạ', () => {
    expect(() => reviewCard(createNewCard(NOW), 'sieu-de', NOW)).toThrow(/không hợp lệ/);
  });

  it('không sửa thẻ cũ mà trả về thẻ mới (tính lại được từ nhật ký, D23)', () => {
    const card = createNewCard(NOW);
    const snapshot = JSON.stringify(card);
    reviewCard(card, GRADES.GOOD, NOW);
    expect(JSON.stringify(card)).toBe(snapshot);
  });
});

describe('dueItems', () => {
  it('chỉ lấy thẻ đến hạn, quá hạn lâu nhất lên trước', () => {
    const items = [
      { id: 'a', card: { due: '2026-09-19T12:00:00.000Z' } },
      { id: 'b', card: { due: '2026-09-18T08:00:00.000Z' } },
      { id: 'c', card: { due: '2026-09-19T09:00:00.000Z' } },
    ];
    expect(dueItems(items, NOW).map((i) => i.id)).toEqual(['b', 'c']);
  });

  it('không có thẻ nào đến hạn thì trả mảng rỗng', () => {
    expect(dueItems([{ card: { due: '2027-01-01T00:00:00.000Z' } }], NOW)).toEqual([]);
  });
});
