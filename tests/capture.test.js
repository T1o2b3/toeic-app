import { describe, it, expect } from 'vitest';
import {
  normalizeWord, tokenize, buildWordIndex, baseForms, lookupDeckEntry,
  reduceCaptured, splitCaptured, planCapture,
} from '../src/logic/capture.js';
import { reduceVocabState } from '../src/logic/vocab-state.js';
import { EVENT_TYPES, createEvent } from '../src/logic/events.js';
import { LEVELS } from '../src/logic/vocab-levels.js';

const T0 = Date.UTC(2026, 8, 19, 10, 0, 0);
let seq = 0;
const ev = (type, payload, ts = T0 + seq) => ({ id: `e-${seq++}`, deviceId: 'mac', ts, type, payload });

const entries = ['amend', 'raise', 'stop', 'study', 'run', 'rise', 'quick', 'address'].map((word, i) => ({
  id: `d-${i}`, word, rank: i + 1,
}));
const index = buildWordIndex([...entries, { id: 'gone', word: 'retiredword', status: 'retired' }]);
const byWord = (w) => entries.find((e) => e.word === w);

describe('normalizeWord', () => {
  it('chữ thường, bỏ dấu câu dính vào và đuôi sở hữu', () => {
    expect(normalizeWord('Amend,')).toBe('amend');
    expect(normalizeWord('company’s')).toBe('company');
    expect(normalizeWord("(zoning)")).toBe('zoning');
  });

  it('từ quá ngắn hoặc không phải chữ thì bỏ', () => {
    expect(normalizeWord('of')).toBe('');
    expect(normalizeWord('----')).toBe('');
    expect(normalizeWord('2026')).toBe('');
    expect(normalizeWord(undefined)).toBe('');
  });

  it('giữ từ ghép có gạch nối', () => {
    expect(normalizeWord('long-term')).toBe('long-term');
  });
});

describe('tokenize', () => {
  const stem = "The council's power to ---- the zoning rules, quickly.";

  it('nối các mảnh lại được đúng câu gốc (không mất chữ nào)', () => {
    expect(tokenize(stem).map((t) => t.text).join('')).toBe(stem);
  });

  it('chỗ trống ---- và dấu câu không phải từ', () => {
    const tokens = tokenize(stem);
    expect(tokens.find((t) => t.text.includes('----')).word).toBeNull();
    expect(tokens.filter((t) => t.word).map((t) => t.word)).toEqual(['the', 'council', 'power', 'the', 'zoning', 'rules', 'quickly']);
  });

  it('từ ngắn (to) vẫn là mảnh chữ nhưng không gạt được', () => {
    const to = tokenize(stem).find((t) => t.text === 'to');
    expect(to.word).toBeNull();
  });

  it('chuỗi rỗng / null không làm hỏng', () => {
    expect(tokenize('')).toEqual([]);
    expect(tokenize(null)).toEqual([]);
  });
});

describe('tra từ trong deck, kể cả biến thể', () => {
  it('khớp đúng', () => {
    expect(lookupDeckEntry('amend', index)).toBe(byWord('amend'));
  });

  it.each([
    ['raised', 'raise'], ['raises', 'raise'], ['rising', 'rise'], ['stopped', 'stop'],
    ['running', 'run'], ['studies', 'study'], ['studied', 'study'], ['quickly', 'quick'],
    ['addresses', 'address'],
  ])('%s → %s', (form, base) => {
    expect(lookupDeckEntry(form, index)).toBe(byWord(base));
  });

  it('từ lạ không khớp gì thì null', () => {
    expect(lookupDeckEntry('zoning', index)).toBeNull();
  });

  it('mục đã gỡ (retired) không nằm trong chỉ mục', () => {
    expect(lookupDeckEntry('retiredword', index)).toBeNull();
  });

  it('"address" không bị cắt nhầm thành "addres"', () => {
    expect(baseForms('address')).not.toContain('addres');
  });
});

