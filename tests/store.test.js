import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { createStore } from '../src/data/store.js';
import { loadVocabDeck } from '../src/data/content.js';

const DECK = {
  deck: 'toeic-tsl',
  version: 1,
  attribution: { source: 'TSL 1.2', authors: 'B&C', license: 'CC BY-SA 4.0', url: 'https://x.test' },
  entries: [
    { id: 'tsl-0001', word: 'mister', rank: 1 },
    { id: 'tsl-0002', word: 'vacation', rank: 2 },
  ],
};

const okFetch = () => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => DECK });

beforeEach(() => {
  // getDeviceId dùng localStorage; jsdom không bật mặc định nên tự giả lập.
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
  };
  globalThis.crypto ??= { randomUUID: () => Math.random().toString(36).slice(2) };
});

describe('loadVocabDeck', () => {
  it('tải được deck hợp lệ', async () => {
    expect((await loadVocabDeck('toeic-tsl', okFetch())).entries).toHaveLength(2);
  });

  it('báo lỗi rõ khi không tải được file', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(loadVocabDeck('toeic-tsl', fetchImpl)).rejects.toThrow(/HTTP 404/);
  });

  it('báo lỗi khi deck rỗng hoặc sai định dạng', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ entries: [] }) });
    await expect(loadVocabDeck('toeic-tsl', fetchImpl)).rejects.toThrow(/rỗng hoặc sai định dạng/);
  });
});

describe('store', () => {
  const makeStore = () => createStore({ factory: new IDBFactory(), fetchImpl: okFetch() });

  it('khởi tạo với deck đã tải và nhật ký rỗng', async () => {
    const store = await makeStore();
    expect(store.entries).toHaveLength(2);
    expect(store.eventCount).toBe(0);
    expect(store.states.size).toBe(0);
  });

  it('ghi sự kiện thì trạng thái được tính lại ngay', async () => {
    const store = await makeStore();
    await store.record('vocab.triaged', { wordId: 'tsl-0001', known: true });
    expect(store.eventCount).toBe(1);
    expect(store.states.get('tsl-0001').known).toBe(true);
  });

  it('báo cho màn hình biết mỗi khi có thay đổi', async () => {
    const store = await makeStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    await store.record('vocab.bookmarked', { wordId: 'tsl-0001', bookmarked: true });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await store.record('vocab.bookmarked', { wordId: 'tsl-0002', bookmarked: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('mở lại app thì đọc được nhật ký cũ (tải lại trang không mất tiến độ)', async () => {
    const factory = new IDBFactory();
    const first = await createStore({ factory, fetchImpl: okFetch() });
    await first.record('vocab.triaged', { wordId: 'tsl-0002', known: false });

    const second = await createStore({ factory, fetchImpl: okFetch() });
    expect(second.eventCount).toBe(1);
    expect(second.states.get('tsl-0002').triaged).toBe(true);
  });

  it('xuất được toàn bộ nhật ký và bản xuất không dính tới dữ liệu gốc', async () => {
    const store = await makeStore();
    await store.record('vocab.triaged', { wordId: 'tsl-0001', known: true });
    const exported = store.exportEvents();
    exported[0].type = 'bi-sua';
    expect(store.exportEvents()[0].type).toBe('vocab.triaged');
  });
});
