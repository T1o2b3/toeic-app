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

  it('phân loại mặc định TRỘN ĐỀU từ và cụm (D66): vài thẻ đầu đã có cả hai', async () => {
    await go('#/');
    await go('#/triage');
    const kinds = new Set();
    for (let i = 0; i < 6 && root.querySelector('.word'); i += 1) {
      kinds.add(text().includes('Bạn dùng được CỤM') ? 'cụm' : 'từ');
      await key('s');                                      // "để sau": chỉ lướt, không ghi gì
    }
    expect(kinds).toEqual(new Set(['từ', 'cụm']));
  });
});

describe('ôn lại — trộn chung một hàng đợi', () => {
  it('cụm đã chấm vào thẳng hàng đợi ôn cùng với từ vựng', async () => {
    await go('#/vocab');
    expect(text()).toContain('thẻ (từ + cụm)');
    await go('#/review');
    // Ôn tới khi gặp một thẻ cụm (hỏi "Cụm nào dùng ĐÚNG?") hoặc hết lượt. Thẻ từ: chọn 1 rồi Space sang thẻ kế.
    let sawCollocation = false;
    for (let i = 0; i < 12; i += 1) {
      if (!root.querySelector('.option')) break;
      if (text().includes('Cụm nào dùng ĐÚNG?')) { sawCollocation = true; break; }
      await key('1'); await tick(40); await key(' '); await tick(20);
    }
    expect(sawCollocation, 'phải gặp ít nhất một cụm từ trong lượt ôn').toBe(true);
  });

  it('thẻ cụm: hỏi bằng nghĩa tiếng Việt, DẠNG SAI hay mắc nằm trong lựa chọn; chọn xong mặt sau nhắc lại', async () => {
    const options = [...root.querySelectorAll('.option-text')].map((n) => n.textContent);
    expect(options.some((t) => ['give attention to', 'comply to'].includes(t))).toBe(true);
    expect(root.querySelector('.card.back')).toBeNull();
    await key('1');
    await tick(30);
    expect(text()).toMatch(/không dùng:/);
  });
});
