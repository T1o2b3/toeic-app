/**
 * Kiểm tra cấu hình Supabase trước khi dùng.
 * Sinh ra từ lỗi thật: dán nhầm URL vào ô key trên Cloudflare, và giá trị dính ký tự
 * xuống dòng ở cuối — client vẫn khởi tạo được nhưng báo "Invalid API key" khó hiểu.
 */

/**
 * Chuẩn hoá một giá trị biến môi trường: bỏ khoảng trắng và xuống dòng thừa.
 * @param {unknown} value
 * @returns {string}
 */
export function cleanEnv(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Soát cặp URL + key, trả về lỗi bằng tiếng Việt nếu có gì sai.
 * @param {string} url
 * @param {string} key
 * @returns {{ok: boolean, error: string|null}}
 */
export function checkSupabaseConfig(url, key) {
  if (!url && !key) return { ok: false, error: null }; // chưa cấu hình, không phải lỗi

  if (!url) return { ok: false, error: 'Thiếu VITE_SUPABASE_URL' };
  if (!key) return { ok: false, error: 'Thiếu VITE_SUPABASE_ANON_KEY' };

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    return { ok: false, error: `VITE_SUPABASE_URL sai dạng: "${url}". Phải là https://<mã-project>.supabase.co` };
  }
  if (/^https?:\/\//.test(key)) {
    return { ok: false, error: 'VITE_SUPABASE_ANON_KEY đang chứa một URL. Có vẻ đã dán nhầm Project URL vào ô key.' };
  }
  if (key.length < 20) {
    return { ok: false, error: `VITE_SUPABASE_ANON_KEY quá ngắn (${key.length} ký tự) — có thể bị cắt mất khi dán.` };
  }
  return { ok: true, error: null };
}
