import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { filterCollocations, groupByTheme } from '../src/logic/collocations.js';

const BANK = JSON.parse(readFileSync('public/content/collocations.json', 'utf8')).entries;

describe('lọc collocation', () => {
  it('tìm theo cụm đúng', () => {
    expect(filterCollocations(BANK, 'pay attention').map((c) => c.chunk)).toEqual(['pay attention to']);
  });

  it('tìm theo nghĩa tiếng Việt KHÔNG dấu', () => {
    expect(filterCollocations(BANK, 'chu y den').map((c) => c.chunk)).toContain('pay attention to');
  });

  it('gõ dạng SAI vẫn ra cụm đúng — đó mới là lúc cần tra', () => {
    expect(filterCollocations(BANK, 'give attention').map((c) => c.chunk)).toEqual(['pay attention to']);
    expect(filterCollocations(BANK, 'comply to').map((c) => c.chunk)).toEqual(['comply with']);
  });

  it('từ khoá rỗng trả về nguyên danh sách', () => {
    expect(filterCollocations(BANK, '  ')).toHaveLength(BANK.length);
  });
});

describe('nhóm theo chủ đề', () => {
  it('giữ THỨ TỰ trong file, không sắp lại theo bảng chữ cái', () => {
    expect([...groupByTheme(BANK).keys()][0]).toBe('Động từ + danh từ');
  });

  it('tổng số cụm trong các nhóm bằng đúng số cụm đầu vào', () => {
    const total = [...groupByTheme(BANK).values()].reduce((n, xs) => n + xs.length, 0);
    expect(total).toBe(BANK.length);
  });
});

describe('chất lượng nội dung (D50b: tuyển chọn, không lấy số lượng)', () => {
  it('id duy nhất và cụm không trùng', () => {
    expect(new Set(BANK.map((c) => c.id)).size).toBe(BANK.length);
    expect(new Set(BANK.map((c) => c.chunk)).size).toBe(BANK.length);
  });

  it('mọi cụm đều có nghĩa tiếng Việt và chủ đề', () => {
    expect(BANK.filter((c) => !c.vi || !c.theme)).toEqual([]);
  });

  it('cụm phải từ 2 chữ trở lên — một chữ là từ vựng, không phải collocation', () => {
    expect(BANK.filter((c) => c.chunk.split(/\s+/).length < 2).map((c) => c.chunk)).toEqual([]);
  });

  it('phần lớn có kèm dạng sai hay mắc', () => {
    expect(BANK.filter((c) => c.wrong).length / BANK.length).toBeGreaterThan(0.8);
  });
});
