import { describe, it, expect } from 'vitest';
import {
  scoreDictation, dictationUnits, reduceDictation, dictationQueue, countPending, MAX_WORDS,
} from '../src/logic/dictation.js';
import { reduceQuizState } from '../src/logic/quiz.js';
import { createEvent } from '../src/logic/events.js';
import { eventMaker, answeredWith } from './helpers/events.js';

const ev = eventMaker({ base: 1000, step: 1 });
const answered = answeredWith(ev);

describe('scoreDictation — chấm theo từ', () => {
  const kinds = (r) => r.parts.map((p) => `${p.kind}:${p.text}`);

  it('bỏ qua hoa/thường và dấu câu; đúng hết thì perfect', () => {
    const r = scoreDictation('Hi, Steve. The plotter is acting up again!', 'hi steve the plotter is acting up again');
    expect(r).toMatchObject({ correct: 8, total: 8, perfect: true });
    expect(r.parts.every((p) => p.kind === 'ok')).toBe(true);
    expect(r.parts[1].text).toBe('Steve.');          // hiện chữ gốc, không phải chữ đã chuẩn hoá
  });

  it('gõ sai một từ: hiện từ gõ sai (extra) ngay trước từ đúng (missing)', () => {
    const r = scoreDictation('We paid for a full overhaul.', 'we paid for a four overhaul');
    expect(kinds(r)).toEqual(['ok:We', 'ok:paid', 'ok:for', 'ok:a', 'extra:four', 'missing:full', 'ok:overhaul.']);
    expect(r).toMatchObject({ correct: 5, total: 6, perfect: false });
  });

  it('thiếu từ và thừa từ đều bị tính là chưa hoàn hảo', () => {
    expect(scoreDictation('I would, but their network is down.', 'I would but network is down')).toMatchObject({ correct: 6, total: 7, perfect: false });
    const extra = scoreDictation('Right away.', 'right away sir');
    expect(extra).toMatchObject({ correct: 2, total: 2, perfect: false });
    expect(kinds(extra).at(-1)).toBe('extra:sir');
  });

  it("dấu nháy cong và thẳng như nhau; it's ≠ its (nghe ra khác nhau)", () => {
    expect(scoreDictation('It’s the director’s call.', "it's the director's call").perfect).toBe(true);
    expect(scoreDictation("It's late.", 'its late').perfect).toBe(false);
  });

  it('gạch nối tách thành hai từ ở cả hai phía; dấu ba chấm không tính là từ', () => {
    expect(scoreDictation('The heavy-duty plotter... well', 'the heavy duty plotter well').perfect).toBe(true);
  });

  it('bỏ trống: 0 từ đúng, cả câu hiện thành "thiếu"', () => {
    const r = scoreDictation('Ask the finance director.', '   ');
    expect(r).toMatchObject({ correct: 0, total: 4, perfect: false });
    expect(r.parts.every((p) => p.kind === 'missing')).toBe(true);
  });
});

