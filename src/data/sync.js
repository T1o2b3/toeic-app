/**
 * Đồng bộ nhật ký sự kiện với Supabase (D23, D24: ghi máy trước, đồng bộ sau).
 * Đăng nhập bằng OTP 6 số qua email (D25: magic link mở nhầm Safari thay vì PWA trên iPhone).
 */
import { getSupabase, isSupabaseConfigured } from './supabase.js';
import { diffEvents, toRows, fromRows } from '../logic/sync.js';

const TABLE = 'events';

/**
 * Gửi mã OTP 6 số tới email.
 * @param {string} email
 */
export async function requestOtp(email) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình Supabase');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw new Error(`Không gửi được mã: ${error.message}`);
}

/**
 * Xác nhận mã OTP để đăng nhập.
 * @param {string} email
 * @param {string} token - 6 chữ số
 * @returns {Promise<object>} thông tin người dùng
 */
export async function verifyOtp(email, token) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình Supabase');
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw new Error(`Mã không đúng: ${error.message}`);
  return data.user;
}

/** Người dùng hiện tại, null nếu chưa đăng nhập. */
export async function getCurrentUser() {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

/** Đăng xuất. Dữ liệu ở máy giữ nguyên, chỉ ngừng đồng bộ. */
export async function signOut() {
  await getSupabase()?.auth.signOut();
}

/**
 * Đồng bộ hai chiều: đẩy sự kiện máy chủ chưa có, kéo về sự kiện máy này chưa có.
 * @param {object} input
 * @param {Array<object>} input.localEvents
 * @param {(events: Array<object>) => Promise<unknown>} input.saveLocal - ghi sự kiện mới về máy
 * @returns {Promise<{pushed: number, pulled: number}>}
 */
export async function syncEvents({ localEvents, saveLocal }) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình Supabase — xem .env.example');

  const user = await getCurrentUser();
  if (!user) throw new Error('Chưa đăng nhập');

  const { data, error } = await supabase.from(TABLE).select('id, device_id, ts, type, payload');
  if (error) throw new Error(`Không đọc được dữ liệu: ${error.message}`);

  const remoteEvents = fromRows(data);
  const { toPush, toPull } = diffEvents(localEvents, remoteEvents);

  if (toPush.length > 0) {
    // upsert + ignoreDuplicates: hai máy cùng đẩy một sự kiện thì không báo lỗi.
    const { error: pushError } = await supabase
      .from(TABLE)
      .upsert(toRows(toPush, user.id), { onConflict: 'id', ignoreDuplicates: true });
    if (pushError) throw new Error(`Không gửi được dữ liệu: ${pushError.message}`);
  }

  if (toPull.length > 0) await saveLocal(toPull);

  return { pushed: toPush.length, pulled: toPull.length };
}

export { isSupabaseConfigured };
