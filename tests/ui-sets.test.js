// @vitest-environment jsdom
/**
 * Màn luyện các bộ tài liệu + nhiều câu hỏi (Part 3, 4, 6, 7), với bộ phát âm thanh GIẢ.
 * Các `it` chạy nối tiếp, dùng chung một app (xem tests/helpers/ui-app.js).
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { bootApp } from './helpers/ui-app.js';
import { setSetsPlayerFactory } from '../src/ui/sets-screen.js';

let store; let root; let tick; let go; let key; let text; let click;
let fake;

function makeFake() {
  const calls = [];
  return {
    calls, preload: vi.fn(async () => {}), stop: vi.fn(), dispose: vi.fn(),
    play: vi.fn(async (steps, { onStep } = {}) => { calls.push(steps); for (const s of steps) onStep?.(s); return 'done'; }),
  };
}
const options = (i) => [...root.querySelectorAll('.set-q')][i].querySelectorAll('.option');
const answered = () => store.exportEvents().filter((e) => e.type === 'question.answered');
const choose = async (qIndex, letter) => {
  [...options(qIndex)].find((b) => b.querySelector('.letter').textContent === letter).click();
  await tick(50);
};

beforeAll(async () => {
  fake = makeFake();
  setSetsPlayerFactory(() => fake);
  ({ store, root, tick, go, key, text, click } = await bootApp());
});

describe('mục Bài thi liệt kê các phần đã có bộ đề', () => {
  it('có nút cho Part 3, 6, 7; không có Part 4 (chưa có bộ nào)', async () => {
    await go('#/exams');
    expect(text()).toContain('Luyện Part 3 — Hội thoại');
    expect(text()).toContain('Luyện Part 6 — Điền đoạn văn');
    expect(text()).toContain('Luyện Part 7 — Đọc hiểu');
    expect(text()).not.toContain('Part 4');
    expect(text()).toContain('2 bộ');                       // Part 3 có 2 bộ
  });
});

describe('Part 6: đọc đoạn văn rồi trả lời từng chỗ trống', () => {
  it('bố cục hai cột: đoạn văn bên trái, câu hỏi bên phải; chỗ trống in kèm số câu', async () => {
    await go('#/sets?part=6');
    // Chỗ trống [1]..[4] được in thành ô trống đánh số như đề thật, không còn dấu ngoặc vuông
    expect(text()).toContain('1. -------');
    expect(text()).toContain('4. -------');
    expect(text()).not.toContain('[1]');
    expect(root.querySelector('.split-material').textContent).toContain('Dear staff');
    expect(root.querySelector('.split-questions').querySelectorAll('.set-q')).toHaveLength(4);
    expect(document.querySelector('nav.tabbar').hidden).toBe(true);
    expect(root.querySelector('.tray')).not.toBeNull();
    expect(text()).toContain('còn 1 bộ');
  });

  it('chọn đáp án khi CHƯA xong bộ: chỉ tô lại, không chấm, không giải thích, chưa ghi nhật ký (D42)', async () => {
    const events = store.eventCount;
    await choose(0, 'A');                                  // đáp án câu 1 là B
    expect(store.eventCount).toBe(events);                 // chưa ghi gì cả
    expect(text()).not.toContain('Sai — đáp án là B');
    expect(text()).not.toContain('Giải thích câu 1');
    expect(text()).not.toContain('Bộ tiếp theo');
    expect(text()).toContain('Còn 3 câu nữa');
    expect(options(0)[0].className).toContain('picked');
  });

  it('đổi đáp án trước khi chấm được, chỉ giữ lựa chọn cuối', async () => {
    await choose(0, 'C');
    expect([...options(0)].filter((b) => b.className.includes('picked'))).toHaveLength(1);
    expect(options(0)[2].className).toContain('picked');
    await choose(0, 'A');                                  // quay lại A để phần sau chấm ra "sai"
  });

  it('phím 1–4 trả lời câu đầu tiên chưa trả lời (câu 2)', async () => {
    await key('3');
    await tick(50);
    expect(options(1)[2].className).toContain('picked');
    expect(store.exportEvents().some((e) => e.payload?.questionId === 'p6-0001-2')).toBe(false);
  });

  it('trả lời câu cuối: chấm CẢ BỘ một lượt, hiện giải thích và ghi 4 sự kiện', async () => {
    const events = store.eventCount;
    await choose(2, 'D');
    expect(store.eventCount).toBe(events);                 // còn một câu nữa
    await choose(3, 'A');
    await tick(80);
    expect(store.eventCount).toBe(events + 4);             // ghi gói gọn cả bộ
    const p6 = answered().filter((e) => e.payload.questionId.startsWith('p6-'));
    // .sort(): cả bộ được ghi trong CÙNG một mili-giây nên thứ tự trong nhật ký không cố định — so theo tập.
    expect(p6.map((e) => e.payload.questionId).sort()).toEqual(['p6-0001-1', 'p6-0001-2', 'p6-0001-3', 'p6-0001-4']);
    expect(p6.find((e) => e.payload.questionId === 'p6-0001-1').payload).toEqual({ questionId: 'p6-0001-1', choice: 'A', correct: false, errorType: 'grammar-in-context' });
    expect(text()).toContain('Sai — đáp án là B');
    expect(text()).toContain('Giải thích câu 1');
    expect(text()).toContain('Giải thích câu 4');
    expect(text()).not.toContain('Còn 1 câu nữa');
  });

  it('chấm xong thì khoá, bấm nữa không ghi thêm', async () => {
    const events = store.eventCount;
    await choose(0, 'B');
    expect(store.eventCount).toBe(events);
  });

  it('xong bộ thì sang bộ kế, bộ đó tính là xong lượt', async () => {
    expect(text()).toContain('Bộ tiếp theo');
    await key(' ');
    expect(text()).toContain('Xong lượt này');
    expect(text()).toContain('Đã làm 1 bộ');
  });
});

describe('Part 3: nghe hội thoại', () => {
  it('câu hỏi hiện sẵn để xem trước, chữ hội thoại CHƯA hiện', async () => {
    await go('#/sets?part=3');
    expect(root.querySelectorAll('.set-q')).toHaveLength(3);
    expect(text()).toContain('Nghe đoạn này');
    expect(text()).not.toContain('Hello Tom');
    expect(fake.preload).toHaveBeenCalled();
  });

  it('bấm Nghe phát đủ các lượt nói xen khoảng lặng', async () => {
    await click((t) => t.includes('Nghe đoạn này'));
    const steps = fake.calls.at(-1);
    expect(steps.filter((s) => s.type === 'clip').map((s) => s.key)).toEqual([0, 1]);
    expect(steps.map((s) => s.type)).toEqual(['clip', 'gap', 'clip']);
    expect(text()).toContain('Nghe lại');
  });

  it('sau khi trả lời hết mới hiện transcript có nhãn người nói, và từng từ gạt được', async () => {
    await choose(0, 'B'); await choose(1, 'C'); await choose(2, 'D');
    await tick(80);
    expect(text()).toContain('Hello Tom, the shipment number');
    expect(text()).toContain('Well, let me check');
    const labels = [...root.querySelectorAll('.transcript-line .letter')].map((n) => n.textContent);
    expect(labels).toEqual(['W', 'M']);
    const token = [...root.querySelectorAll('.transcript-line .tok')].find((t) => t.textContent === 'warehouse');
    token.click();
    await tick();
    root.querySelector('.tray-add').click();
    await tick(80);
    expect(store.captured.get('warehouse').questionIds).toEqual(['p3-0001']);
  });

  it('câu trả lời của bộ nghe ghi cùng loại sự kiện và id dạng p3-0001-n', () => {
    const ids = answered().filter((e) => e.payload.questionId.startsWith('p3-')).map((e) => e.payload.questionId).sort();
    expect(ids).toEqual(['p3-0001-1', 'p3-0001-2', 'p3-0001-3']);
  });
});

describe('đổi phần ngay trong màn luyện', () => {
  it('sang phần khác bằng địa chỉ thì lượt của phần cũ không dính sang (lỗi thật đã gặp)', async () => {
    await go('#/sets?part=3');                              // Part 3 đã làm 1 bộ ở trên
    await go('#/sets?part=7');                              // cùng màn, khác phần: KHÔNG qua thay đổi route
    expect(text()).toContain('còn 2 bộ');                   // lượt Part 7 đầy đủ 2 bộ
    expect(root.querySelector('.set-title')).not.toBeNull();
  });
});

describe('Part 7 và báo lỗi', () => {
  it('bộ đọc đơn hiện một tài liệu; làm xong sang bộ kế là bộ HAI tài liệu với đủ nhãn từng tài liệu', async () => {
    await go('#/sets?part=7');
    expect(root.querySelector('.set-title').textContent).toBe('Bộ p7-0001');
    expect(root.querySelectorAll('.passage')).toHaveLength(1);
    expect(root.querySelector('.passage .gaps-title')).toBeNull();          // một tài liệu thì không cần nhãn
    for (let i = 0; i < 2; i += 1) await key('1');
    await tick(50);
    await key(' ');
    expect(root.querySelector('.set-title').textContent).toBe('Bộ p7-0002');
    expect(root.querySelectorAll('.passage')).toHaveLength(2);
    expect([...root.querySelectorAll('.passage .gaps-title')].map((n) => n.textContent)).toEqual(['Email', 'Reply']);
    expect(root.querySelectorAll('.set-q')).toHaveLength(5);
  });

  it('báo bộ có vấn đề: ghi question.reported cho MỌI câu của bộ và loại bộ khỏi hàng đợi', async () => {
    await go('#/exams');
    await go('#/sets?part=6');
    // bộ Part 6 đã làm hết → đang ở màn "Hết bộ"; dùng Part 7 để báo lỗi
    await go('#/exams');
    await go('#/sets?part=7');
    const before = store.exportEvents().filter((e) => e.type === 'question.reported').length;
    const total = root.querySelectorAll('.set-q').length;
    for (let i = 0; i < total; i += 1) await key('1');
    await tick(50);
    await click((t) => t.includes('Báo bộ này có vấn đề'));
    await tick(80);
    const after = store.exportEvents().filter((e) => e.type === 'question.reported').length;
    expect(after - before).toBe(total);
  });

  it('chưa chọn phần nào hoặc phần không có bộ thì báo rõ cách sinh', async () => {
    await go('#/sets?part=4');
    expect(text()).toContain('npm run build:sets -- --part 4');
  });

  it('rời màn thì dừng và giải phóng bộ phát', async () => {
    fake.dispose.mockClear();
    await go('#/');
    expect(fake.dispose).toHaveBeenCalled();
  });
});