describe('dictationUnits — đoạn nào để chép', () => {
  const listening = [
    { id: 'l2-0001', status: 'active', question: 'Who approved it?', responses: { A: 'The manager.', B: 'Yes, I did.', C: 'At noon.' },
      audio: { question: 'audio/q1.mp3', A: 'audio/a1.mp3', B: 'audio/b1.mp3', C: 'audio/c1.mp3' } },
    { id: 'l2-0002', status: 'active', question: 'Where is it?', responses: { A: 'Here.', B: 'There.', C: 'Upstairs.' },
      audio: { question: 'audio/q2.mp3', A: 'audio/a2.mp3', B: 'audio/b2.mp3', C: 'audio/c2.mp3' } },
  ];
  const long = Array.from({ length: MAX_WORDS + 1 }, () => 'word').join(' ');
  const sets = {
    3: [{ id: 'p3-0001', status: 'active', questions: [{ id: 'p3-0001-1' }, { id: 'p3-0001-2' }],
      script: [{ speaker: 'Woman', text: 'Hi, Steve.' }, { speaker: 'Man', text: long }, { speaker: 'Woman', text: 'Thanks.' }],
      audio: { clips: ['audio/t0.mp3', 'audio/t1.mp3', 'audio/t2.mp3'] } }],
    4: [{ id: 'p4-0001', status: 'active', questions: [{ id: 'p4-0001-1' }], script: [{ speaker: 'Man', text: long }], audio: { clips: ['audio/m.mp3'] } }],
  };
  const units = (events) => dictationUnits({ listening, sets, quizStates: reduceQuizState(events) });

  it('chưa sai câu nghe nào thì không có gì để chép', () => {
    expect(units([answered('l2-0001', true, 1)])).toEqual([]);
  });

  it('câu Part 2 từng sai → câu hỏi + 3 câu đáp, kèm đường dẫn phát và nhãn nguồn', () => {
    const list = units([answered('l2-0001', false, 1)]);
    expect(list.map((u) => u.id)).toEqual(['l2-0001:question', 'l2-0001:A', 'l2-0001:B', 'l2-0001:C']);
    expect(list[0]).toMatchObject({ src: '/audio/q1.mp3', text: 'Who approved it?', from: 'l2-0001', label: 'Part 2 · câu hỏi' });
    expect(list[2].label).toBe('Part 2 · câu đáp B');
  });

  it('đã sai rồi làm lại đúng thì VẪN giữ (đã từng nghe nhầm là đáng chép)', () => {
    expect(units([answered('l2-0001', false, 1), answered('l2-0001', true, 2)])).toHaveLength(4);
  });

  it('Part 3/4: từng lượt lời, bỏ lượt dài quá MAX_WORDS từ (nên bài nói Part 4 một đoạn dài không vào)', () => {
    const list = units([answered('p3-0001-2', false, 1), answered('p4-0001-1', false, 2)]);
    expect(list.map((u) => u.id)).toEqual(['p3-0001:0', 'p3-0001:2']);
    expect(list[1]).toMatchObject({ src: '/audio/t2.mp3', text: 'Thanks.', from: 'p3-0001', label: 'Part 3 · lượt 3 (Woman)' });
  });

  it('câu sai GẦN ĐÂY nhất lên trước; trong cùng một câu giữ đúng thứ tự nghe', () => {
    const list = units([answered('l2-0002', false, 5), answered('l2-0001', false, 9)]);
    expect(list.map((u) => u.id).slice(0, 5)).toEqual(['l2-0001:question', 'l2-0001:A', 'l2-0001:B', 'l2-0001:C', 'l2-0002:question']);
  });

  it('câu đã bị báo lỗi hoặc đã retired thì bỏ', () => {
    const reported = [answered('l2-0001', false, 1), ev('question.reported', { questionId: 'l2-0001' })];
    expect(units(reported)).toEqual([]);
    const retired = dictationUnits({ listening: [{ ...listening[0], status: 'retired' }], sets: {}, quizStates: reduceQuizState([answered('l2-0001', false, 1)]) });
    expect(retired).toEqual([]);
  });
});

describe('reduceDictation / dictationQueue / countPending', () => {
  const units = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
  const checked = (unitId, correct, total, perfect, ts) => ev('dictation.checked', { unitId, correct, total, perfect }, ts);

  it('lần chép GẦN NHẤT quyết định: đúng hết thì đoạn đó ra khỏi hàng đợi; sai lại thì quay về', () => {
    const states = reduceDictation([
      checked('a', 3, 3, true, 1),
      checked('b', 3, 3, true, 1), checked('b', 2, 3, false, 2),
      checked('c', 1, 3, false, 1),
    ]);
    expect(states.get('a')).toMatchObject({ attempts: 1, perfect: true });
    expect(states.get('b')).toMatchObject({ attempts: 2, perfect: false });
    expect(dictationQueue(units, states, { size: 10 }).map((u) => u.id)).toEqual(['b', 'c', 'd']);
    expect(countPending(units, states)).toBe(3);
  });

  it('cắt theo size và bỏ các đoạn đã làm trong lượt', () => {
    const states = reduceDictation([]);
    expect(dictationQueue(units, states, { size: 2, exclude: new Set(['a']) }).map((u) => u.id)).toEqual(['b', 'c']);
  });

  it('sự kiện hỏng (thiếu unitId) bị bỏ qua; loại sự kiện đã đăng ký với createEvent', () => {
    expect(reduceDictation([ev('dictation.checked', {}), ev('vocab.reviewed', { wordId: 'x' })]).size).toBe(0);
    expect(() => createEvent({ type: 'dictation.checked', deviceId: 'mac', payload: { unitId: 'a' } })).not.toThrow();
  });
});
