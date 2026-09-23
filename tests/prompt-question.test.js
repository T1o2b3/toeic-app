import { describe, it, expect } from 'vitest';
import {
  buildQuestionPrompt, buildVerifyPrompt, crossCheck, questionKey, hasBlank,
  ERROR_TYPES, ERROR_TYPE_DEFINITIONS, QUESTION_PROMPT_VERSION, balanceAnswers,
} from '../pipeline/lib/prompt-question.js';
import { hasBlank as appHasBlank } from '../src/logic/part5.js';

const q = (answer, stem = 'The manager ---- the report yesterday afternoon before the meeting.') => ({
  stem, answer, options: { A: 'submit', B: 'submitted', C: 'submitting', D: 'to submit' },
});

describe('buildQuestionPrompt', () => {
  it('nêu đúng số câu và liệt kê từng loại kiến thức kèm định nghĩa', () => {
    const prompt = buildQuestionPrompt({ errorTypes: ['verb-tense', 'preposition'], count: 20 });
    expect(prompt).toContain('20 câu');
    expect(prompt).toContain('· verb-tense:');
    expect(prompt).toContain('· preposition:');
  });

  it('phân biệt rõ word-form với vocabulary để AI không gắn nhãn bừa', () => {
    const prompt = buildQuestionPrompt({ errorTypes: ['word-form', 'vocabulary'], count: 5 });
    expect(prompt).toMatch(/word-form:.*CÙNG MỘT gốc từ/);
    expect(prompt).toMatch(/vocabulary:.*TỪ KHÁC NHAU/);
  });

  it('gợi ý dùng từ trong deck khi được truyền vào', () => {
    const prompt = buildQuestionPrompt({ errorTypes: ['vocabulary'], words: ['invoice', 'refund'], count: 5 });
    expect(prompt).toContain('invoice, refund');
  });

  it('dặn không chép đề thật (D17)', () => {
    expect(buildQuestionPrompt({ errorTypes: ['vocabulary'], count: 1 })).toMatch(/không chép lại câu/i);
  });

  it('từ chối khi không có loại kiến thức nào', () => {
    expect(() => buildQuestionPrompt({ errorTypes: [], count: 5 })).toThrow();
  });

  it('có phiên bản prompt và danh sách loại lỗi khớp schema', () => {
    expect(QUESTION_PROMPT_VERSION).toMatch(/^part5-v\d+$/);
    expect(ERROR_TYPES).toContain('word-form');
    expect(ERROR_TYPES.length).toBeGreaterThan(8);
    // Mọi loại đều phải có định nghĩa, nếu không AI sẽ gắn nhãn tuỳ hứng.
    for (const type of ERROR_TYPES) expect(ERROR_TYPE_DEFINITIONS[type]).toBeTruthy();
  });
});

describe('buildVerifyPrompt', () => {
  it('liệt kê câu và phương án nhưng KHÔNG lộ đáp án (D12)', () => {
    const prompt = buildVerifyPrompt([q('B')]);
    expect(prompt).toContain('A. submit');
    expect(prompt).toContain('D. to submit');
    expect(prompt).not.toMatch(/"answer"\s*:\s*"B"/);
    expect(prompt).not.toContain('đáp án đúng');
  });

  it('đánh số câu từ 1', () => {
    expect(buildVerifyPrompt([q('A'), q('B')])).toContain('#2');
  });

  it('từ chối danh sách rỗng', () => {
    expect(() => buildVerifyPrompt([])).toThrow();
  });
});

describe('crossCheck', () => {
  it('giữ câu hai bên đồng ý, loại câu lệch nhau', () => {
    const questions = [q('B'), q('A'), q('C')];
    const { agreed, rejected } = crossCheck(questions, [
      { index: 1, answer: 'B', obvious: false },
      { index: 2, answer: 'D', obvious: false },
      { index: 3, answer: 'C', obvious: false },
    ]);
    expect(agreed).toHaveLength(2);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].solvedAnswer).toBe('D');
    expect(rejected[0].reason).toBe('lệch đáp án');
  });

  it('loại cả câu đúng đáp án nhưng QUÁ DỄ (vô dụng với người 850 điểm)', () => {
    const { agreed, rejected } = crossCheck([q('B')], [{ index: 1, answer: 'B', obvious: true }]);
    expect(agreed).toHaveLength(0);
    expect(rejected[0].reason).toBe('quá dễ');
  });

  it('không có đánh giá độ khó thì mặc định là không dễ (giữ câu)', () => {
    expect(crossCheck([q('B')], [{ index: 1, answer: 'B' }]).agreed).toHaveLength(1);
  });

  it('câu không được giải thì bị loại, không mặc định là đúng', () => {
    const { agreed, rejected } = crossCheck([q('B')], []);
    expect(agreed).toHaveLength(0);
    expect(rejected[0].solvedAnswer).toBeNull();
    expect(rejected[0].reason).toBe('không giải được');
  });

  it('chấp nhận đáp án viết thường hoặc có khoảng trắng thừa', () => {
    expect(crossCheck([q('B')], [{ index: 1, answer: ' b ', obvious: false }]).agreed).toHaveLength(1);
  });

  it('bỏ qua kết quả rác từ model giải', () => {
    const { agreed } = crossCheck([q('B')], [{ index: 'x', answer: 'Z' }, { index: 1, answer: 'B', obvious: false }]);
    expect(agreed).toHaveLength(1);
  });
});

