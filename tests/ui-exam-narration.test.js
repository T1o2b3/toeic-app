// @vitest-environment jsdom
/**
 * Băng thi thử CÓ giọng đọc lời dẫn (D69): hướng dẫn đầu Part, "Questions 32 through 34 refer to…", đọc từng câu hỏi
 * Part 3/4 kèm 8 giây. File riêng vì cần mở app với narration.json (mặc định test không có — như khi chưa chạy pipeline).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { bootApp } from './helpers/ui-app.js';
import { setExamPlayerFactory } from '../src/ui/exam-screen.js';
import { PART_DIRECTIONS } from '../src/logic/exam-directions.js';

const stems = (id) => [1, 2, 3].map((n) => `Question ${n} of ${id}?`);
const NARRATION = Object.fromEntries([
  PART_DIRECTIONS.part2, PART_DIRECTIONS.part3,
  'Questions 32 through 34 refer to the following conversation.',
  'Questions 35 through 37 refer to the following conversation.',
  ...stems('p3-0001'), ...stems('p3-0002'),
].map((text, i) => [text, `audio/${String(i).padStart(16, 'e')}.mp3`]));

let root; let tick; let go; let text; let click;
let release = null;                                         // lần phát đang "chạy" — test tự cho xong
const fake = {
  preload: vi.fn(async () => {}), stop: vi.fn(), dispose: vi.fn(), unlock: vi.fn(),
  play: vi.fn(() => new Promise((resolve) => { release = () => resolve('done'); })),
};
const keysOf = (call) => call[0].filter((s) => s.type === 'clip').map((s) => s.key);
const tape = async (seconds) => {
  for (let i = 0; i < seconds; i += 1) { vi.advanceTimersByTime(1000); await tick(5); }
  await tick(30);
};
const finish = async () => { release(); await tick(30); };

beforeAll(async () => {
  setExamPlayerFactory(() => fake);
  ({ root, tick, go, text, click } = await bootApp({ narration: NARRATION }));
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
});
afterAll(() => { vi.useRealTimers(); });

describe('băng có giọng đọc lời dẫn (D69)', () => {
  it('đầu Part 3: băng ĐỌC hướng dẫn thay cho đếm ngược 10 giây, rồi giới thiệu bộ, hội thoại, đọc từng câu hỏi', async () => {
    await go('#/exam');
    await click((t) => t.startsWith('Riêng Part 3'));
    expect(root.querySelector('.directions .countdown-note')).toBeNull();
    expect(fake.play).toHaveBeenCalledTimes(1);
    expect(keysOf(fake.play.mock.calls[0])).toEqual(['directions', 'intro', 0, 1, 'q0', 'q1', 'q2']);
    const steps = fake.play.mock.calls[0][0];
    expect(steps.filter((s) => s.type === 'gap' && s.ms === 8000)).toHaveLength(3);   // 8 giây mỗi câu như đề thật
    // Lời dẫn cũng được tải trước như đoạn nghe — không khựng giữa băng.
    const preloaded = fake.preload.mock.calls.flat(2);
    expect(preloaded).toContain(`/${NARRATION[PART_DIRECTIONS.part3]}`);
    expect(preloaded).toContain(`/${NARRATION['Question 1 of p3-0001?']}`);
  });

  it('băng đang chạy thì hết giờ cũng KHÔNG cắt ngang — phần Nghe do băng quyết định lúc hết', async () => {
    await tape(4 * 60);                                     // quá giờ của 6 câu (≈ 3 phút)
    expect(text()).not.toContain('Kết quả');
    expect(text()).toContain('câu 32–34');
  });

  it('hết băng (đã gồm 8 giây mỗi câu) thì sang bộ sau NGAY, không đếm thêm 15 giây', async () => {
    await finish();
    await tape(1);
    expect(text()).toContain('câu 35–37');
    expect(keysOf(fake.play.mock.calls[1])).toEqual(['intro', 0, 1, 'q0', 'q1', 'q2']);   // giữa Part: không đọc lại hướng dẫn
  });

  it('bộ cuối hết băng thì hết phần Nghe — chế độ chỉ Part 3 thì nộp bài', async () => {
    await finish();
    await tape(1);
    await tick(80);
    expect(text()).toContain('Kết quả');
    await go('#/');
  });

  it('Part 2: băng đọc hướng dẫn rồi phát câu đầu liền một mạch', async () => {
    fake.play.mockClear();
    await go('#/exam');
    await click((t) => t.startsWith('Riêng Part 2'));
    expect(keysOf(fake.play.mock.calls[0])).toEqual(['directions', 'question', 'A', 'B', 'C']);
    await finish();
    expect(root.querySelector('.countdown-note').textContent).toBe('Tự sang câu tiếp sau 5 giây');   // Part 2 giữ 5 giây
    await go('#/');
  });
});
