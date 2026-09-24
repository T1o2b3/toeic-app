import { describe, it, expect } from 'vitest';
import {
  PART_DIRECTIONS, DIRECTIONS_SECONDS, QUESTION_PAUSE_MS, genreOf, setIntro, narrationTexts, narrationSteps,
} from '../src/logic/exam-directions.js';
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

describe('lời băng đọc (D69)', () => {
  const set = (id, part, stems, speakers = ['Woman', 'Man']) => ({
    id, part, status: 'active', script: speakers.map((speaker) => ({ speaker, text: '…' })),
    questions: stems.map((stem, i) => ({ id: `${id}-${i + 1}`, stem })),
  });
  const unitOf = (s) => ({ kind: 'set', part: `part${s.part}`, id: s.id, item: s, questions: s.questions });

  it('bản ĐỌC của câu giới thiệu nói "32 through 34" như băng thật, bản in giữ "32–34"', () => {
    const unit = unitOf(set('p3-1', 3, ['A?', 'B?', 'C?']));
    expect(setIntro(unit, [32, 33, 34], { spoken: true })).toBe('Questions 32 through 34 refer to the following conversation.');
    expect(setIntro(unit, [32, 33, 34])).toBe('Questions 32–34 refer to the following conversation.');
  });

  it('narrationTexts: hướng dẫn Part 2–4, câu giới thiệu cho MỌI vị trí bộ, và mọi câu hỏi Part 3/4 — không trùng', () => {
    const texts = narrationTexts({
      3: [set('p3-1', 3, ['What is the problem?', 'Who is the man?', 'What will the man do next?'])],
      4: [set('p4-1', 4, ['Who is the speaker?', 'Why is the call?', 'What will the man do next?'], ['Speaker'])],
    });
    expect(texts).toEqual([...new Set(texts)]);
    for (const part of ['part2', 'part3', 'part4']) expect(texts).toContain(PART_DIRECTIONS[part]);
    expect(texts).toContain('Questions 32 through 34 refer to the following conversation.');
    expect(texts).toContain('Questions 68 through 70 refer to the following conversation with three speakers.');
    expect(texts).toContain('Questions 71 through 73 refer to the following talk.');
    expect(texts).toContain('Questions 98 through 100 refer to the following talk.');
    expect(texts).not.toContain('Questions 101 through 103 refer to the following talk.');
    expect(texts.filter((t) => t === 'What will the man do next?')).toHaveLength(1);
    expect(texts.length).toBe(3 + 13 * 2 + 10 + 5);
  });

  it('câu hỏi của bộ đã rút (retired) không cần giọng đọc', () => {
    const retired = { ...set('p3-9', 3, ['Retired question?']), status: 'retired' };
    expect(narrationTexts({ 3: [retired], 4: [] })).not.toContain('Retired question?');
  });

  describe('narrationSteps', () => {
    const unit = unitOf(set('p3-1', 3, ['Q one?', 'Q two?', 'Q three?']));
    const full = {
      [PART_DIRECTIONS.part3]: 'audio/d.mp3',
      'Questions 32 through 34 refer to the following conversation.': 'audio/i.mp3',
      'Q one?': 'audio/1.mp3', 'Q two?': 'audio/2.mp3', 'Q three?': 'audio/3.mp3',
    };
    const srcs = (steps) => steps.filter((s) => s.type === 'clip').map((s) => s.src);

    it('đầu Part: đọc hướng dẫn → giới thiệu bộ; sau hội thoại: đọc từng câu hỏi, mỗi câu 8 giây trả lời', () => {
      const tape = narrationSteps(unit, [32, 33, 34], full, { partStart: true });
      expect(srcs(tape.before)).toEqual(['/audio/d.mp3', '/audio/i.mp3']);
      expect(srcs(tape.after)).toEqual(['/audio/1.mp3', '/audio/2.mp3', '/audio/3.mp3']);
      expect(tape.after.filter((s) => s.type === 'gap' && s.ms === QUESTION_PAUSE_MS)).toHaveLength(3);
      expect(QUESTION_PAUSE_MS).toBe(8000);
      expect(tape).toMatchObject({ directions: true, narrated: true });
    });

    it('giữa Part thì không đọc lại hướng dẫn', () => {
      const tape = narrationSteps(unit, [32, 33, 34], full);
      expect(srcs(tape.before)).toEqual(['/audio/i.mp3']);
      expect(tape.directions).toBe(false);
    });

    it('thiếu giọng đọc dù MỘT câu hỏi thì không đọc câu nào — băng quay về đếm khoảng trả lời như cũ', () => {
      const { 'Q two?': _, ...partial } = full;
      const tape = narrationSteps(unit, [32, 33, 34], partial);
      expect(tape.after).toEqual([]);
      expect(tape.narrated).toBe(false);
    });

    it('chưa sinh giọng đọc (narration rỗng): không thêm gì', () => {
      expect(narrationSteps(unit, [32, 33, 34], {}, { partStart: true })).toEqual({ before: [], after: [], directions: false, narrated: false });
    });

    it('Part 2: chỉ có hướng dẫn đầu Part, không có giới thiệu bộ hay đọc câu hỏi', () => {
      const part2 = { kind: 'single', part: 'part2', item: {}, questions: [{ id: 'l2-1', question: '…' }] };
      const tape = narrationSteps(part2, [7], { [PART_DIRECTIONS.part2]: 'audio/p2.mp3' }, { partStart: true });
      expect(srcs(tape.before)).toEqual(['/audio/p2.mp3']);
      expect(tape).toMatchObject({ after: [], narrated: false, directions: true });
    });
  });
});

