import { describe, it, expect } from 'vitest';
import { cleanEnv, checkSupabaseConfig } from '../src/logic/config-check.js';

const URL = 'https://oiqgcjcktjjgamzkjfzm.supabase.co';
const KEY = 'sb_publishable_eLLt6AgWAEE-aHEen3IFSw_7v2EfMSp';

describe('cleanEnv', () => {
  it('cắt khoảng trắng và ký tự xuống dòng khi dán', () => {
    expect(cleanEnv(`${URL}\n`)).toBe(URL);
    expect(cleanEnv(`  ${KEY}  `)).toBe(KEY);
  });

  it('giá trị không phải chuỗi thì coi như rỗng', () => {
    expect(cleanEnv(undefined)).toBe('');
    expect(cleanEnv(22)).toBe('');
  });
});

describe('checkSupabaseConfig', () => {
  it('cấu hình đúng thì qua', () => {
    expect(checkSupabaseConfig(URL, KEY)).toEqual({ ok: true, error: null });
  });

  it('chưa cấu hình gì thì không coi là lỗi', () => {
    expect(checkSupabaseConfig('', '')).toEqual({ ok: false, error: null });
  });

  it('phát hiện dán nhầm URL vào ô key (lỗi đã gặp thật)', () => {
    const result = checkSupabaseConfig(URL, URL);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/dán nhầm Project URL/);
  });

  it('phát hiện URL sai dạng, kể cả khi điền bừa', () => {
    expect(checkSupabaseConfig('22', KEY).error).toMatch(/sai dạng/);
    expect(checkSupabaseConfig('http://abc.supabase.co', KEY).error).toMatch(/sai dạng/);
  });

  it('phát hiện key bị cắt cụt', () => {
    expect(checkSupabaseConfig(URL, 'sb_pub').error).toMatch(/quá ngắn/);
  });

  it('báo rõ thiếu biến nào', () => {
    expect(checkSupabaseConfig('', KEY).error).toMatch(/Thiếu VITE_SUPABASE_URL/);
    expect(checkSupabaseConfig(URL, '').error).toMatch(/Thiếu VITE_SUPABASE_ANON_KEY/);
  });
});
