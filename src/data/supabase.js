/**
 * Kết nối Supabase. App vẫn chạy bình thường khi CHƯA cấu hình —
 * lúc đó dữ liệu chỉ nằm ở máy này, không đồng bộ.
 *
 * Chỉ dùng anon key ở frontend. Key này công khai được vì RLS mới là thứ bảo vệ dữ liệu
 * (xem supabase/schema.sql). TUYỆT ĐỐI không đưa service_role key vào đây (ràng buộc #3).
 */
import { createClient } from '@supabase/supabase-js';
import { cleanEnv, checkSupabaseConfig } from '../logic/config-check.js';

const URL_KEY = cleanEnv(import.meta.env?.VITE_SUPABASE_URL);
const ANON_KEY = cleanEnv(import.meta.env?.VITE_SUPABASE_ANON_KEY);

/** Đã khai báo đủ biến môi trường chưa. */
export function isSupabaseConfigured() {
  return Boolean(URL_KEY && ANON_KEY);
}

/**
 * Lỗi cấu hình nếu có — để màn đồng bộ nói rõ sai ở đâu thay vì để Supabase
 * trả về "Invalid API key" khó đoán.
 * @returns {string|null}
 */
export function getConfigError() {
  return checkSupabaseConfig(URL_KEY, ANON_KEY).error;
}

let client = null;

/**
 * Lấy client dùng chung, hoặc null nếu chưa cấu hình.
 * @returns {object|null}
 */
export function getSupabase() {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(URL_KEY, ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