describe('planCapture', () => {
  const none = reduceVocabState([]);

  it('từ chưa có trong deck: chỉ ghi vocab.captured, báo rõ chưa có nghĩa', () => {
    const plan = planCapture('zoning', { questionId: 'p5-1', index, states: none });
    expect(plan.events).toEqual([{ type: 'vocab.captured', payload: { word: 'zoning', questionId: 'p5-1' } }]);
    expect(plan.notice).toContain('chưa có trong deck');
  });

  it('từ trong deck, chưa phân loại: ghi thêm phân loại "không biết" để vào hàng đợi học', () => {
    const plan = planCapture('amend', { questionId: 'p5-1', index, states: none });
    expect(plan.events.map((e) => e.type)).toEqual(['vocab.captured', 'vocab.triaged']);
    expect(plan.events[0].payload.wordId).toBe(byWord('amend').id);
    expect(plan.events[1].payload).toEqual({ wordId: byWord('amend').id, level: LEVELS.UNKNOWN, known: false });
  });

  it('biến thể được gắn về từ gốc và thông báo nói rõ từ gốc', () => {
    const plan = planCapture('raised', { questionId: 'p5-1', index, states: none });
    expect(plan.events[1].payload.wordId).toBe(byWord('raise').id);
    expect(plan.notice).toContain('từ gốc “raise”');
  });

  it('từ đang "thành thạo": hạ xuống "đoán được"', () => {
    const states = reduceVocabState([ev('vocab.triaged', { wordId: byWord('amend').id, level: 'fluent', known: true })]);
    const plan = planCapture('amend', { questionId: 'q', index, states });
    expect(plan.events[1].payload.level).toBe(LEVELS.CONTEXT);
    expect(plan.events[1].payload.known).toBe(false);
  });

  it('từ đang học sẵn: không ghi phân loại nữa (lịch FSRS giữ nguyên)', () => {
    const states = reduceVocabState([ev('vocab.triaged', { wordId: byWord('amend').id, level: 'spelling', known: false })]);
    const plan = planCapture('amend', { questionId: 'q', index, states });
    expect(plan.events.map((e) => e.type)).toEqual(['vocab.captured']);
    expect(plan.notice).toContain('đã có trong danh sách học');
  });

  it('gạt lại cùng từ ở cùng câu: không ghi gì', () => {
    const captured = reduceCaptured([ev('vocab.captured', { word: 'zoning', questionId: 'p5-1' })]);
    const plan = planCapture('zoning', { questionId: 'p5-1', index, states: none, captured });
    expect(plan.events).toEqual([]);
  });

  it('cùng từ ở câu KHÁC vẫn ghi (đếm số lần gặp)', () => {
    const captured = reduceCaptured([ev('vocab.captured', { word: 'zoning', questionId: 'p5-1' })]);
    const plan = planCapture('zoning', { questionId: 'p5-2', index, states: none, captured });
    expect(plan.events).toHaveLength(1);
  });

  it('sự kiện sinh ra hợp lệ với createEvent (loại sự kiện đã đăng ký)', () => {
    expect(EVENT_TYPES).toContain('vocab.captured');
    const plan = planCapture('zoning', { questionId: 'p5-1', index, states: none });
    expect(() => createEvent({ ...plan.events[0], deviceId: 'mac' })).not.toThrow();
  });
});

describe('reduceCaptured / splitCaptured', () => {
  const events = [
    ev('vocab.captured', { word: 'zoning', questionId: 'p5-1' }),
    ev('vocab.captured', { word: 'zoning', questionId: 'p5-2' }),
    ev('vocab.captured', { word: 'zoning', questionId: 'p5-2' }),
    ev('vocab.captured', { word: 'raised', questionId: 'p5-3', wordId: 'd-1' }),
    ev('vocab.captured', { word: 'ab' }),                // quá ngắn
    ev('vocab.captured', {}),                            // thiếu word
    ev('vocab.reviewed', { wordId: 'd-1', grade: 'good' }), // loại khác
  ];

  it('đếm số lần gặp và gom các câu đã gặp, bỏ sự kiện hỏng', () => {
    const captured = reduceCaptured(events);
    expect([...captured.keys()]).toEqual(['zoning', 'raised']);
    expect(captured.get('zoning').count).toBe(3);
    expect(captured.get('zoning').questionIds).toEqual(['p5-1', 'p5-2']);
    expect(captured.get('raised').wordId).toBe('d-1');
  });

  it('nhật ký cũ không có sự kiện gạt thì cho danh sách rỗng', () => {
    expect(reduceCaptured([ev('vocab.reviewed', { wordId: 'x', grade: 'good' })]).size).toBe(0);
    expect(reduceCaptured(undefined).size).toBe(0);
  });

  it('sự kiện gạt KHÔNG làm đổi trạng thái học (chỉ vocab.triaged mới đổi)', () => {
    const states = reduceVocabState(events);
    expect(states.get('d-1')?.triaged ?? false).toBe(false);
  });

  it('tra lại theo deck hiện tại: từ gạt lúc chưa có, nay deck đã có thì tính là đã khớp', () => {
    const captured = reduceCaptured([ev('vocab.captured', { word: 'amend', questionId: 'q' }), ev('vocab.captured', { word: 'zoning', questionId: 'q' })]);
    const { entryIds, unmatched } = splitCaptured(captured, index);
    expect([...entryIds]).toEqual([byWord('amend').id]);
    expect(unmatched.map((u) => u.word)).toEqual(['zoning']);
  });
});
