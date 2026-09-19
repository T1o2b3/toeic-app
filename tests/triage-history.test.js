import { describe, it, expect } from 'vitest';
import { stepBack, stepForward, canStepBack } from '../src/logic/triage-history.js';

describe('đi lùi trong lượt phân loại', () => {
  it('chưa chấm từ nào thì không lùi được', () => {
    expect(canStepBack(0, null)).toBe(false);
    expect(stepBack(0, null)).toBeNull();
  });

  it('từ mới nhất → lùi về từ vừa chấm', () => {
    expect(canStepBack(3, null)).toBe(true);
    expect(stepBack(3, null)).toBe(2);
  });

  it('lùi liên tiếp tới từ đầu tiên của lượt rồi đứng yên', () => {
    let index = null;
    index = stepBack(3, index); // 2
    index = stepBack(3, index); // 1
    index = stepBack(3, index); // 0
    expect(index).toBe(0);
    expect(canStepBack(3, index)).toBe(false);
    expect(stepBack(3, index)).toBe(0);
  });

  it('chấm lại xong thì đi tới từ kế tiếp trong lịch sử', () => {
    expect(stepForward(3, 0)).toBe(1);
    expect(stepForward(3, 1)).toBe(2);
  });

  it('chấm lại từ cuối lịch sử thì về từ mới nhất', () => {
    expect(stepForward(3, 2)).toBeNull();
  });

  it('đang ở từ mới nhất thì không đi tới đâu nữa', () => {
    expect(stepForward(3, null)).toBeNull();
  });
});
