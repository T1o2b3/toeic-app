import { describe, it, expect } from 'vitest';
import {
  PART2_TYPES, PART2_TYPE_DEFINITIONS, buildPart2Prompt, buildPart2VerifyPrompt, part2Key, isWellFormedPart2,
  mentionsChoiceLetter,
} from '../pipeline/lib/prompt-listening.js';
import { crossCheck } from '../pipeline/lib/prompt-question.js';
import { createValidator } from '../pipeline/lib/validate-deck.js';
import { readFileSync } from 'node:fs';

const item = (over = {}) => ({
  question: 'Where should I send the signed contract?',
  responses: { A: 'I sent it yesterday.', B: 'Ms. Park in legal has the address.', C: 'It was a long contract.' },
  answer: 'B',
  ...over,
});

describe('buildPart2Prompt', () => {
  it('nêu số câu, các dạng cần ra đề kèm định nghĩa, và yêu cầu tự viết (không chép đề thật)', () => {
    const prompt = buildPart2Prompt({ types: ['wh-who', 'indirect'], count: 7 });
    expect(prompt).toContain('7 câu');
    expect(prompt).toContain('wh-who:');
    expect(prompt).toContain('indirect:');
    expect(prompt).not.toContain('wh-where:');
    expect(prompt).toMatch(/tránh xa các mẫu câu "sách giáo khoa"/i);
  });

  it('đòi bẫy âm thanh và đáp án gián tiếp — thứ làm câu đủ khó cho mức 850', () => {
    const prompt = buildPart2Prompt({ types: ['yes-no'], count: 1 });
    expect(prompt).toMatch(/âm thanh tương tự/i);
    expect(prompt).toMatch(/GIÁN TIẾP/);
    expect(prompt).toMatch(/TRẢ LỜI MỘT CÂU HỎI KHÁC/);
  });

  it('không có dạng câu nào thì báo lỗi', () => {
    expect(() => buildPart2Prompt({ types: [], count: 3 })).toThrow();
  });

  it('mọi dạng đều có định nghĩa và khớp enum trong schema', () => {
    const schema = JSON.parse(readFileSync(new URL('../schemas/listening.schema.json', import.meta.url), 'utf8'));
    const allowed = schema.$defs.item.properties.errorType.enum;
    expect([...PART2_TYPES].sort()).toEqual([...allowed].sort());
    for (const type of PART2_TYPES) expect(PART2_TYPE_DEFINITIONS[type].length).toBeGreaterThan(10);
  });
});

describe('buildPart2VerifyPrompt', () => {
  it('KHÔNG lộ đáp án cho model kiểm định (D12)', () => {
    const prompt = buildPart2VerifyPrompt([item({ answer: 'B' })]);
    expect(prompt).toContain('Where should I send');
    expect(prompt).toContain('B. Ms. Park');
    expect(prompt).not.toContain('"answer": "B"');
    expect(prompt).not.toMatch(/đáp án đúng/i);
  });

  it('đánh số câu để đối chiếu và dùng lại được crossCheck của Part 5 (chỉ A-C)', () => {
    const items = [item(), item({ question: 'Who is in charge of the audit?', answer: 'A' })];
    const prompt = buildPart2VerifyPrompt(items);
    expect(prompt).toContain('#1');
    expect(prompt).toContain('#2');
    const { agreed, rejected } = crossCheck(items, [
      { index: 1, answer: 'B', obvious: false },
      { index: 2, answer: 'C', obvious: false },
    ]);
    expect(agreed).toHaveLength(1);
    expect(rejected[0].reason).toBe('lệch đáp án');
  });

  it('danh sách rỗng thì báo lỗi', () => {
    expect(() => buildPart2VerifyPrompt([])).toThrow();
  });
});

describe('part2Key', () => {
  it('cùng câu hỏi và cùng bộ đáp (khác thứ tự, khác hoa thường) là trùng', () => {
    const shuffled = item({ responses: { A: 'IT WAS A LONG CONTRACT.', B: 'I sent it yesterday.', C: 'Ms. Park in legal has the address.' } });
    expect(part2Key(shuffled)).toBe(part2Key(item()));
  });

  it('khác câu hỏi thì không trùng', () => {
    expect(part2Key(item({ question: 'Where is the memo?' }))).not.toBe(part2Key(item()));
  });
});

