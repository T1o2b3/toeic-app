import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { projectPath, today, flagValue, flagNumber, hasFlag } from '../pipeline/lib/cli.js';

describe('projectPath', () => {
  it('tính từ GỐC PROJECT, không phải thư mục của file gọi nó', () => {
    // Nếu gốc sai một bậc thì pipeline sẽ ghi nội dung ra ngoài repo mà vẫn chạy trót lọt.
    expect(existsSync(projectPath('package.json'))).toBe(true);
    expect(JSON.parse(readFileSync(projectPath('package.json'), 'utf8')).name).toBe('toeic-app');
    expect(existsSync(projectPath('public/content/'))).toBe(true);
    expect(existsSync(projectPath('schemas/vocab.schema.json'))).toBe(true);
  });

  it('trả về đường dẫn tuyệt đối để chạy từ thư mục nào cũng đúng', () => {
    expect(projectPath('public/content/x.json').startsWith('/')).toBe(true);
    expect(projectPath('public/content/x.json').endsWith('/public/content/x.json')).toBe(true);
  });
});

describe('today', () => {
  it('trả về YYYY-MM-DD và là HÀM (việc chạy nhiều giờ có thể vắt qua nửa đêm)', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(today()).toBe(new Date().toISOString().slice(0, 10));
    expect(typeof today).toBe('function');
  });
});

describe('đọc cờ dòng lệnh', () => {
  const argv = ['--part', '7', '--variant', 'double', '--target', '12', '--no-generate'];

  it('flagValue lấy chữ đứng sau cờ, không có cờ thì lấy mặc định', () => {
    expect(flagValue(argv, '--variant', 'single')).toBe('double');
    expect(flagValue(argv, '--list', 'tsl')).toBe('tsl');
    expect(flagValue([], '--deck', 'tsl')).toBe('tsl');
  });

  it('flagNumber đổi sang số', () => {
    expect(flagNumber(argv, '--target', 200)).toBe(12);
    expect(flagNumber(argv, '--part', NaN)).toBe(7);
  });

  it('KHÔNG có cờ thì trả mặc định NGUYÊN VẸN — Infinity và NaN phải giữ đúng ý nghĩa', () => {
    // build-vocab dùng Infinity nghĩa là "không giới hạn"; build-sets dùng NaN để phát hiện thiếu --part.
    expect(flagNumber([], '--limit', Infinity)).toBe(Infinity);
    expect(flagNumber([], '--part', NaN)).toBeNaN();
    expect(flagNumber([], '--batch-size', 50)).toBe(50);
  });

  it('hasFlag cho cờ bật/tắt không có giá trị đi kèm', () => {
    expect(hasFlag(argv, '--no-generate')).toBe(true);
    expect(hasFlag(argv, '--no-ipa')).toBe(false);
  });

  it('mỗi script tự ghép cờ của mình: đọc MỘT cờ là dùng chung được, đọc HẾT cờ thì không', () => {
    // Cùng một cờ --target nhưng mặc định khác nhau tuỳ script và tuỳ Part — nên mặc định phải do bên gọi đưa.
    expect(flagNumber([], '--target', 200)).toBe(200);   // build-questions
    expect(flagNumber([], '--target', 72)).toBe(72);     // build-listening
    expect(flagNumber([], '--target', 4)).toBe(4);       // build-sets --part 6
  });
});
