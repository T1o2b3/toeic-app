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
    expect(nav().classList.contains('in-session')).toBe(true);
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
    expect(text()).toContain('câu 131–134');                 // số hiệu THẬT của đề (Part 6 = 131–146)
    expect(root.querySelectorAll('.set-q')).toHaveLength(4);
    expect(text()).not.toMatch(/Đúng|Sai —|Giải thích/);
    // Đoạn văn in chỗ trống kèm số câu ngay tại chỗ, như đề thật; không còn "[1]"
    expect(text()).toContain('131. -------');
    expect(text()).not.toContain('[1]');
    expect(root.querySelectorAll('.split-material').length).toBe(1);
    expect(root.querySelectorAll('.split-questions').length).toBe(1);
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
    expect(text()).toMatch(/\d\/4 câu đúng/);
    expect(text()).toContain('trả lời 2/4 câu');
    expect(text()).toContain('Part 6');
    expect(text()).toContain('điểm ƯỚC LƯỢNG');
    expect(text()).toContain('khoảng điểm càng rộng');       // làm 4 câu thì phải nói rõ là suy ra từ rất ít câu
    // Tiêu đề nằm ở khối bao `.wrong-review`; `.wrong-list` chỉ chứa các câu (đổi khi chia tab theo Part).
    expect(root.querySelector('.wrong-review').textContent).toMatch(/Xem lại \d câu sai hoặc bỏ trống/);
    const wrong = root.querySelector('.wrong-list');
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
    expect(text()).toContain('Đã nghe xong');
  });

  it('nghe xong là KHOÁ, không nghe lại được — kể cả bằng phím Space (đề thật phát một lần, M21)', async () => {
    const played = fake.play.mock.calls.length;
    const button = root.querySelector('button.listen-play');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('đề thật không cho nghe lại');
    button.click();
    await key(' ');
    await tick(30);
    expect(fake.play.mock.calls).toHaveLength(played);      // không phát thêm lần nào
  });

  it('rời đơn vị rồi quay lại vẫn không nghe thêm được (đếm theo từng đơn vị, không reset khi chuyển câu)', async () => {
    const played = fake.play.mock.calls.length;
    await key('ArrowRight'); await tick(30);
    expect(root.querySelector('button.listen-play').disabled).toBe(false);   // câu MỚI thì nghe được
    await key('ArrowLeft'); await tick(30);
    expect(root.querySelector('button.listen-play').disabled).toBe(true);    // câu cũ vẫn khoá
    expect(fake.play.mock.calls).toHaveLength(played);
  });

  it('điều hướng bằng ← → và nút Trước/Tiếp; ở đơn vị đầu thì Trước bị khoá', async () => {
    expect(text()).toContain('câu 7');                        // Part 2 trong đề thật là câu 7–31
    expect([...root.querySelectorAll('button')].find((b) => b.textContent.includes('Trước')).disabled).toBe(true);
    await key('ArrowRight'); await tick(30);
    expect(text()).toContain('câu 8');
    await key('ArrowLeft'); await tick(30);
    expect(text()).toContain('câu 7');
  });

  it('đơn vị cuối có nút Nộp bài thay cho Tiếp', async () => {
    await key('ArrowRight'); await key('ArrowRight'); await tick(30);
    expect(text()).toContain('câu 9');
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

describe('đề đủ chia hai phần tính giờ riêng như đề thật (D39)', () => {
  it('bắt đầu ở phần Nghe, đồng hồ là giờ của RIÊNG phần Nghe', async () => {
    await go('#/');                                         // rời màn để bỏ bài thi trước
    await start('Đề đủ');
    expect(text()).toContain('Phần Nghe');
    expect(text()).toContain('câu 7');
    // Nghe 9 câu / 94 câu của đề thật × 45 phút ≈ 4 phút, KHÔNG phải giờ của cả bài
    expect(root.querySelector('.exam-clock').textContent).toMatch(/^04:1\d$/);
  });

  it('danh sách câu chỉ hiện các câu của phần đang làm', async () => {
    await click((t) => t.includes('Danh sách câu'));
    expect(root.querySelectorAll('.pal')).toHaveLength(5);   // 3 câu Part 2 + 2 bộ Part 3
    await click((t) => t.includes('Ẩn danh sách'));
  });

  it('cuối phần Nghe: nút chuyển phần, có cảnh báo không quay lại được', async () => {
    for (let i = 0; i < 4; i += 1) { await key('ArrowRight'); }
    await tick(30);
    const next = [...root.querySelectorAll('.exam-nav button')].at(-1);
    expect(next.textContent).toContain('Xong phần nghe');
    await click((t) => t.includes('Xong phần nghe'));
    expect(text()).toContain('KHÔNG quay lại');
    expect(text()).toContain('sang phần đọc');
  });

  it('hết phần Nghe thì đồng hồ chạy lại theo giờ phần Đọc và không lùi về phần trước được', async () => {
    await click((t) => t.startsWith('Sang phần đọc'));
    expect(text()).toContain('Phần Đọc');
    expect(root.querySelector('.exam-clock').textContent).toBe('09:00');  // 12 câu / 100 × 75 phút
    const back = [...root.querySelectorAll('.exam-nav button')][0];
    expect(back.disabled).toBe(true);
    await key('ArrowLeft'); await tick(30);
    expect(text()).toContain('Phần Đọc');                   // phím ← cũng không lùi qua ranh giới phần
  });

  it('câu Part 5 mang số 101 và chỗ trống in dài như đề thật', async () => {
    expect(text()).toContain('101');
    expect(text()).toContain('-------');
    expect(root.querySelector('.blank')).not.toBe(null);
  });

  it('nộp bài: có điểm ước lượng cho CẢ HAI phần và điểm tổng', async () => {
    await click((t) => t.includes('Nộp bài sớm'));
    await click((t) => t.startsWith('Nộp bài'), root.querySelector('.confirm'));
    await tick(200);
    expect(text()).toContain('điểm ước lượng / 990');
    expect(text()).toContain('Phần Nghe');
    expect(text()).toContain('Phần Đọc');
    expect(text()).toMatch(/còn \d+ điểm nữa tới mục tiêu 950/);
    // Không dùng .at(-1): test "hết giờ" ở trên chạy bằng đồng hồ GIẢ nên sự kiện của nó mang mốc thời gian
    // ở tương lai và luôn đứng cuối danh sách. Lấy đúng bài thi vừa nộp theo chế độ.
    const payload = eventsOf('exam.finished').find((e) => e.payload.mode === 'full').payload;
    expect(payload.estimate.complete).toBe(true);
    expect(payload.estimate.total.point).toBeGreaterThan(0);
    expect(payload.estimate.sections.map((x) => x.skill)).toEqual(['listening', 'reading']);
  });
});

describe('tự chuyển câu ở phần Nghe như băng đề thật (M21)', () => {
  it('nghe xong: đếm ngược khoảng lặng 5 giây, rồi tự sang câu sau và PHÁT LUÔN', async () => {
    await go('#/');                                         // bỏ màn kết quả của bài trước
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    try {
      await start('Riêng Part 2');
      await click((t) => t.includes('Nghe câu này'));
      expect(text()).toContain('Tự sang câu tiếp sau 5 giây');
      const played = fake.play.mock.calls.length;
      vi.advanceTimersByTime(3000);
      expect(root.querySelector('.advance-note').textContent).toBe('Tự sang câu tiếp sau 2 giây');   // chữ đổi tại chỗ
      vi.advanceTimersByTime(2000);
      await tick(30);
      expect(text()).toContain('câu 8');
      expect(fake.play.mock.calls).toHaveLength(played + 1);

      // Tự bấm chuyển câu thì huỷ đếm ngược đang chạy (câu 8 vừa phát xong cũng đang đếm).
      await key('ArrowLeft'); await tick(30);
      vi.advanceTimersByTime(6000);
      await tick(30);
      expect(text()).toContain('câu 7');
      expect(root.querySelector('.advance-note')).toBeNull();

      // Câu cuối của phần: không tự chuyển — sang phần sau/nộp bài phải tự bấm.
      await key('ArrowRight'); await key('ArrowRight'); await tick(30);
      await click((t) => t.includes('Nghe câu này'));
      expect(text()).toContain('câu 9');
      expect(root.querySelector('.advance-note')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
    await go('#/');
  });
});

describe('đánh dấu câu chưa chắc ở phần Đọc (M21)', () => {
  const flagButtons = () => [...root.querySelectorAll('.flag-btn')];

  it('phần Nghe không có nút đánh dấu', async () => {
    await start('Riêng Part 2');
    expect(flagButtons()).toHaveLength(0);
    await go('#/');
  });

  it('Part 6: mỗi câu một nút; bật thì ô trong danh sách câu có ⚑ và hộp nộp bài nhắc lại', async () => {
    await start('Riêng Part 6');
    expect(flagButtons()).toHaveLength(4);
    flagButtons()[1].click();
    await tick(30);
    expect(flagButtons()[1].getAttribute('aria-pressed')).toBe('true');
    expect(flagButtons()[1].textContent).toContain('Đã đánh dấu');
    await click((t) => t.startsWith('Danh sách câu'));
    expect(root.querySelector('.pal').classList.contains('flagged')).toBe(true);
    expect(root.querySelector('.pal').textContent).toMatch(/^⚑ /);
    await click((t) => t.startsWith('Ẩn danh sách'));
    await click((t) => t.includes('Nộp bài'));
    expect(text()).toContain('1 câu đang đánh dấu để xem lại');
    flagButtons()[1].click();                               // bỏ đánh dấu
    await tick(30);
    expect(flagButtons()[1].getAttribute('aria-pressed')).toBe('false');
    await go('#/');
  });

  it('nút Danh sách câu cho biết đã làm bao nhiêu câu của phần', async () => {
    await start('Riêng Part 6');
    await pick(0, 'B');
    expect(text()).toContain('Danh sách câu (1/4)');
    await go('#/');
  });
});

describe('rời màn', () => {
  it('rời màn giải phóng bộ phát; quay lại vẫn thấy màn chọn chế độ (không kẹt bài cũ)', async () => {
    await start('Riêng Part 2');                            // tự vào bài, không dựa vào test trước
    fake.dispose.mockClear();
    await go('#/');
    expect(fake.dispose).toHaveBeenCalled();
    await go('#/exam');
    expect(text()).toContain('Theo từng Part');
  });
});