describe('questionKey', () => {
  it('hai câu giống nhau (khác khoảng trắng/hoa thường) cho cùng khoá', () => {
    const a = q('B', 'The   manager ---- the REPORT.');
    const b = q('B', 'the manager ---- the report.');
    expect(questionKey(a)).toBe(questionKey(b));
  });

  it('câu khác nhau thì khoá khác nhau', () => {
    expect(questionKey(q('B'))).not.toBe(questionKey(q('B', 'A different stem entirely ---- here.')));
  });

  it('đảo thứ tự phương án vẫn coi là trùng', () => {
    const a = { stem: 'x ---- y', options: { A: 'a', B: 'b', C: 'c', D: 'd' } };
    const b = { stem: 'x ---- y', options: { A: 'd', B: 'c', C: 'b', D: 'a' } };
    expect(questionKey(a)).toBe(questionKey(b));
  });
});

describe('câu phải có chỗ trống (lỗi thật: p5-0079)', () => {
  it('loại câu không có chỗ trống dù hai model đồng ý đáp án', () => {
    const broken = { stem: 'The manager was irritated by the constant interruptions all morning.', answer: 'A', options: { A: 'irritated', B: 'irritating', C: 'irritation', D: 'irritable' } };
    const { agreed, rejected } = crossCheck([broken], [{ index: 1, answer: 'A', obvious: false }]);
    expect(agreed).toHaveLength(0);
    expect(rejected[0].reason).toBe('thiếu chỗ trống');
  });

  it('nhận cả chỗ trống bằng gạch nối lẫn gạch dưới, không nhận từ ghép có gạch nối', () => {
    expect(hasBlank('The council will ---- the rules.')).toBe(true);
    expect(hasBlank('The council will ____ the rules.')).toBe(true);
    expect(hasBlank('A well-known author wrote it.')).toBe(false);
  });

  it('bản của pipeline và bản của app hiểu chỗ trống GIỐNG NHAU (hai file cố ý tách nhau)', () => {
    const samples = ['a ---- b', 'a -- b', 'a ____ b', 'well-known', 'không có gì', '', '-'];
    for (const sample of samples) expect(hasBlank(sample)).toBe(appHasBlank(sample));
  });
});

describe('balanceAnswers — cân bằng chữ cái đáp án Part 5 (D64)', () => {
  const q = (id, answer, extra = {}) => ({
    id, answer, options: { A: `${id}-a`, B: `${id}-b`, C: `${id}-c`, D: `${id}-d` },
    explanation: 'Giải thích.', verify: { model: 'm', answer, agreed: true }, ...extra,
  });

  it('câu mới nhận chữ cái đang ÍT nhất trong cả ngân hàng; nội dung đáp án đúng đi theo', () => {
    const published = new Set(['p5-0001', 'p5-0002', 'p5-0003']);
    const out = balanceAnswers([q('p5-0001', 'A'), q('p5-0002', 'A'), q('p5-0003', 'B'), q('p5-0004', 'A'), q('p5-0005', 'A'), q('p5-0006', 'A')], published);
    expect(out.slice(3).map((x) => x.answer)).toEqual(['C', 'D', 'B']);      // đang có A2 B1 C0 D0
    expect(out[3].options.C).toBe('p5-0004-a');                              // phương án đúng cũ giờ nằm ở C
    expect(out[3].verify.answer).toBe('C');
    expect(Object.values(out[3].options).sort()).toEqual(['p5-0004-a', 'p5-0004-b', 'p5-0004-c', 'p5-0004-d']);
  });

  it('câu đã phát hành giữ NGUYÊN từng byte (ràng buộc #6)', () => {
    const old = q('p5-0001', 'A');
    expect(balanceAnswers([old], new Set(['p5-0001']))[0]).toBe(old);
  });

  it('lời giải nhắc chữ cái ("Phương án B…") thì không đổi chỗ — đổi là lời giải nói sai', () => {
    const out = balanceAnswers([q('p5-0001', 'A', { explanation: 'Phương án B sai vì thiếu giới từ.' })], new Set());
    expect(out[0].answer).toBe('A');
  });
});
