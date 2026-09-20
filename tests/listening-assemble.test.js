import { describe, it, expect } from 'vitest';
import { moveAnswerTo, targetLetter, assembleEntry } from '../pipeline/lib/listening-assemble.js';
import { VOICES } from '../pipeline/lib/tts.js';

const cached = (answer = 'B') => ({
  id: 'l2-0001',
  question: 'Where should I send the contract?',
  responses: { A: 'Yesterday.', B: 'Ask Ms. Park.', C: 'A long one.' },
  answer,
  verify: { model: 'x', answer, agreed: true },
});

describe('moveAnswerTo', () => {
  it.each(['A', 'B', 'C'])('đưa đáp án về %s và câu đúng vẫn là câu đó', (target) => {
    const moved = moveAnswerTo(cached('B'), target);
    expect(moved.answer).toBe(target);
    expect(moved.responses[target]).toBe('Ask Ms. Park.');
  });

  it('không mất và không nhân đôi câu đáp nào', () => {
    for (const from of ['A', 'B', 'C']) {
      for (const to of ['A', 'B', 'C']) {
        const moved = moveAnswerTo(cached(from), to);
        expect(Object.values(moved.responses).sort()).toEqual(Object.values(cached(from).responses).sort());
      }
    }
  });

  it('giữ nguyên thứ tự tương đối của hai câu sai', () => {
    const moved = moveAnswerTo(cached('B'), 'C');
    expect(moved.responses).toEqual({ A: 'Yesterday.', B: 'A long one.', C: 'Ask Ms. Park.' });
  });

  it('đã đúng chữ cái đích thì không đổi gì', () => {
    expect(moveAnswerTo(cached('B'), 'B').responses).toEqual(cached('B').responses);
  });
});

describe('targetLetter', () => {
  it('xoay A, B, C nên bộ câu chia đều', () => {
    const counts = { A: 0, B: 0, C: 0 };
    for (let i = 0; i < 75; i += 1) counts[targetLetter(i)] += 1;
    expect(counts).toEqual({ A: 25, B: 25, C: 25 });
  });
});

describe('assembleEntry', () => {
  it('đáp án về chữ cái đích, kiểm định đi theo (nội dung vẫn được người giải đồng ý)', () => {
    const { entry } = assembleEntry(cached('B'), 2); // câu thứ 3 -> đích C
    expect(entry.answer).toBe('C');
    expect(entry.responses.C).toBe('Ask Ms. Park.');
    expect(entry.verify).toEqual({ model: 'x', answer: 'C', agreed: true });
  });

  it('gán đủ 4 đoạn âm thanh với đường dẫn khớp mẫu và không trùng nhau', () => {
    const { entry, clips } = assembleEntry(cached(), 0);
    expect(clips).toHaveLength(4);
    expect(new Set(clips.map((c) => c.path)).size).toBe(4);
    for (const clip of clips) expect(clip.path).toMatch(/^audio\/[0-9a-f]{16}\.mp3$/);
    expect(Object.values(entry.audio)).toEqual(expect.arrayContaining(clips.map((c) => c.path)));
  });

  it('người hỏi và người đáp khác giọng; cả ba câu đáp cùng một giọng', () => {
    const { entry, clips } = assembleEntry(cached(), 1);
    expect(entry.voices.question).not.toBe(entry.voices.responses);
    expect(VOICES).toContain(entry.voices.question);
    expect(clips.slice(1).every((c) => c.voice === entry.voices.responses)).toBe(true);
  });

  it('đoạn âm thanh câu đáp khớp đúng thứ tự sau khi xoay chỗ', () => {
    const { entry, clips } = assembleEntry(cached('B'), 2);
    const correctClip = clips.find((c) => c.text === 'Ask Ms. Park.');
    expect(entry.audio[entry.answer]).toBe(correctClip.path);
  });

  it('không sửa bản thảo gốc trong cache', () => {
    const source = cached('B');
    assembleEntry(source, 2);
    expect(source.answer).toBe('B');
    expect(source.responses.B).toBe('Ask Ms. Park.');
  });
});
