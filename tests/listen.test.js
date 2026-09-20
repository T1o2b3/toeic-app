import { describe, it, expect } from 'vitest';
import {
  SPEEDS, DEFAULT_SPEED, normalizeSpeed, audioUrl, clipSequence, canAnswer, estimateMinutes, turnSequence, GAP_BETWEEN_TURNS_MS,
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

describe('turnSequence (Part 3/4)', () => {
  const set = { audio: { clips: ['audio/aaaaaaaaaaaaaaaa.mp3', 'audio/bbbbbbbbbbbbbbbb.mp3', 'audio/cccccccccccccccc.mp3'] } };
  const steps = turnSequence(set);

  it('phát lần lượt từng lượt nói, xen khoảng lặng, không kết thúc bằng khoảng lặng', () => {
    expect(steps.map((s) => s.type)).toEqual(['clip', 'gap', 'clip', 'gap', 'clip']);
    expect(steps.filter((s) => s.type === 'gap').every((s) => s.ms === GAP_BETWEEN_TURNS_MS)).toBe(true);
  });

  it('key là vị trí lượt nói (để tô sáng dòng đang phát) và src có gốc /', () => {
    const clips = steps.filter((s) => s.type === 'clip');
    expect(clips.map((s) => s.key)).toEqual([0, 1, 2]);
    expect(clips[2].src).toBe('/audio/cccccccccccccccc.mp3');
  });

  it('bài nói một lượt chỉ có một đoạn, không có khoảng lặng', () => {
    expect(turnSequence({ audio: { clips: ['audio/aaaaaaaaaaaaaaaa.mp3'] } })).toHaveLength(1);
  });
});
