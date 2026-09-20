// @vitest-environment jsdom
/**
 * Gạt từ lạ lúc làm Part 5 (D34), chạy thật qua giao diện. Các `it` chạy nối tiếp, dùng chung một app
 * (xem tests/helpers/ui-app.js).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { bootApp } from './helpers/ui-app.js';

let store; let root; let tick; let go; let key; let text; let click;

beforeAll(async () => {
  ({ store, root, tick, go, key, text, click } = await bootApp());
});

describe('gạt từ lạ lúc làm Part 5 (D34)', () => {
  const token = (w) => [...root.querySelectorAll('.stem .tok')].find((t) => t.textContent === w);
  const drop = async (dropWord) => {
    const tray = root.querySelector('.tray');
    const event = new window.Event('drop', { bubbles: true, cancelable: true });
    event.dataTransfer = { getData: () => dropWord };
    tray.dispatchEvent(event);
    await tick(80);
  };

  it('câu hỏi có từng từ bấm được, khay hiện gợi ý, và KHÔNG lộ nghĩa lúc làm bài', async () => {
    await go('#/quiz');
    expect(root.querySelectorAll('.stem .tok').length).toBeGreaterThan(5);
    expect(root.querySelector('.tray').textContent).toContain('Gặp từ lạ?');
    expect(text()).not.toContain('nghĩa số');
    // Chỗ trống in dài như đề thật (D39), phần chữ còn lại giữ nguyên
    expect(root.querySelector('.stem').textContent).toBe('The council will ------- the ledger rules and zoning laws quickly.');
    expect(root.querySelector('.stem .blank')).not.toBe(null);
  });

  it('chạm vào một từ thì chọn nó; khay hiện nút "Cần học", vẫn không lộ nghĩa', async () => {
    token('zoning').click();
    await tick();
    expect(token('zoning').classList.contains('selected')).toBe(true);
    expect(root.querySelector('.tray').textContent).toContain('“zoning”');
    expect(root.querySelector('.tray-add')).not.toBeNull();
  });

  it('bấm "Cần học" với từ CHƯA có trong deck: chỉ ghi vocab.captured', async () => {
    const events = store.eventCount;
    root.querySelector('.tray-add').click();
    await tick(80);
    expect(store.eventCount).toBe(events + 1);
    expect(store.captured.get('zoning').count).toBe(1);
    expect(root.querySelector('.tray').textContent).toContain('chưa có trong deck');
    expect(token('zoning').classList.contains('captured')).toBe(true);
  });

  it('gạt từ CÓ trong deck: ghi thêm phân loại "không biết" để vào hàng đợi học', async () => {
    const events = store.eventCount;
    expect(store.states.get('tsl-0045')?.triaged ?? false).toBe(false);
    token('ledger').click();
    await tick();
    root.querySelector('.tray-add').click();
    await tick(80);
    expect(store.eventCount).toBe(events + 2);
    expect(store.states.get('tsl-0045').level).toBe('unknown');
    expect(store.states.get('tsl-0045').known).toBe(false);
    expect(root.querySelector('.tray').textContent).toContain('vào danh sách học');
  });

  it('kéo một từ thả vào khay cũng gạt được (đường dành cho Mac)', async () => {
    const events = store.eventCount;
    await drop('quickly');
    expect(store.eventCount).toBe(events + 1);
    expect(store.captured.has('quickly')).toBe(true);
  });

  it('gạt lại cùng từ ở cùng câu: không ghi trùng', async () => {
    const events = store.eventCount;
    await drop('quickly');
    expect(store.eventCount).toBe(events);
    expect(store.captured.get('quickly').count).toBe(1);
  });

  it('thả thứ không phải từ (rỗng, từ quá ngắn) thì bỏ qua', async () => {
    const events = store.eventCount;
    await drop('');
    await drop('to');
    expect(store.eventCount).toBe(events);
  });

  it('từ trong phương án CHỈ hiện sau khi đã trả lời', async () => {
    expect(root.querySelector('.option-capture')).toBeNull();
    await key('a');
    const chips = root.querySelector('.option-capture');
    expect(chips).not.toBeNull();
    expect(chips.textContent).toContain('amend');
    expect(chips.textContent).toContain('suspend');
  });

  it('bấm một từ ở phương án thì thêm vào danh sách và chip đổi thành ✓', async () => {
    const events = store.eventCount;
    await click((t) => t.includes('suspend'), root.querySelector('.option-capture'));
    await tick(50);
    expect(store.eventCount).toBe(events + 1);
    expect(store.captured.has('suspend')).toBe(true);
    expect(root.querySelector('.option-capture').textContent).toContain('✓ suspend');
  });

  it('Kho từ vựng › Đã gạt: hiện từ trong deck lẫn từ chưa có trong deck', async () => {
    await go('#/words?f=captured');
    expect(root.querySelector('.chip-btn.active').textContent).toMatch(/^Đã gạt 4/);
    expect(text()).toContain('ledger');
    const orphans = [...root.querySelectorAll('.word-row.orphan')].map((r) => r.querySelector('strong').textContent);
    expect(orphans.sort()).toEqual(['quickly', 'suspend', 'zoning']);
    expect(root.querySelector('.orphan a.ext-link').href).toContain('wiktionary.org');
  });

  it('rời màn rồi vào lại: khay quay về gợi ý, không còn từ đang chọn', async () => {
    await go('#/');
    await go('#/quiz');
    expect(root.querySelector('.tray-add')).toBeNull();
  });
});
