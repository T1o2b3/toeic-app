import { describe, it, expect } from 'vitest';
import {
  SPEEDS, DEFAULT_SPEED, normalizeSpeed, audioUrl, clipSequence, canAnswer, estimateMinutes,
  GAP_AFTER_QUESTION_MS, GAP_BETWEEN_RESPONSES_MS,
} from '../src/logic/listen.js';

const item = {
  audio: { question: 'audio/aaaaaaaaaaaaaaaa.mp3', A: 'audio/bbbbbbbbbbbbbbbb.mp3', B: 'audio/cccccccccccccccc.mp3', C: 'audio/dddddddddddddddd.mp3' },
};

describe('normalizeSpeed', () => {
  it('nhận các tốc độ hợp lệ, cả dạng chuỗi từ localStorage', () => {
    for (const speed of SPEEDS) expect(normalizeSpeed(speed)).toBe(speed);
    expect(normalizeSpeed('0.75')).toBe(0.75);
    expect(normalizeSpeed('1.25')).toBe(1.25);
  });

  it('giá trị rác về mặc định', () => {
    for (const bad of [null, undefined, '', 'nhanh', 3, '2', NaN]) expect(normalizeSpeed(bad)).toBe(DEFAULT_SPEED);
  });
});

describe('audioUrl', () => {
  it('thêm gốc / và không nhân đôi dấu gạch', () => {
    expect(audioUrl('audio/x.mp3')).toBe('/audio/x.mp3');
    expect(audioUrl('/audio/x.mp3')).toBe('/audio/x.mp3');
  });
});

describe('clipSequence', () => {
  const steps = clipSequence(item);

  it('phát đúng thứ tự: câu hỏi, A, B, C', () => {
    expect(steps.filter((s) => s.type === 'clip').map((s) => s.key)).toEqual(['question', 'A', 'B', 'C']);
    expect(steps.filter((s) => s.type === 'clip').map((s) => s.src)).toEqual([
      '/audio/aaaaaaaaaaaaaaaa.mp3', '/audio/bbbbbbbbbbbbbbbb.mp3', '/audio/cccccccccccccccc.mp3', '/audio/dddddddddddddddd.mp3',
    ]);
  });

  it('xen kẽ khoảng lặng, dài hơn sau câu hỏi, và không kết thúc bằng khoảng lặng', () => {
    expect(steps.map((s) => s.type)).toEqual(['clip', 'gap', 'clip', 'gap', 'clip', 'gap', 'clip']);
    expect(steps[1].ms).toBe(GAP_AFTER_QUESTION_MS);
    expect(steps[3].ms).toBe(GAP_BETWEEN_RESPONSES_MS);
    expect(steps.at(-1).type).toBe('clip');
  });
});

describe('canAnswer', () => {
  it('chưa nghe hết thì chưa được chọn; đã chọn rồi thì không chọn lại', () => {
    expect(canAnswer(false, null)).toBe(false);
    expect(canAnswer(true, null)).toBe(true);
    expect(canAnswer(true, 'B')).toBe(false);
  });
});

describe('estimateMinutes', () => {
  it('ít nhất 1 phút, ~30 giây một câu', () => {
    expect(estimateMinutes(1)).toBe(1);
    expect(estimateMinutes(10)).toBe(5);
    expect(estimateMinutes(0)).toBe(1);
  });
});
