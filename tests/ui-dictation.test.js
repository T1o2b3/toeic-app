// @vitest-environment jsdom
/**
 * Màn nghe chép (M11), chạy thật qua giao diện với bộ phát âm thanh GIẢ. Các `it` chạy nối tiếp, dùng chung một app.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { bootApp } from './helpers/ui-app.js';
import { setDictationPlayerFactory } from '../src/ui/dictation-screen.js';

let store; let root; let tick; let go; let key; let text; let click;
const fake = { preload: vi.fn(async () => {}), stop: vi.fn(), dispose: vi.fn(), play: vi.fn(async () => 'done') };

const box = () => root.querySelector('.dict-box');
const type = (value) => { box().value = value; box().dispatchEvent(new window.Event('input')); };
const enterInBox = async () => {
  box().dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await tick(80);
};
const checked = () => store.exportEvents().filter((e) => e.type === 'dictation.checked');
const lastSrc = () => fake.play.mock.calls.at(-1)[0][0].src;

beforeAll(async () => {
  setDictationPlayerFactory(() => fake);
  ({ store, root, tick, go, key, text, click } = await bootApp());
});

describe('nghe chép (M11)', () => {
  it('chưa sai câu nghe nào: mục Bài thi không có nút, vào thẳng màn thì được giải thích', async () => {
    await go('#/exams');
    expect(text()).not.toContain('Nghe chép');
    await go('#/dictation');
    expect(text()).toContain('Chưa có đoạn nào để chép');
  });

  it('sai một câu Part 2 → mục Bài thi có "Nghe chép" với 4 đoạn (câu hỏi + 3 câu đáp)', async () => {
    await store.record('question.answered', { questionId: 'l2-0001', choice: 'A', correct: false, errorType: 'wh-where' });
    await go('#/exams');
    expect(text()).toContain('Nghe chép câu nghe sai');
    expect(text()).toContain('4 đoạn');
  });

  it('vào màn: có ô gõ, biết đoạn từ đâu, và KHÔNG lộ chữ trước khi chép', async () => {
    await go('#/');
    await go('#/dictation');
    expect(box()).not.toBeNull();
    expect(box().getAttribute('autocorrect')).toBe('off');       // iPhone không được sửa hộ chính tả
    expect(text()).toContain('còn 4 đoạn · Part 2 · câu hỏi');
    expect(text()).not.toContain('signed contract');
  });

  it('bấm Nghe thì phát đúng file của câu hỏi', async () => {
    await click((t) => t.includes('Nghe đoạn này'));
    expect(lastSrc()).toBe('/audio/0000000000000001.mp3');
  });

  it('chữ đang gõ SỐNG QUA lần vẽ lại màn (vd đổi tốc độ, đồng bộ kéo sự kiện về)', async () => {
    type('where should I sent the contract');
    await click((t) => t === '0.75×');
    expect(box().value).toBe('where should I sent the contract');
  });

  it('Enter trong ô: chấm theo từ, ghi sự kiện, hiện chỗ sai — và KHÔNG nhảy luôn sang đoạn sau', async () => {
    await enterInBox();
    expect(checked()).toHaveLength(1);
    expect(checked()[0].payload).toEqual({ unitId: 'l2-0001:question', correct: 5, total: 7, perfect: false });
    expect(text()).toContain('Đúng 5/7 từ');
    expect([...root.querySelectorAll('.dict-diff del')].map((n) => n.textContent)).toEqual(['sent']);
    expect([...root.querySelectorAll('.dict-diff ins')].map((n) => n.textContent)).toEqual(['send', 'signed']);
    expect(text()).toContain('còn 4 đoạn');                      // vẫn đang xem đoạn vừa chép
    expect(root.querySelectorAll('.stem .tok').length).toBeGreaterThan(3);   // chữ gốc gạt từ được
  });

  it('Space sang đoạn kế và PHÁT LUÔN; bộ đếm giảm', async () => {
    await key(' ');
    expect(text()).toContain('còn 3 đoạn · Part 2 · câu đáp A');
    expect(box().value).toBe('');
    expect(lastSrc()).toBe('/audio/0000000000000002.mp3');
  });

  it('chép đúng hết (khác hoa/thường, thiếu dấu câu vẫn tính đúng) → "Chính xác"', async () => {
    type('i sent it Yesterday');
    await click((t) => t.includes('Kiểm tra'));
    await tick(80);
    expect(text()).toContain('Chính xác');
    expect(checked().at(-1).payload.perfect).toBe(true);
  });

  it('hết lượt: màn tổng kết đếm đúng; đoạn chép đúng không quay lại', async () => {
    for (let i = 0; i < 2; i += 1) {
      await key(' ');
      await click((t) => t.includes('Kiểm tra'));                 // bỏ trống = "chịu", xem chữ gốc
      await tick(80);
    }
    await key(' ');
    expect(text()).toContain('1 / 4 đoạn chép đúng hết');
    expect(text()).toContain('Còn 3 đoạn cần chép');
    await go('#/exams');
    expect(text()).toContain('3 đoạn');
  });
});
