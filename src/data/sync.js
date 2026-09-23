/**
 * Đồng bộ nhật ký sự kiện với Supabase (D23, D24: ghi máy trước, đồng bộ sau).
 * Đăng nhập bằng OTP 6 số qua email (D25: magic link mở nhầm Safari thay vì PWA trên iPhone).
 */
import { getSupabase, isSupabaseConfigured, getConfigError } from './supabase.js';
import { diffEvents, toRows, fromRows } from '../logic/sync.js';

const TABLE = 'events';

/** Độ dài mật khẩu tối thiểu. Supabase mặc định 6; đặt cao hơn cho chắc. */
export const MIN_PASSWORD_LENGTH = 8;

/** Kiểm tra đầu vào trước khi gọi mạng, để báo lỗi rõ ràng bằng tiếng Việt. */
function checkCredentials(email, password) {
  if (!email?.includes('@')) throw new Error('Email không hợp lệ');
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Mật khẩu phải từ ${MIN_PASSWORD_LENGTH} ký tự trở lên`);
  }
}

/**
 * Tạo tài khoản lần đầu.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} thông tin người dùng
 */
export async function signUp(email, password) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình Supabase');
  checkCredentials(email, password);

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw new Error(`Không tạo được tài khoản: ${error.message}`);

  // Không có session nghĩa là Supabase đang bắt xác nhận qua email.
  // Với app cá nhân thì đó chỉ là rào cản thừa — báo rõ cách tắt thay vì để Huy đoán.
  if (!data.session) {
    throw new Error(
      'Đã tạo tài khoản nhưng Supabase đang bắt xác nhận email. '
      + 'Vào Authentication → Sign In / Providers → Email, tắt "Confirm email", rồi đăng nhập lại.',
    );
  }
  return data.user;
}

/**
 * Đăng nhập.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} thông tin người dùng
 */
export async function signIn(email, password) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Chưa cấu hình Supabase');
  checkCredentials(email, password);

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      throw new Error('Sai email hoặc mật khẩu. Lần đầu dùng thì bấm "Tạo tài khoản".');
    }
    throw new Error(`Không đăng nhập được: ${error.message}`);
  }
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

  // Supabase trả tối đa 1000 dòng mỗi request (Settings → API → Max rows) và KHÔNG báo lỗi khi cắt.
  // Đọc một lần là quá 1000 sự kiện thì phần dư không bao giờ về máy kia → phải đọc từng trang.
  // Dừng khi trang RỖNG chứ không phải khi trang thiếu: nếu giới hạn máy chủ nhỏ hơn PAGE thì trang
  // nào cũng "thiếu". Sắp theo created_at để sự kiện máy khác vừa đẩy lên nằm cuối, không xô lệch trang.
  const PAGE = 1000;
  const rows = [];
  for (;;) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, device_id, ts, type, payload')
      .order('created_at')
      .order('id')
      .range(rows.length, rows.length + PAGE - 1);
    if (error) throw new Error(`Không đọc được dữ liệu: ${error.message}`);
    if (data.length === 0) break;
    rows.push(...data);
  }

  const remoteEvents = fromRows(rows);
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

export { isSupabaseConfigured, getConfigError };
