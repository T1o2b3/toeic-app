// @vitest-environment jsdom
/**
 * Màn luyện nghe Part 2 (M9), chạy thật qua giao diện với bộ phát âm thanh GIẢ (jsdom không phát được tiếng).
 * Các `it` chạy nối tiếp, dùng chung một app (xem tests/helpers/ui-app.js).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { bootApp } from './helpers/ui-app.js';
import { setListenPlayerFactory } from '../src/ui/listen-screen.js';
import { getListenSpeed } from '../src/data/prefs.js';

let store; let root; let tick; let go; let key; let text; let click;
let fake;

/** Bộ phát giả: "phát" tức là đi qua từng bước và báo onStep, rồi xong. */
function makeFake() {
  const calls = [];
  return {
    calls,
    preload: vi.fn(async () => {}),
    stop: vi.fn(),
    dispose: vi.fn(),
    play: vi.fn(async (steps, { rate, onStep } = {}) => {
      calls.push({ steps, rate });
      for (const step of steps) onStep?.(step);
      return 'done';
    }),
  };
}

const opts = () => [...root.querySelectorAll('.listen-opt')];
const level = () => store.quizStates;
const answeredEvents = () => store.exportEvents().filter((e) => e.type === 'question.answered');

beforeAll(async () => {
  fake = makeFake();
  setListenPlayerFactory(() => fake);
  ({ store, root, tick, go, key, text, click } = await bootApp());
});

describe('màn chính', () => {
  it('có nút Luyện nghe Part 2 với số câu và gợi ý tai nghe', async () => {
    await go('#/');
    expect(text()).toContain('Luyện nghe Part 2');
    expect(text()).toContain('3 câu');
    expect(text()).toContain('tai nghe');
  });
});

describe('trước khi nghe', () => {
  it('chỉ thấy ba nút A/B/C — KHÔNG có chữ của câu hỏi hay câu đáp (đúng như bài thi thật)', async () => {
    await go('#/listen');
    expect(opts()).toHaveLength(3);
    expect(opts().map((b) => b.querySelector('.letter').textContent)).toEqual(['A', 'B', 'C']);
    expect(text()).not.toContain('signed contract');
    expect(text()).not.toContain('Ms. Park');
  });

  it('nút chọn bị khoá cho tới khi nghe hết; bấm phím 1 lúc này không ghi gì', async () => {
    expect(opts().every((b) => b.disabled)).toBe(true);
    const events = store.eventCount;
    await key('1');
    expect(store.eventCount).toBe(events);
  });
});

describe('nghe', () => {
  it('bấm Nghe phát đủ chuỗi: câu hỏi, A, B, C xen khoảng lặng, ở tốc độ mặc định', async () => {
    await click((t) => t.includes('Nghe câu này'));
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0].steps.filter((s) => s.type === 'clip').map((s) => s.key)).toEqual(['question', 'A', 'B', 'C']);
    expect(fake.calls[0].rate).toBe(1);
  });

  it('nghe xong thì mở khoá nút chọn và đổi nút thành "Nghe lại"', async () => {
    expect(opts().every((b) => !b.disabled)).toBe(true);
    expect(text()).toContain('Nghe lại');
  });

  it('đổi tốc độ được lưu và áp dụng cho lần phát kế tiếp', async () => {
    await click((t) => t === '0.75×');
    expect(getListenSpeed()).toBe(0.75);
    await click((t) => t.includes('Nghe lại'));
    expect(fake.calls.at(-1).rate).toBe(0.75);
  });

  it('tải trước âm thanh của câu hiện tại và câu kế (để chạm là phát được ngay)', () => {
    const loaded = fake.preload.mock.calls.flat(2);
    expect(loaded.length).toBeGreaterThanOrEqual(8);
    expect(loaded[0]).toMatch(/^\/audio\/\d{16}\.mp3$/);
  });
});

