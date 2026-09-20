// @vitest-environment jsdom
/**
 * Thi thử (M15) chạy thật qua giao diện, bộ phát âm thanh GIẢ. Các `it` chạy nối tiếp, dùng chung một app.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { bootApp } from './helpers/ui-app.js';
import { setExamPlayerFactory } from '../src/ui/exam-screen.js';

let store; let root; let tick; let go; let key; let text; let click;
let fake;

function makeFake() {
  return {
    calls: [], preload: vi.fn(async () => {}), stop: vi.fn(), dispose: vi.fn(),
    play: vi.fn(async function play(steps) { this.calls.push(steps); return 'done'; }),
  };
}
const nav = () => document.querySelector('nav.tabbar');
const start = async (label) => { await go('#/exam'); await click((t) => t.startsWith(label)); await tick(30); };
const eventsOf = (type) => store.exportEvents().filter((e) => e.type === type);
const pick = async (unitQ, letter) => {
  [...root.querySelectorAll('.set-q')][unitQ].querySelectorAll('.option').forEach((b) => { if (b.querySelector('.letter').textContent === letter) b.click(); });
  await tick(30);
};

beforeAll(async () => {
  fake = makeFake();
  setExamPlayerFactory(() => fake);
  ({ store, root, tick, go, key, text, click } = await bootApp());
});

describe('màn chọn chế độ', () => {
  it('mục Bài thi có nút Thi thử', async () => {
    await go('#/exams');
    expect(text()).toContain('Thi thử');
  });

  it('liệt kê đề đủ, theo kỹ năng, theo từng Part; nói rõ thiếu bao nhiêu so với đề thật', async () => {
    await go('#/exam');
    expect(text()).toContain('Đề đủ');
    expect(text()).toContain('Chỉ phần Nghe');
    expect(text()).toContain('Riêng Part 6');
    expect(text()).toMatch(/thiếu \d+ câu so với đề thật/);
    expect(nav().hidden).toBe(true);
  });

  it('phần chưa có câu hỏi nào (Part 4) bị vô hiệu', () => {
    const btn = [...root.querySelectorAll('button')].find((b) => b.textContent.startsWith('Riêng Part 4'));
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('chưa có câu hỏi nào');
  });
});

describe('làm bài Part 6 (bộ 4 câu)', () => {
  it('có đồng hồ đếm ngược, số câu, và KHÔNG có phản hồi gì lúc làm bài', async () => {
    await start('Riêng Part 6');
    expect(root.querySelector('.exam-clock').textContent).toMatch(/^\d{2}:\d{2}$/);
    expect(text()).toContain('câu 1–4/4');
    expect(root.querySelectorAll('.set-q')).toHaveLength(4);
    expect(text()).not.toMatch(/Đúng|Sai —|Giải thích/);
  });

  it('chọn đáp án chỉ tô đáp án đã chọn (không chấm), đổi lại được', async () => {
    await pick(0, 'A');
    expect([...root.querySelectorAll('.set-q')][0].querySelectorAll('.option.picked')).toHaveLength(1);
    await pick(0, 'C');
    const picked = [...root.querySelectorAll('.set-q')][0].querySelectorAll('.option.picked');
    expect(picked).toHaveLength(1);
    expect(picked[0].querySelector('.letter').textContent).toBe('C');
    expect(text()).not.toMatch(/Đúng|Sai —/);
  });

  it('phím tắt chọn cho câu đầu tiên chưa trả lời', async () => {
    await key('2');                                        // câu 2 → B
    await tick(30);
    const q2 = [...root.querySelectorAll('.set-q')][1].querySelector('.option.picked .letter');
    expect(q2.textContent).toBe('B');
  });

  it('danh sách câu hiện đúng trạng thái dở dang', async () => {
    await click((t) => t.includes('Danh sách câu'));
    expect(root.querySelectorAll('.pal')).toHaveLength(1);
    expect(root.querySelector('.pal').className).toContain('part');       // mới làm 2/4 câu
    await click((t) => t.includes('Ẩn danh sách'));
  });

  it('chưa nộp thì chưa ghi gì vào nhật ký', () => {
    expect(eventsOf('exam.finished')).toHaveLength(0);
    expect(store.exportEvents().some((e) => e.payload?.mode === 'exam')).toBe(false);
  });

  it('nộp bài: hỏi xác nhận và nói rõ còn bao nhiêu câu chưa trả lời', async () => {
    await click((t) => t.includes('Nộp bài'));
    expect(text()).toContain('Còn 2 câu chưa trả lời');
    await click((t) => t.includes('Làm tiếp'));
    expect(text()).not.toContain('Còn 2 câu chưa trả lời');
  });

  it('xác nhận nộp: ghi MỘT lần gói gọn — mỗi câu đã trả lời một sự kiện (mode exam) + exam.finished', async () => {
    const before = store.eventCount;
    await click((t) => t.includes('Nộp bài'));
    await click((t) => t === 'Nộp bài' && t.length === 8 || t.startsWith('Nộp bài'), root.querySelector('.confirm'));
    await tick(80);
    expect(store.eventCount - before).toBe(2 + 1);
    const answered = store.exportEvents().filter((e) => e.payload?.mode === 'exam');
    expect(answered.map((e) => e.payload.questionId).sort()).toEqual(['p6-0001-1', 'p6-0001-2']);
    expect(eventsOf('exam.finished')).toHaveLength(1);
    expect(eventsOf('exam.finished')[0].payload).toMatchObject({ mode: 'part6', total: 4, answered: 2, timedOut: false });
  });

  it('kết quả: số câu đúng, thời gian, theo phần, và xem lại các câu sai kèm giải thích', () => {
    expect(text()).toContain('Kết quả');
    expect(text()).toMatch(/\/ 4 câu đúng/);
    expect(text()).toContain('trả lời 2/4 câu');
    expect(text()).toContain('Part 6');
    expect(text()).toContain('chưa phải điểm 10–990');
    const wrong = root.querySelector('.wrong-list');
    expect(wrong.textContent).toMatch(/Xem lại \d câu sai hoặc bỏ trống/);
    expect(wrong.textContent).toContain('Bạn chưa trả lời câu này');
    expect(wrong.textContent).toContain('✓ đáp án đúng');
  });

  it('số liệu ở màn kết quả dùng màu trung tính, không dùng màu "lỗ hổng" (đỏ) cho điểm số', () => {
    const values = [...root.querySelectorAll('.gap-value')];
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((v) => v.classList.contains('plain'))).toBe(true);
  });

  it('câu đã làm trong thi thử được tính vào thống kê (trạng thái câu hỏi)', () => {
    expect(store.quizStates.get('p6-0001-1').attempts).toBe(1);
    expect(store.quizStates.get('p6-0001-3')).toBeUndefined();          // câu bỏ trống thì không ghi
  });

  it('"Làm đề khác" quay về màn chọn chế độ', async () => {
    await click((t) => t.includes('Làm đề khác'));
    expect(text()).toContain('Theo từng Part');
  });
});

describe('Part 2 và bộ nghe trong thi thử', () => {
  it('Part 2: chỉ thấy A/B/C, KHÔNG có chữ; bấm Nghe phát chuỗi câu hỏi + 3 câu đáp', async () => {
    await start('Riêng Part 2');
    const options = [...root.querySelectorAll('.option')];
    expect(options).toHaveLength(3);
    expect(options.every((b) => b.querySelector('.option-text').textContent === '')).toBe(true);
    expect(text()).not.toContain('signed contract');
    await click((t) => t.includes('Nghe câu này'));
    expect(fake.calls.at(-1).filter((s) => s.type === 'clip').map((s) => s.key)).toEqual(['question', 'A', 'B', 'C']);
    expect(text()).toContain('đã nghe 1 lần');
  });

  it('điều hướng bằng ← → và nút Trước/Tiếp; ở đơn vị đầu thì Trước bị khoá', async () => {
    expect(text()).toContain('câu 1/3');
    expect([...root.querySelectorAll('button')].find((b) => b.textContent.includes('Trước')).disabled).toBe(true);
    await key('ArrowRight'); await tick(30);
    expect(text()).toContain('câu 2/3');
    await key('ArrowLeft'); await tick(30);
    expect(text()).toContain('câu 1/3');
  });

  it('đơn vị cuối có nút Nộp bài thay cho Tiếp', async () => {
    await key('ArrowRight'); await key('ArrowRight'); await tick(30);
    expect(text()).toContain('câu 3/3');
    expect([...root.querySelectorAll('.exam-nav button')].map((b) => b.textContent)).toEqual(['← Trước', 'Nộp bài']);
    await go('#/');                                        // bỏ bài dở
  });

  it('Part 3 (bộ nghe): phát theo lượt nói, câu hỏi hiện sẵn, không có chữ hội thoại', async () => {
    await start('Riêng Part 3');
    expect(root.querySelectorAll('.set-q')).toHaveLength(3);
    expect(text()).not.toContain('Hello Tom');
    await click((t) => t.includes('Nghe đoạn này'));
    expect(fake.calls.at(-1).filter((s) => s.type === 'clip')).toHaveLength(2);
    await go('#/');
  });
});

describe('hết giờ tự nộp', () => {
  it('hết giờ thì tự nộp đúng một lần, ghi timedOut và hiện "Hết giờ"', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    try {
      await start('Riêng Part 6');
      await pick(0, 'B');
      const finishedBefore = eventsOf('exam.finished').length;
      vi.advanceTimersByTime(13 * 60 * 1000);              // Part 6: 16/100 × 75 phút = 12 phút
      vi.useRealTimers();
      await tick(100);
      expect(text()).toContain('Hết giờ');
      expect(eventsOf('exam.finished')).toHaveLength(finishedBefore + 1);
      expect(eventsOf('exam.finished').at(-1).payload).toMatchObject({ timedOut: true, answered: 1 });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('rời màn', () => {
  it('rời màn giải phóng bộ phát; quay lại vẫn thấy màn chọn chế độ (không kẹt bài cũ)', async () => {
    fake.dispose.mockClear();
    await go('#/');
    expect(fake.dispose).toHaveBeenCalled();
    await go('#/exam');
    expect(text()).toContain('Theo từng Part');
  });
});
