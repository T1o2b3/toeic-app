import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { openDb, appendEvents, readAllEvents, countEvents, clearAllEvents } from '../src/data/db.js';
import { createEvent } from '../src/logic/events.js';

const T0 = Date.UTC(2026, 8, 19, 10, 0, 0);
const makeEvent = (id, ts, payload = {}) =>
  createEvent({ id, ts, type: 'vocab.reviewed', deviceId: 'mac-1', payload });

describe('nhật ký sự kiện trong IndexedDB', () => {
  let db;

  beforeEach(async () => {
    // IndexedDB giả, mỗi test một bản sạch — không cần trình duyệt thật.
    db = await openDb(new IDBFactory());
  });

  it('ghi rồi đọc lại được', async () => {
    const added = await appendEvents(db, [makeEvent('e1', T0), makeEvent('e2', T0 + 1)]);
    expect(added).toBe(2);
    expect(await countEvents(db)).toBe(2);
    expect((await readAllEvents(db)).map((e) => e.id)).toEqual(['e1', 'e2']);
  });

  it('đọc ra luôn theo thứ tự thời gian, bất kể thứ tự ghi', async () => {
    await appendEvents(db, [makeEvent('muon', T0 + 5000), makeEvent('som', T0)]);
    expect((await readAllEvents(db)).map((e) => e.id)).toEqual(['som', 'muon']);
  });

  it('ghi lại sự kiện đã có thì bỏ qua, không nhân đôi (đồng bộ gửi trùng là chuyện thường)', async () => {
    await appendEvents(db, [makeEvent('e1', T0)]);
    const added = await appendEvents(db, [makeEvent('e1', T0), makeEvent('e2', T0 + 1)]);
    expect(added).toBe(1);
    expect(await countEvents(db)).toBe(2);
  });

  it('không ghi đè sự kiện cũ khi trùng id (append-only, D23)', async () => {
    await appendEvents(db, [makeEvent('e1', T0, { wordId: 'goc' })]);
    await appendEvents(db, [makeEvent('e1', T0, { wordId: 'de-len' })]);
    expect((await readAllEvents(db))[0].payload.wordId).toBe('goc');
  });

  it('nhật ký rỗng đọc ra mảng rỗng', async () => {
    expect(await readAllEvents(db)).toEqual([]);
    expect(await appendEvents(db, [])).toBe(0);
  });

  it('dữ liệu còn nguyên sau khi đóng và mở lại (tải lại trang không mất tiến độ)', async () => {
    const factory = new IDBFactory();
    const first = await openDb(factory);
    await appendEvents(first, [makeEvent('e1', T0)]);
    first.close();

    const second = await openDb(factory);
    expect((await readAllEvents(second)).map((e) => e.id)).toEqual(['e1']);
  });

  it('xoá sạch được khi Huy chủ động yêu cầu', async () => {
    await appendEvents(db, [makeEvent('e1', T0)]);
    await clearAllEvents(db);
    expect(await countEvents(db)).toBe(0);
  });

  it('báo lỗi rõ ràng khi trình duyệt không có IndexedDB', () => {
    expect(() => openDb(null)).toThrow(/không hỗ trợ IndexedDB/);
  });
});
