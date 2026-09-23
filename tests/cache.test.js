import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openCache, chunk, readCachedAi, openWorkCache, nextId } from '../pipeline/lib/cache.js';
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

describe('readCachedAi', () => {
  const fallback = { model: 'cũ', promptVersion: 'vocab-v1', date: '2026-09-19' };

  it('đọc mục cache mới có kèm thông tin model', () => {
    const value = { ai: { vi: 'khách hàng' }, model: 'gemini-3.5-flash', promptVersion: 'vocab-v2', date: '2026-09-20' };
    expect(readCachedAi(value, fallback)).toEqual({
      ai: { vi: 'khách hàng' }, model: 'gemini-3.5-flash', promptVersion: 'vocab-v2', date: '2026-09-20',
    });
  });

  it('mục cache đời đầu (chỉ có object AI) được gắn thông tin dự phòng', () => {
    expect(readCachedAi({ vi: 'khách hàng' }, fallback)).toEqual({
      ai: { vi: 'khách hàng' }, model: 'cũ', promptVersion: 'vocab-v1', date: '2026-09-19',
    });
  });

  it('không có gì trong cache thì trả null', () => {
    expect(readCachedAi(undefined, fallback)).toBeNull();
  });
});

describe('openWorkCache — nội dung đã phát hành là nguồn chuẩn (D62)', () => {
  let dir;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'toeic-work-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const publish = (entries) => writeFileSync(join(dir, 'out.json'), JSON.stringify({ version: 1, entries }));

  it('máy KHÔNG có cache: nạp đủ mục đã phát hành, để id mới đánh tiếp chứ không lại từ 1', () => {
    publish([{ id: 'p5-0001', stem: 'a' }, { id: 'p5-0002', stem: 'b', status: 'retired' }]);
    const { cache, published } = openWorkCache(join(dir, 'cache.json'), join(dir, 'out.json'));
    expect(cache.size()).toBe(2);
    expect(cache.get('p5-0002').status).toBe('retired');
    expect([...published]).toEqual(['p5-0001', 'p5-0002']);
    expect(nextId('p5-', Object.keys(cache.snapshot()))).toBe('p5-0003');
  });

  it('máy CÓ cache cũ: bản phát hành thắng (giữ chỗ sửa tay như lời giải đã dịch), nháp chưa phát hành vẫn còn', () => {
    const old = openCache(join(dir, 'cache.json'));
    old.set('p7-0001', { id: 'p7-0001', explanation: 'English text' });
    old.set('p7-0002', { id: 'p7-0002', explanation: 'nháp chưa phát hành' });
    old.save();
    publish([{ id: 'p7-0001', explanation: 'Lời giải tiếng Việt' }]);
    const { cache, published } = openWorkCache(join(dir, 'cache.json'), join(dir, 'out.json'));
    expect(cache.get('p7-0001').explanation).toBe('Lời giải tiếng Việt');
    expect(cache.has('p7-0002')).toBe(true);
    expect(published.has('p7-0002')).toBe(false);
  });

  it('chưa có file phát hành thì chạy như trước; file phát hành HỎNG thì dừng (không được coi như rỗng rồi ghi đè)', () => {
    expect(openWorkCache(join(dir, 'cache.json'), join(dir, 'none.json')).published.size).toBe(0);
    writeFileSync(join(dir, 'out.json'), '{"entries": [');
    expect(() => openWorkCache(join(dir, 'cache.json'), join(dir, 'out.json'))).toThrow();
  });
});

describe('nextId', () => {
  it('lấy số lớn nhất + 1, không dùng số lượng (có id bị bỏ vẫn không trùng)', () => {
    expect(nextId('l2-', ['l2-0001', 'l2-0003'])).toBe('l2-0004');
    expect(nextId('p3-', ['p3-0009', 'p4-0050', 'p3-0010'])).toBe('p3-0011');
    expect(nextId('p5-', [])).toBe('p5-0001');
  });
});
