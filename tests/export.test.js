import { describe, it, expect } from 'vitest';
import { buildExport, exportFileName, readExport, EXPORT_FORMAT } from '../src/logic/export.js';

const events = [{ id: 'e1', ts: 1000, type: 'session.started', deviceId: 'mac', payload: {} }];
const NOW = new Date('2026-09-19T10:30:00.000Z');

describe('buildExport', () => {
  it('gói đủ sự kiện kèm thông tin nhận dạng', () => {
    const data = buildExport({ events, deviceId: 'mac-1', now: NOW });
    expect(data).toMatchObject({ app: 'toeic-app', format: EXPORT_FORMAT, eventCount: 1, deviceId: 'mac-1' });
    expect(data.events).toEqual(events);
  });

  it('xuất rồi đọc lại được nguyên vẹn', () => {
    const roundTrip = readExport(JSON.parse(JSON.stringify(buildExport({ events, deviceId: 'x', now: NOW }))));
    expect(roundTrip).toEqual(events);
  });
});

describe('exportFileName', () => {
  it('có ngày giờ để các bản sao lưu không đè nhau', () => {
    expect(exportFileName(NOW)).toBe('toeic-app-backup-2026-09-19-10-30.json');
    expect(exportFileName(new Date('2026-09-20T08:00:00Z'))).not.toBe(exportFileName(NOW));
  });
});

describe('readExport', () => {
  it('từ chối file của app khác, định dạng lạ, hoặc thiếu sự kiện', () => {
    expect(() => readExport({ app: 'khac', format: 1, events: [] })).toThrow(/không phải file sao lưu/i);
    expect(() => readExport({ app: 'toeic-app', format: 99, events: [] })).toThrow(/Định dạng lạ/);
    expect(() => readExport({ app: 'toeic-app', format: EXPORT_FORMAT })).toThrow(/thiếu danh sách/);
  });
});
