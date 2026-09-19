import { describe, it, expect } from 'vitest';
import { diffEvents, toRows, fromRows, describeSync } from '../src/logic/sync.js';

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
