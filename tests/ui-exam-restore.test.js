// @vitest-environment jsdom
/**
 * Tải lại trang giữa bài thi thử: phải khôi phục đúng bài đang làm (D63 ghi "làm dở cùng máy thì đã có").
 * File riêng vì phải MỞ APP khi đã có bài lưu dở và địa chỉ đang ở #/exam — bootApp chỉ gọi được một lần mỗi file.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { bootApp } from './helpers/ui-app.js';
import { setExamPlayerFactory } from '../src/ui/exam-screen.js';

const STATE_KEY = 'codex_toeic_exam_state';
let store; let root; let tick; let go; let text; let click;
const fake = { preload: vi.fn(async () => {}), stop: vi.fn(), dispose: vi.fn(), unlock: vi.fn(), play: vi.fn(async () => 'done') };

const saved = (over) => JSON.stringify({
  seed: 42, phaseIndex: 0, index: 0, answers: {}, heard: {}, flags: {},
  startedAt: Date.now(), deadline: Date.now() + 10 * 60 * 1000, ...over,
});

beforeAll(async () => {
  setExamPlayerFactory(() => fake);
  // Như lúc tải lại trang: bài đang lưu dở, địa chỉ đang ở màn thi.
  localStorage.setItem(STATE_KEY, saved({ mode: 'part6', answers: { 'p6-0001-1': 'C' } }));
  window.location.hash = '#/exam';
  ({ store, root, tick, go, text, click } = await bootApp());
});

describe('tải lại trang giữa bài thi', () => {
  it('mở app ở #/exam thì vào lại ĐÚNG bài đang làm, đáp án đã chọn còn nguyên', () => {
    expect(text()).toContain('câu 131–134');
    const first = root.querySelector('.set-q .option.picked .letter');
    expect(first?.textContent).toBe('C');
    expect(localStorage.getItem(STATE_KEY)).not.toBeNull();
  });

  it('phần Nghe khôi phục sau khi đã nghe: băng không tự chạy lại được → có nút đi tiếp, không kẹt', async () => {
    await go('#/');                                         // rời màn = bỏ bài (xoá bản lưu), đúng ý
    expect(localStorage.getItem(STATE_KEY)).toBeNull();
    await go('#/exam');
    // Màn chọn đề khôi phục mỗi lần vẽ — dựng bài Part 3 đã nghe hết như vừa tải lại trang giữa phần Nghe.
    localStorage.setItem(STATE_KEY, saved({ mode: 'part3', heard: { 'p3-0001': 1, 'p3-0002': 1 } }));
    store.refresh();
    await tick();
    expect(root.querySelector('button.listen-play').disabled).toBe(true);   // đã nghe thì không nghe lại
    expect(text()).toContain('Tiếp tục →');
    await click((t) => t.startsWith('Tiếp tục'));
    expect(fake.unlock).toHaveBeenCalled();
    expect(text()).toContain('Hết phần Nghe →');            // bộ thứ hai (cuối) cũng đã nghe
    await click((t) => t.startsWith('Hết phần Nghe'));
    await tick(80);
    expect(text()).toContain('Kết quả');
  });
});
