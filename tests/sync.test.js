import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { diffEvents, toRows, fromRows, describeSync } from '../src/logic/sync.js';
import { syncEvents, startAutoSync, AUTO_SYNC_DELAY_MS } from '../src/data/sync.js';

// Máy chủ giả: cắt mỗi request ở `cap` dòng, im lặng như Supabase thật (Max rows).
const server = { rows: [], cap: 1000, pushed: [], reads: 0, session: true };
vi.mock('../src/data/supabase.js', () => ({
  isSupabaseConfigured: () => true,
  getConfigError: () => null,
  getSupabase: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'u1' } } }),
      getSession: async () => ({ data: { session: server.session ? {} : null } }),
    },
    from: () => {
      const query = {
        select: () => query,
        order: () => query,
        range: async (from, to) => {
          if (from === 0) server.reads += 1;
          return { data: server.rows.slice(from, Math.min(to + 1, from + server.cap)), error: null };
        },
        upsert: async (rows) => { server.pushed.push(...rows); server.rows.push(...rows); return { error: null }; },
      };
      return query;
    },
  }),
}));

const event = (id, ts = 1000) => ({ id, deviceId: 'mac-1', ts, type: 'vocab.reviewed', payload: { wordId: 'w' } });

describe('diffEvents', () => {
  it('tìm đúng phần mỗi bên còn thiếu', () => {
    const local = [event('a'), event('b')];
    const remote = [event('b'), event('c')];
    const { toPush, toPull } = diffEvents(local, remote);
    expect(toPush.map((e) => e.id)).toEqual(['a']);
    expect(toPull.map((e) => e.id)).toEqual(['c']);
  });

  it('hai bên giống nhau thì không phải làm gì', () => {
    const events = [event('a')];
    expect(diffEvents(events, events)).toEqual({ toPush: [], toPull: [] });
  });

  it('máy mới tinh thì kéo hết về', () => {
    expect(diffEvents([], [event('a'), event('b')]).toPull).toHaveLength(2);
  });

  it('máy chủ trống thì đẩy hết lên', () => {
    expect(diffEvents([event('a')], []).toPush).toHaveLength(1);
  });

  it('chịu được đầu vào rỗng/undefined', () => {
    expect(diffEvents(undefined, undefined)).toEqual({ toPush: [], toPull: [] });
  });
});

describe('toRows / fromRows', () => {
  it('đi và về giữ nguyên nội dung sự kiện', () => {
    const rows = toRows([event('a')], 'user-1');
    expect(rows[0]).toMatchObject({ id: 'a', user_id: 'user-1', device_id: 'mac-1', type: 'vocab.reviewed' });
    expect(fromRows(rows.map((r) => ({ ...r })))[0]).toEqual(event('a'));
  });

  it('chưa đăng nhập thì không cho đẩy lên', () => {
    expect(() => toRows([event('a')], null)).toThrow(/userId/);
  });

  it('bỏ qua dòng hỏng thay vì làm hỏng cả lần đồng bộ', () => {
    const rows = [{ id: 'a', ts: 1, type: 'x' }, { id: 'b' }, null, { ts: 2, type: 'y' }];
    expect(fromRows(rows).map((e) => e.id)).toEqual(['a']);
  });

  it('dòng thiếu device_id vẫn dùng được', () => {
    expect(fromRows([{ id: 'a', ts: 1, type: 'x' }])[0].deviceId).toBe('khong-ro');
  });
});

describe('describeSync', () => {
  it('nói rõ đã gửi lên và nhận về bao nhiêu', () => {
    expect(describeSync({ pushed: 3, pulled: 0 })).toMatch(/gửi lên 3/);
    expect(describeSync({ pushed: 0, pulled: 2 })).toMatch(/nhận về 2/);
    expect(describeSync({ pushed: 0, pulled: 0 })).toMatch(/không có gì mới/);
  });
});

describe('syncEvents — máy chủ cắt ở giới hạn dòng mỗi request', () => {
  const remoteRows = (n) => Array.from({ length: n }, (_, i) => ({ id: `r${i}`, device_id: 'iphone', ts: i, type: 'x', payload: {} }));

  it.each([1000, 300])('kéo về đủ 2500 sự kiện khi máy chủ trả tối đa %i dòng/lần', async (cap) => {
    Object.assign(server, { rows: remoteRows(2500), cap, pushed: [] });
    let saved = [];
    const result = await syncEvents({ localEvents: [event('a')], saveLocal: async (e) => { saved = e; } });
    expect(result).toEqual({ pushed: 1, pulled: 2500 });
    expect(new Set(saved.map((e) => e.id)).size).toBe(2500);
  });
});

describe('startAutoSync', () => {
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  const fakeStore = (events) => {
    const listeners = new Set();
    const store = {
      events: [...events],
      get eventCount() { return store.events.length; },
      exportEvents: () => store.events.map((e) => ({ ...e })),
      subscribe: (listener) => listeners.add(listener),
      add(list) { store.events.push(...list); listeners.forEach((listener) => listener()); },
      async importEvents(list) { store.add(list); },
      refresh() { listeners.forEach((listener) => listener()); },
    };
    return store;
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    Object.assign(server, { rows: [{ id: 'r1', device_id: 'iphone', ts: 1, type: 'x', payload: {} }], cap: 1000, pushed: [], reads: 0, session: true });
  });
  afterEach(() => vi.useRealTimers());

  it('mở app là đồng bộ ngay; sự kiện vừa kéo về KHÔNG kéo theo lần đồng bộ thừa', async () => {
    const store = fakeStore([event('a')]);
    startAutoSync(store);
    await flush();
    expect(server.pushed.map((r) => r.id)).toEqual(['a']);
    expect(store.events.map((e) => e.id)).toContain('r1');
    await vi.advanceTimersByTimeAsync(AUTO_SYNC_DELAY_MS * 2);
    expect(server.reads).toBe(1);
  });

  it('học xong thì chờ yên 15 giây rồi mới đẩy; vẽ lại màn hình không tính là học', async () => {
    const store = fakeStore([]);
    startAutoSync(store);
    await flush();
    store.refresh();
    store.add([event('b')]);
    await vi.advanceTimersByTimeAsync(AUTO_SYNC_DELAY_MS - 1000);
    store.add([event('c')]); // học tiếp → dời hẹn giờ
    await vi.advanceTimersByTimeAsync(AUTO_SYNC_DELAY_MS - 1000);
    expect(server.pushed).toEqual([]);
    await vi.advanceTimersByTimeAsync(1000);
    await flush();
    expect(server.pushed.map((r) => r.id)).toEqual(['b', 'c']);
    expect(server.reads).toBe(2);
  });

  it('chưa đăng nhập thì không gọi máy chủ lần nào', async () => {
    server.session = false;
    const syncNow = startAutoSync(fakeStore([event('a')]));
    await flush();
    await syncNow();
    expect(server.reads).toBe(0);
  });
});
