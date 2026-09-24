import { describe, it, expect } from 'vitest';
import { PART_DIRECTIONS, DIRECTIONS_SECONDS, genreOf, setIntro } from '../src/logic/exam-directions.js';
import { PART_ORDER } from '../src/logic/exam.js';

describe('hướng dẫn đầu Part (D67)', () => {
  it('mọi Part của thi thử đều có hướng dẫn, viết bằng tiếng Anh như đề thật', () => {
    for (const part of PART_ORDER) {
      expect(PART_DIRECTIONS[part]).toMatch(/^[A-Z][^À-ỹ]+\.$/);   // không lẫn chữ Việt
    }
  });

  it('Part 2 nói rõ ba lựa chọn, các Part khác bốn', () => {
    expect(PART_DIRECTIONS.part2).toContain('(A), (B), or (C).');
    for (const part of ['part3', 'part4', 'part5', 'part6', 'part7']) expect(PART_DIRECTIONS[part]).toContain('(D)');
  });

  it('thời gian đọc hướng dẫn đủ lướt câu hỏi nhưng ngắn hơn băng thật (~30 giây)', () => {
    expect(DIRECTIONS_SECONDS).toBeGreaterThanOrEqual(5);
    expect(DIRECTIONS_SECONDS).toBeLessThan(30);
  });
});

describe('genreOf: nhãn tự do của nội dung → tên loại văn bản như đề thật', () => {
  it.each([
    ['Email', 'e-mail'], ['Email from Zenith Office Solutions', 'e-mail'], ['Hiring and Interviews Email', 'e-mail'],
    ['MEMORANDUM', 'memo'], ['Office Equipment Repair Memo', 'memo'],
    ['Group Chat', 'online chat discussion'], ['Client Meeting Reschedule Chat', 'online chat discussion'],
    ['Webpage', 'Web page'], ['Press Release', 'press release'], ['Short Article', 'article'],
    ['Business Travel Booking Ad', 'advertisement'], ['Procurement Department Announcement', 'announcement'],
    ['Notice', 'notice'], ['Delayed Shipment Letter', 'letter'], ['Online Complaint Submission Form', 'form'],
    ['Vendor Performance Log (Q1-Q4)', 'report'], ['Service Report Summary', 'report'],
  ])('%s → %s', (label, genre) => {
    expect(genreOf(label)).toBe(genre);
  });

  it('không nhận ra thì trả về "text", không đoán bừa', () => {
    expect(genreOf('ORDER CONFIRMATION #88291')).toBe('text');
    expect(genreOf('')).toBe('text');
    expect(genreOf(undefined)).toBe('text');
  });

  it('"ad" chỉ khớp nguyên chữ — "Department", "Reading" không thành quảng cáo', () => {
    expect(genreOf('Department Update')).toBe('text');
  });
});

describe('setIntro: dòng giới thiệu mỗi bộ', () => {
  const passages = (...labels) => ({ passages: labels.map((label) => ({ label, text: '…' })) });

  it('Part 3: hội thoại; có ba người nói thì ghi rõ', () => {
    const two = { part: 'part3', item: { script: [{ speaker: 'Woman' }, { speaker: 'Man' }, { speaker: 'Woman' }] } };
    const three = { part: 'part3', item: { script: [{ speaker: 'Woman' }, { speaker: 'Man' }, { speaker: 'Man 2' }] } };
    expect(setIntro(two, [32, 33, 34])).toBe('Questions 32–34 refer to the following conversation.');
    expect(setIntro(three, [35, 36, 37])).toBe('Questions 35–37 refer to the following conversation with three speakers.');
  });

  it('Part 4: bài nói', () => {
    expect(setIntro({ part: 'part4', item: {} }, [71, 72, 73])).toBe('Questions 71–73 refer to the following talk.');
  });

  it('Part 6/7: theo loại văn bản; hai, ba văn bản thì liệt kê như đề thật', () => {
    expect(setIntro({ part: 'part6', item: passages('Email') }, [131, 132, 133, 134]))
      .toBe('Questions 131–134 refer to the following e-mail.');
    expect(setIntro({ part: 'part7', item: passages('Internal Announcement', 'Email') }, [176, 177, 178, 179, 180]))
      .toBe('Questions 176–180 refer to the following announcement and e-mail.');
    expect(setIntro({ part: 'part7', item: passages('Webpage', 'Email', 'Online Complaint Submission Form') }, [186, 187, 188, 189, 190]))
      .toBe('Questions 186–190 refer to the following Web page, e-mail, and form.');
  });

  it('các văn bản cùng loại thì gộp số nhiều thay vì lặp "e-mail and e-mail"', () => {
    expect(setIntro({ part: 'part7', item: passages('Email', 'Email Response') }, [181, 182, 183, 184, 185]))
      .toBe('Questions 181–185 refer to the following e-mails.');
  });

  it('bộ một câu thì dùng số ít; chưa có số hiệu thì không in gì', () => {
    expect(setIntro({ part: 'part7', item: passages('Notice') }, [147])).toBe('Question 147 refers to the following notice.');
    expect(setIntro({ part: 'part7', item: passages('Notice') }, [])).toBe('');
    expect(setIntro({ part: 'part7', item: passages('Notice') }, [null, undefined])).toBe('');
  });
});
