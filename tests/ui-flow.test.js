// @vitest-environment jsdom
/**
 * Chạy thật các màn hình (jsdom + IndexedDB giả) theo đúng thứ tự Huy dùng app.
 *
 * Vì sao có file này: các lỗi đã xảy ra ở project này (bộ đếm đứng yên, bấm phím hai lần chấm
 * nhầm từ, mất ô nhập khi vẽ lại) đều là lỗi GIỮA logic và màn hình — test logic thuần không bắt được.
 *
 * Các `it` chạy NỐI TIẾP và dùng chung một app (mountApp gắn listener lên window, gắn hai lần thì
 * mỗi phím bị xử lý hai lần). Trạng thái của `it` trước là đầu vào của `it` sau, có chủ ý.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { bootApp } from './helpers/ui-app.js';

let store; let root; let tick; let go; let key; let text; let word; let click; let levelOf;

beforeAll(async () => {
  ({ store, root, tick, go, key, text, word, click, levelOf } = await bootApp());
});

describe('mục Từ vựng khi chưa học gì', () => {
  it('có Kho từ vựng nhưng chưa hiện Ôn chủ động (chưa có gì để ôn)', async () => {
    await go('#/vocab');
    expect(text()).toContain('Kho từ vựng');
    expect(text()).not.toContain('Ôn chủ động');
  });
});

describe('màn phân loại', () => {
  let first; let second; let third;

  it('bộ đếm đi 20 → 18 sau hai từ (quy tắc số 7)', async () => {
    await go('#/triage');
    // Thẻ đầu phải là TỪ (chấm "thành thạo"): kho từ và ôn chủ động ở dưới chỉ liệt kê từ, không liệt kê cụm.
    for (let i = 0; i < 20 && text().includes('Bạn dùng được CỤM'); i += 1) await key('s');
    first = word();
    expect(text()).toContain('còn 20 từ/cụm trong lượt');
    await key('4');
    second = word();
    await key('1');
    third = word();
    expect(text()).toContain('còn 18 từ/cụm trong lượt');
    expect(new Set([first, second, third]).size).toBe(3);
  });

  it('"Để sau" đổi sang từ khác mà KHÔNG làm giảm bộ đếm và không ghi nhật ký', async () => {
    const events = store.eventCount;
    await key('s');
    expect(word()).not.toBe(third);
    expect(text()).toContain('còn 18 từ/cụm trong lượt');
    expect(store.eventCount).toBe(events);
  });

  it('"Từ trước" quay lại từ vừa chấm, hiện mức đã chấm, và ẩn "Để sau"', async () => {
    await key('Backspace');
    expect(word()).toBe(second);
    expect(text()).toContain('Trước đó bạn chấm: Không biết');
    expect(text()).not.toContain('Để sau');
  });

  it('chấm lại ghi THÊM một sự kiện, mức mới thắng, sự kiện cũ còn nguyên (append-only)', async () => {
    const events = store.eventCount;
    await key('3');
    expect(store.eventCount).toBe(events + 1);
    expect(levelOf(second)).toBe('spelling');
    expect(word()).not.toBe(second);
  });

  it('bấm phím hai lần thật nhanh chỉ ghi một sự kiện', async () => {
    const events = store.eventCount;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    await tick(80);
    expect(store.eventCount).toBe(events + 1);
  });

  it('hết lượt: có màn kết thúc, dẫn tới Kho từ vựng và cho sửa từ vừa chấm', async () => {
    for (let i = 0; i < 40 && root.querySelector('.actions.four'); i += 1) await key('1');
    expect(text()).toContain('Xong lượt này');
    expect(text()).toContain('Kho từ vựng');
    await click((t) => t.includes('Sửa lại từ vừa chấm'));
    expect(text()).toContain('xem lại từ đã chấm');
  });
});

describe('kho từ vựng', () => {
  it('mở đúng bộ lọc theo địa chỉ và liệt kê đúng từ', async () => {
    await go('#/words?f=fluent');
    expect(root.querySelector('.chip-btn.active').textContent).toMatch(/^Thành thạo/);
    expect(root.querySelectorAll('.word-row')).toHaveLength(1);
  });

  it('phân trang 40 dòng và có nút "Hiện thêm"', async () => {
    await click((t) => t.startsWith('Tất cả'));
    expect(root.querySelectorAll('.word-row')).toHaveLength(40);
    expect(text()).toContain('Hiện thêm');
  });

  it('gõ tìm kiếm chỉ vẽ lại danh sách — ô nhập không bị thay mất', async () => {
    const input = root.querySelector('input');
    input.value = 'w07x';
    input.dispatchEvent(new window.Event('input'));
    await tick();
    expect(root.querySelector('input')).toBe(input);
    expect(input.value).toBe('w07x');
    expect(root.querySelectorAll('.word-row')).toHaveLength(1);
  });

  it('đổi mức một từ: ghi một sự kiện, từ khoá tìm kiếm vẫn giữ', async () => {
    await click((t) => t.includes('w07x'));
    const picker = root.querySelector('.level-grid');
    expect(picker.querySelectorAll('button')).toHaveLength(4);
    const events = store.eventCount;
    await click((t) => t.startsWith('Quên chính tả'), picker);
    expect(store.eventCount).toBe(events + 1);
    expect(levelOf('w07x')).toBe('spelling');
    expect(root.querySelector('input').value).toBe('w07x');
  });
});

describe('ôn chủ động', () => {
  let fluentWord;

  it('hiện ở mục Từ vựng sau khi đã phân loại; nhóm rỗng bị vô hiệu', async () => {
    await go('#/vocab');
    expect(text()).toContain('Ôn chủ động');
    await go('#/practice');
    expect(text()).toContain('Kiểm tra từ đã thành thạo');
    expect([...root.querySelectorAll('button.secondary')].some((b) => b.disabled)).toBe(true);
  });

  // Trắc nghiệm (D66): phương án của từ "wNNx" là "nghĩa số NN".
  const optionFor = (right) => [...root.querySelectorAll('.option')]
    .find((b) => (b.querySelector('.option-text').textContent === `nghĩa số ${fluentWord.slice(1, 3)}`) === right);

  it('4 lựa chọn nghĩa; chưa chọn thì CHƯA lộ giải thích; Space không tự chấm', async () => {
    await click((t) => t.includes('Kiểm tra từ đã thành thạo'));
    fluentWord = word();
    expect(root.querySelectorAll('.option')).toHaveLength(4);
    expect(root.querySelector('.card.back')).toBeNull();
    const events = store.eventCount;
    await key(' ');
    expect(root.querySelector('.card.back')).toBeNull();
    expect(store.eventCount).toBe(events);
  });

  it('chọn sai một từ "thành thạo": lộ đáp án + giải thích, hạ xuống "đoán được" (ghi đúng một sự kiện)', async () => {
    const events = store.eventCount;
    optionFor(false).click();
    await tick(40);
    expect(text()).toContain('Sai — đáp án: nghĩa số');
    expect(root.querySelector('.card.back')).not.toBeNull();
    expect(levelOf(fluentWord)).toBe('context');
    expect(store.eventCount).toBe(events + 1);
    await key(' ');
    expect(text()).toContain('Nhớ 0 / 1 từ');
    expect(text()).toContain('đã chuyển');
  });

  it('vẫn nhớ thì không ghi gì vào nhật ký', async () => {
    const id = store.entries.find((e) => e.word === fluentWord).id;
    await store.record('vocab.triaged', { wordId: id, level: 'fluent', known: true });
    await go('#/');
    await go('#/practice');
    await click((t) => t.includes('Kiểm tra từ đã thành thạo'));
    const events = store.eventCount;
    optionFor(true).click();
    await tick(40);
    expect(text()).toContain('Đúng — vẫn nhớ');
    expect(store.eventCount).toBe(events);
    await key(' ');
    expect(text()).toContain('Nhớ 1 / 1 từ');
  });

  it('rời màn rồi vào lại thì trở về màn chọn nhóm (không kẹt giữa lượt cũ)', async () => {
    await go('#/');
    await go('#/practice');
    expect(text()).toContain('Ôn chủ động');
    expect(text()).toContain('Kiểm tra từ đã thành thạo');
  });
});

describe('ôn tập: trắc nghiệm, lịch tính bằng ngày (D66)', () => {
  const reviewed = () => store.exportEvents().filter((e) => e.type === 'vocab.reviewed');
  /** Chữ của lựa chọn đúng cho thẻ đang hiện: từ "wNNx" → "nghĩa số NN"; cụm (hỏi bằng nghĩa) → chính cụm đó. */
  const rightText = () => {
    const shown = root.querySelector('.card.big .word').textContent;
    const colloc = store.collocationCards.find((c) => c.vi === shown);
    return colloc ? colloc.word : `nghĩa số ${shown.slice(1, 3)}`;
  };
  const pickOption = async (right) => {
    const target = rightText();
    [...root.querySelectorAll('.option')].find((b) => (b.querySelector('.option-text').textContent === target) === right).click();
    await tick(40);
  };

  it('4 lựa chọn, chưa chọn thì chưa lộ giải thích', async () => {
    await go('#/review');
    expect(root.querySelectorAll('.option')).toHaveLength(4);
    expect(root.querySelector('.card.back')).toBeNull();
    expect(text()).not.toMatch(/\d+ phút/);                  // không còn nút chấm "1 phút / 10 phút"
  });

  it('chọn ĐÚNG → ghi "good", báo ôn lại sau vài NGÀY, hiện giải thích; Space sang thẻ kế', async () => {
    const before = reviewed().length;
    await pickOption(true);
    expect(reviewed()).toHaveLength(before + 1);
    expect(reviewed().at(-1).payload.grade).toBe('good');
    expect(text()).toMatch(/Đúng — ôn lại sau \d+ ngày/);
    expect(root.querySelector('.card.back')).not.toBeNull();
    await key(' ');
    expect(root.querySelector('.card.back')).toBeNull();
  });

  it('chọn SAI → ghi "again", lộ đáp án đúng, ôn lại sau 1 ngày (không phải vài phút)', async () => {
    const before = reviewed().length;
    const right = rightText();
    await pickOption(false);
    expect(reviewed()).toHaveLength(before + 1);
    expect(reviewed().at(-1).payload.grade).toBe('again');
    expect(text()).toContain(`Sai — đáp án: ${right} · ôn lại sau 1 ngày`);
  });
});
