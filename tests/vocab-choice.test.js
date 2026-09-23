import { describe, it, expect } from 'vitest';
import { buildChoice, shortGloss, blankOut } from '../src/logic/vocab-choice.js';
import { seededRandom } from '../src/logic/shuffle.js';
import { collocationEntries } from '../src/logic/collocations.js';

const word = (id, w, vi, pos = 'noun', rank = 100, extra = {}) => ({ id, word: w, vi, pos: [pos], rank, deck: 'toeic-tsl', ...extra });
const DECK = [
  word('t1', 'client', 'khách hàng', 'noun', 100, { synonyms: ['customer'] }),
  word('t2', 'customer', 'khách hàng, người mua', 'noun', 101),
  word('t3', 'invoice', 'hoá đơn', 'noun', 102),
  word('t4', 'warehouse', 'nhà kho', 'noun', 103),
  word('t5', 'deadline', 'hạn chót', 'noun', 104),
  word('t6', 'fringe', 'vùng rìa, phúc lợi phụ (fringe benefits)', 'noun', 105),
  word('t7', 'approve', 'phê duyệt', 'verb', 106),
  word('t8', 'budget', 'ngân sách', 'noun', 900),
  word('t9', 'retiredword', 'từ đã gỡ', 'noun', 99, { status: 'retired' }),
];
const COLLOC = collocationEntries([
  { id: 'col-0001', chunk: 'make a decision', vi: 'ra quyết định', theme: 'Động từ + danh từ', wrong: 'do a decision', example: 'The board will make a decision by Friday.' },
  { id: 'col-0002', chunk: 'make an appointment', vi: 'đặt lịch hẹn', theme: 'Động từ + danh từ', wrong: 'take an appointment' },
  { id: 'col-0003', chunk: 'comply with', vi: 'tuân thủ', theme: 'Động từ + giới từ', wrong: 'comply to' },
  { id: 'col-0004', chunk: 'in charge of', vi: 'phụ trách', theme: 'Giới từ', wrong: 'in charge for' },
]);
const POOL = [...DECK, ...COLLOC];
const texts = (choice) => Object.values(choice.options);

describe('shortGloss — nghĩa ngắn làm lựa chọn', () => {
  it('bỏ phần trong ngoặc (có chỗ lộ đáp án tiếng Anh)', () => {
    expect(shortGloss('vùng rìa, phúc lợi phụ (fringe benefits)')).toBe('vùng rìa, phúc lợi phụ');
    expect(shortGloss('hoá đơn')).toBe('hoá đơn');
  });
});

describe('buildChoice — từ: hiện tiếng Anh, chọn nghĩa tiếng Việt', () => {
  it('4 lựa chọn khác nhau, đúng 1 là nghĩa của từ, đáp án rơi vào đủ các vị trí qua nhiều lần', () => {
    const seen = new Set();
    for (let s = 1; s <= 30; s += 1) {
      const choice = buildChoice(DECK[2], POOL, seededRandom(s));
      expect(choice.kind).toBe('word');
      expect(texts(choice)).toHaveLength(4);
      expect(new Set(texts(choice)).size).toBe(4);
      expect(choice.options[choice.answer]).toBe('hoá đơn');
      seen.add(choice.answer);
    }
    expect(seen).toEqual(new Set(['A', 'B', 'C', 'D']));
  });

  it('không lấy nghĩa trùng/đồng nghĩa làm phương án nhiễu (không được có hai đáp án cùng đúng)', () => {
    for (let s = 1; s <= 30; s += 1) {
      const options = texts(buildChoice(DECK[0], POOL, seededRandom(s)));
      expect(options.filter((t) => t.includes('khách hàng'))).toHaveLength(1);
    }
  });

  it('ưu tiên cùng từ loại, không lấy từ đã gỡ, không lấy cụm từ', () => {
    for (let s = 1; s <= 20; s += 1) {
      const options = texts(buildChoice(DECK[3], POOL, seededRandom(s)));
      expect(options).not.toContain('phê duyệt');      // động từ — còn đủ danh từ thì không lấy
      expect(options).not.toContain('từ đã gỡ');
      expect(options).not.toContain('ra quyết định');
    }
  });

  it('lựa chọn đã bỏ phần trong ngoặc', () => {
    const choice = buildChoice(DECK[5], POOL, seededRandom(1));
    expect(choice.options[choice.answer]).toBe('vùng rìa, phúc lợi phụ');
  });
});

describe('buildChoice — cụm từ: hiện nghĩa tiếng Việt, chọn ĐÚNG cụm', () => {
  it('luôn có dạng sai hay mắc trong các lựa chọn; đáp án là cụm đúng; ví dụ bị che đúng chỗ cụm', () => {
    for (let s = 1; s <= 20; s += 1) {
      const choice = buildChoice(COLLOC[0], POOL, seededRandom(s));
      expect(choice.kind).toBe('colloc');
      expect(choice.options[choice.answer]).toBe('make a decision');
      expect(texts(choice)).toContain('do a decision');
      expect(new Set(texts(choice)).size).toBe(texts(choice).length);
    }
    expect(buildChoice(COLLOC[0], POOL, seededRandom(1)).example).toBe('The board will ______ by Friday.');
  });

  it('blankOut: không tìm thấy cụm trong câu thì không trả câu (khỏi lộ đáp án)', () => {
    expect(blankOut('We Make A Decision today.', 'make a decision')).toBe('We ______ today.');
    expect(blankOut('Nothing here.', 'make a decision')).toBe(null);
  });
});