describe('isWellFormedPart2', () => {
  it('câu đủ cấu trúc thì qua', () => {
    expect(isWellFormedPart2(item())).toBe(true);
  });

  it.each([
    ['thiếu câu hỏi', { question: '' }],
    ['đáp án ngoài A-C (Part 5 dùng D)', { answer: 'D' }],
    ['thiếu một phương án', { responses: { A: 'Yes, I did.', B: 'No, I did not.' } }],
    ['hai phương án giống hệt', { responses: { A: 'Yes, I did.', B: 'yes, i did.', C: 'Maybe later.' } }],
    ['phương án quá dài để nghe một lần', { responses: { A: 'word '.repeat(30), B: 'Fine.', C: 'Maybe later.' } }],
  ])('loại: %s', (_name, over) => {
    expect(isWellFormedPart2(item(over))).toBe(false);
  });
});

describe('không được nhắc chữ cái phương án (vị trí sẽ bị xoay)', () => {
  it('prompt cấm rõ ràng', () => {
    expect(buildPart2Prompt({ types: ['yes-no'], count: 1 })).toMatch(/KHÔNG nhắc chữ cái A, B, C/i);
  });

  it.each([
    'Đáp án đúng là B vì nói về giờ.', 'Câu A lặp lại từ "secure".', 'Phương án C trả lời câu hỏi Where.',
    'Bẫy: (B) nghe giống.', 'Câu B và C đều sai.', 'đáp án là C', 'Correct answer B is indirect.',
  ])('bắt: %s', (text) => {
    expect(mentionsChoiceLetter(text)).toBe(true);
  });

  it.each([
    'Câu đáp nhắc tới "the HR desk" trả lời trực tiếp người cần liên hệ.',
    'Từ "secure" lặp lại từ "security" trong câu hỏi.',
    'A manager may approve it.', 'Người nói dùng mạo từ a hoặc an.', '', undefined,
  ])('không bắt nhầm: %s', (text) => {
    expect(mentionsChoiceLetter(text)).toBe(false);
  });

  it('câu có lời giải thích nhắc chữ cái bị loại ngay từ bước lọc cấu trúc', () => {
    expect(isWellFormedPart2(item({ explanation: 'Đáp án B đúng.' }))).toBe(false);
    expect(isWellFormedPart2(item({ trap: 'Câu A là bẫy.' }))).toBe(false);
    expect(isWellFormedPart2(item({ explanation: 'Câu đáp nhắc tới Ms. Park.', trap: 'Câu đáp lặp từ contract.' }))).toBe(true);
  });
});

describe('schemas/listening.schema.json', () => {
  const validate = createValidator(new URL('../schemas/listening.schema.json', import.meta.url).pathname);
  const good = {
    id: 'l2-0001', set: 'part2-core', part: 2, status: 'active',
    question: 'Where should I send the signed contract?',
    responses: { A: 'I sent it yesterday.', B: 'Ms. Park in legal has it.', C: 'It was long.' },
    answer: 'B', errorType: 'wh-where', explanation: 'Câu hỏi Where, đáp án chỉ người giữ địa chỉ.',
    audio: {
      question: 'audio/0123456789abcdef.mp3', A: 'audio/0123456789abcde0.mp3',
      B: 'audio/0123456789abcde1.mp3', C: 'audio/0123456789abcde2.mp3',
    },
    voices: { question: 'en-US-GuyNeural', responses: 'en-US-JennyNeural' },
    gen: { model: 'm', promptVersion: 'part2-v1', batch: '2026-09-20', date: '2026-09-20' },
    verify: { model: 'n', answer: 'B', agreed: true },
  };
  const bank = (entry) => ({ set: 'part2-core', part: 2, version: 1, entries: [entry] });

  it('câu hợp lệ qua schema', () => {
    expect(validate(bank(good)).valid).toBe(true);
  });

  it('đáp án D bị từ chối (Part 2 chỉ có A-C)', () => {
    expect(validate(bank({ ...good, answer: 'D' })).valid).toBe(false);
  });

  it('đường dẫn âm thanh sai mẫu bị từ chối', () => {
    expect(validate(bank({ ...good, audio: { ...good.audio, A: 'audio/x.wav' } })).valid).toBe(false);
  });

  it('câu chưa qua kiểm định (agreed: false) bị từ chối', () => {
    expect(validate(bank({ ...good, verify: { model: 'n', answer: 'B', agreed: false } })).valid).toBe(false);
  });
});
