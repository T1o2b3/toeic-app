import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openCache, chunk } from '../pipeline/lib/cache.js';
import { createDeckValidator, findDuplicateIds } from '../pipeline/lib/validate-deck.js';

describe('chunk', () => {
  it('chia đều và giữ phần dư ở lô cuối', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('mảng rỗng trả về mảng rỗng', () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it('từ chối kích thước lô vô lý', () => {
    expect(() => chunk([1], 0)).toThrow();
  });
});

describe('openCache', () => {
  let dir;
  let file;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'toeic-cache-'));
    file = join(dir, 'sub', 'cache.json');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('ghi rồi đọc lại được ở lần mở sau (pipeline chạy nhiều đợt)', () => {
    const cache = openCache(file);
    expect(cache.has('client')).toBe(false);
    cache.set('client', { vi: 'khách hàng' });
    cache.save();

    const reopened = openCache(file);
    expect(reopened.has('client')).toBe(true);
    expect(reopened.get('client')).toEqual({ vi: 'khách hàng' });
    expect(reopened.size()).toBe(1);
  });

  it('không ghi file khi chưa có gì thay đổi', () => {
    openCache(file).save();
    expect(existsSync(file)).toBe(false);
  });

  it('cache hỏng thì bắt đầu lại từ rỗng, không ném lỗi', () => {
    const broken = join(dir, 'broken.json');
    writeFileSync(broken, '{ đây không phải JSON');
    const cache = openCache(broken);
    expect(cache.size()).toBe(0);
  });
});

describe('createDeckValidator', () => {
  const validate = createDeckValidator();
  const deck = {
    deck: 'toeic-tsl',
    version: 1,
    attribution: {
      source: 'TSL 1.2',
      authors: 'Browne & Culligan',
      license: 'CC BY-SA 4.0',
      url: 'https://www.newgeneralservicelist.com/toeic-service-list',
    },
    entries: [{
      id: 'tsl-0001', deck: 'toeic-tsl', status: 'active', word: 'mister', rank: 1,
      pos: ['noun'], vi: 'ông',
      examples: [{ en: 'Good morning, mister Tan.', vi: 'Chào buổi sáng, ông Tấn.' }],
      gen: { model: 'm', promptVersion: 'vocab-v1', batch: 'b', date: '2026-09-19' },
    }],
  };

  it('chấp nhận deck đúng chuẩn', () => {
    expect(validate(deck).valid).toBe(true);
  });

  it('từ chối deck thiếu ghi công (bắt buộc theo CC BY-SA, D18)', () => {
    const { attribution, ...withoutAttribution } = deck;
    const result = validate(withoutAttribution);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/attribution/);
  });

  it('từ chối id sai định dạng và status lạ', () => {
    expect(validate({ ...deck, entries: [{ ...deck.entries[0], id: 'client-1' }] }).valid).toBe(false);
    expect(validate({ ...deck, entries: [{ ...deck.entries[0], status: 'draft' }] }).valid).toBe(false);
  });

  it('phát hiện id trùng (schema không bắt được)', () => {
    const duplicated = { ...deck, entries: [deck.entries[0], { ...deck.entries[0] }] };
    expect(findDuplicateIds(duplicated)).toEqual(['tsl-0001']);
    expect(findDuplicateIds(deck)).toEqual([]);
  });
});
