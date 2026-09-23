// @vitest-environment jsdom
/**
 * Học cụm từ như học từ vựng (D52): học MỚI thì tách riêng, ÔN LẠI thì chung một hàng đợi.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { bootApp } from './helpers/ui-app.js';

let store; let root; let tick; let go; let key; let text; let click;

beforeAll(async () => {
  ({ store, root, tick, go, key, text, click } = await bootApp());
});

describe('học cụm từ mới — tách riêng khỏi từ vựng', () => {
  it('mục Từ vựng có lối vào riêng cho cụm từ, khác với phân loại từ vựng', async () => {
    await go('#/vocab');
    expect(text()).toContain('Học cụm từ mới');
    expect(text()).toContain('Phân loại từ vựng');
  });

  it('màn học cụm từ hiện CỤM, không hiện từ đơn của deck', async () => {
    await go('#/triage?kind=colloc');
    expect(root.querySelector('.word').textContent).toMatch(/pay attention to|comply with/);
  });

  it('chấm một cụm ghi đúng MỘT sự kiện, mang id col-…', async () => {
    const before = store.eventCount;
    await key('1');
    await tick(50);
    const events = store.exportEvents().filter((e) => e.type === 'vocab.triaged');
    const last = events.at(-1);
    expect(store.eventCount).toBe(before + 1);
    expect(last.payload.wordId).toMatch(/^col-/);
  });

  it('quay lại phân loại TỪ VỰNG thì hiện từ đơn, không lẫn cụm', async () => {
    await go('#/triage');
    expect(root.querySelector('.word').textContent).not.toContain(' ');   // từ đơn không có khoảng trắng
  });
});

describe('ôn lại — trộn chung một hàng đợi', () => {
  it('cụm đã chấm vào thẳng hàng đợi ôn cùng với từ vựng', async () => {
    await go('#/vocab');
    expect(text()).toContain('thẻ (từ + cụm)');
    await go('#/review');
    // Ôn tới khi gặp một thẻ là cụm từ (có khoảng trắng trong từ) hoặc hết lượt.
    let sawCollocation = false;
    for (let i = 0; i < 12; i += 1) {
      const word = root.querySelector('.word')?.textContent;
      if (!word) break;
      if (word.includes(' ')) { sawCollocation = true; break; }
      await key(' '); await key('3'); await tick(40);
    }
    expect(sawCollocation, 'phải gặp ít nhất một cụm từ trong lượt ôn').toBe(true);
  });

  it('mặt sau của thẻ cụm nhắc luôn DẠNG SAI hay mắc', async () => {
    await key(' ');
    await tick(30);
    expect(text()).toMatch(/không dùng:/);
  });
});