describe('trả lời', () => {
  it('chọn sai: ghi question.answered đúng dữ liệu, hiện đáp án đúng, transcript và giải thích', async () => {
    const events = store.eventCount;
    await click((t) => t.startsWith('A'), root.querySelector('.options'));
    await tick(50);
    expect(store.eventCount).toBe(events + 1);
    const last = answeredEvents().at(-1).payload;
    expect(last).toEqual({ questionId: 'l2-0001', choice: 'A', correct: false, errorType: 'wh-where' });
    expect(text()).toContain('Sai — đáp án là B');
    expect(text()).toContain('Where should I send the signed contract?');
    expect(text()).toContain('Ms. Park in legal has the address.');
    expect(text()).toContain('Câu hỏi Where');
  });

  it('bộ phát bị dừng khi đã trả lời', () => {
    expect(fake.stop).toHaveBeenCalled();
  });

  it('bấm chọn lần nữa không ghi trùng', async () => {
    const events = store.eventCount;
    await key('c');
    expect(store.eventCount).toBe(events);
  });

  it('có thể gạt từ lạ ngay từ transcript (D34)', async () => {
    const token = [...root.querySelectorAll('.transcript-line .tok')].find((t) => t.textContent === 'address');
    token.click();
    await tick();
    root.querySelector('.tray-add').click();
    await tick(80);
    expect(store.captured.has('address')).toBe(true);
    expect(store.captured.get('address').questionIds).toEqual(['l2-0001']);
  });
});

describe('câu kế và phím tắt', () => {
  it('Space sang câu kế: quay về trạng thái chưa nghe, nút khoá lại', async () => {
    await key(' ');
    expect(opts()).toHaveLength(3);
    expect(opts().every((b) => b.disabled)).toBe(true);
    expect(text()).not.toContain('Sai — đáp án');
    expect(text()).toContain('Nghe câu này');
  });

  it('Space nghe, rồi phím 3 chọn đúng (câu 2 đáp án C) — ghi đúng', async () => {
    await key(' ');
    await tick(50);
    await key('3');
    await tick(50);
    const last = answeredEvents().at(-1).payload;
    expect(last.correct).toBe(true);
    expect(last.choice).toBe('C');
    expect(text()).toContain('Đúng');
  });

  it('bấm phím chọn hai lần thật nhanh chỉ ghi một sự kiện', async () => {
    await key(' '); // sang câu 3
    await key(' '); // nghe
    await tick(50);
    const events = store.eventCount;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    await tick(80);
    expect(store.eventCount).toBe(events + 1);
  });

  it('câu làm sai (câu 1) được xếp lại vào lượt sau, câu đúng thì xuống cuối', async () => {
    await key(' '); // hết lượt vì 3 câu đã làm
    expect(text()).toContain('Xong lượt này');
    await go('#/');
    await go('#/listen');
    const first = level().get('l2-0001');
    expect(first.lastCorrect).toBe(false);
    expect(text()).toContain('còn 3 câu');
  });
});

describe('báo lỗi và rời màn', () => {
  it('báo câu sai: ghi question.reported và câu đó bị loại khỏi hàng đợi', async () => {
    await key(' '); await tick(50); // nghe câu đầu (câu 1 vì từng sai)
    await key('1'); await tick(50);
    await click((t) => t.includes('Báo câu này sai'));
    await tick(50);
    expect(store.exportEvents().some((e) => e.type === 'question.reported')).toBe(true);
    expect(level().get('l2-0001').reported).toBe(true);
  });

  it('rời màn thì dừng và giải phóng bộ phát', async () => {
    fake.dispose.mockClear();
    await go('#/');
    expect(fake.dispose).toHaveBeenCalled();
  });

  it('không có câu nghe nào thì báo rõ cách sinh', async () => {
    const empty = await import('../src/ui/listen-screen.js');
    const shell = { listening: [], quizStates: new Map(), refresh() {} };
    expect(empty.renderListen(shell).textContent).toContain('npm run build:listening');
  });
});
