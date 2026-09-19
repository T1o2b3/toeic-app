import { describe, it, expect } from 'vitest';
import { createEvent, mergeEventLogs } from '../src/logic/events.js';

describe('createEvent', () => {
  it('tạo sự kiện với đủ trường và giữ nguyên id/ts được truyền vào', () => {
    const event = createEvent({
      type: 'vocab.reviewed',
      deviceId: 'mac-1',
      payload: { wordId: 'w-001', grade: 3 },
      id: 'e-1',
      ts: 1000,
    });
    expect(event).toEqual({
      id: 'e-1',
      deviceId: 'mac-1',
      ts: 1000,
      type: 'vocab.reviewed',
      payload: { wordId: 'w-001', grade: 3 },
    });
  });

  it('sự kiện là bất biến (append-only, D23)', () => {
    const event = createEvent({ type: 'session.started', deviceId: 'mac-1' });
    expect(() => {
      'use strict';
      event.ts = 0;
    }).toThrow();
  });

  it('từ chối loại sự kiện lạ và deviceId rỗng', () => {
    expect(() => createEvent({ type: 'khong.ton.tai', deviceId: 'mac-1' })).toThrow();
    expect(() => createEvent({ type: 'session.started', deviceId: '' })).toThrow();
  });

  it('tự sinh id và ts khi không truyền', () => {
    const event = createEvent({ type: 'session.started', deviceId: 'iphone' });
    expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.ts).toBeGreaterThan(0);
  });
});

describe('mergeEventLogs', () => {
  const a = { id: 'e-2', deviceId: 'mac', ts: 200, type: 'session.started', payload: {} };
  const b = { id: 'e-1', deviceId: 'iphone', ts: 100, type: 'session.started', payload: {} };

  it('gộp, bỏ trùng theo id và sắp xếp theo thời gian', () => {
    expect(mergeEventLogs([a], [b, a]).map((e) => e.id)).toEqual(['e-1', 'e-2']);
  });

  it('trùng ts thì thứ tự vẫn ổn định theo id', () => {
    const c = { ...b, id: 'e-3', ts: 200 };
    expect(mergeEventLogs([c], [a]).map((e) => e.id)).toEqual(['e-2', 'e-3']);
  });

  it('nhật ký rỗng trả về mảng rỗng', () => {
    expect(mergeEventLogs([], [])).toEqual([]);
  });
});
