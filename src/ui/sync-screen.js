/**
 * Màn đồng bộ: đăng nhập bằng email + mật khẩu, rồi trao đổi sự kiện với Supabase.
 * Không dùng mã OTP qua email vì Supabase chặn việc sửa mẫu email khi chưa có SMTP riêng (D25c).
 */
import { el, goTo } from './dom.js';
import { signUp, signIn, getCurrentUser, signOut, syncEvents, isSupabaseConfigured, getConfigError, MIN_PASSWORD_LENGTH, autoSyncStatus, AUTO_SYNC_DELAY_MS } from '../data/sync.js';
import { describeSync } from '../logic/sync.js';

/** Trạng thái riêng của màn. */
let stage = 'unknown';   // unknown | signed-out | signed-in
let email = '';
let password = '';
let message = '';
let busy = false;
let user = null;

/** Chạy một việc có thể lỗi, hiện thông báo thay vì làm trắng màn hình. */
async function run(store, task) {
  busy = true;
  message = 'Đang xử lý...';
  store.refresh();
  try {
    message = (await task()) ?? '';
  } catch (error) {
    message = error?.message ?? String(error);
  } finally {
    busy = false;
    store.refresh();
  }
}

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderSync(store) {
  if (!isSupabaseConfigured()) {
    return el('div', {}, [
      el('h1', { text: 'Đồng bộ' }),
      el('p', { class: 'empty', text: 'Chưa cấu hình Supabase. Dữ liệu hiện chỉ nằm trên máy này.' }),
      el('div', { class: 'card back' }, [
        el('div', { class: 'meaning', text: 'Cần làm gì' }),
        el('div', { text: '1. Tạo project trên supabase.com (gói free).' }),
        el('div', { text: '2. Chạy file supabase/schema.sql trong SQL Editor.' }),
        el('div', { text: '3. Tắt "Confirm email" ở Authentication → Sign In / Providers → Email.' }),
        el('div', { text: '4. Thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY (publishable key) vào .env, và trên Cloudflare ở Settings → Build → Variables and secrets, rồi build lại.' }),
        el('div', { text: 'Checklist đầy đủ: mục "VIỆC CỦA HUY" trong PROGRESS.md.' }),
      ]),
      el('button', { class: 'secondary', onClick: () => goTo('/') }, [el('span', { text: 'Về Tổng quan' })]),
    ]);
  }

  const configError = getConfigError();
  if (configError) {
    return el('div', {}, [
      el('h1', { text: 'Cấu hình Supabase đang sai' }),
      el('div', { class: 'note', text: configError }),
      el('p', { class: 'empty', text: 'Sửa biến môi trường rồi build/deploy lại. Dữ liệu trên máy không bị ảnh hưởng.' }),
      el('button', { class: 'secondary', onClick: () => goTo('/') }, [el('span', { text: 'Về Tổng quan' })]),
    ]);
  }

  if (stage === 'unknown') {
    getCurrentUser().then((found) => {
      user = found;
      stage = found ? 'signed-in' : 'signed-out';
      store.refresh();
    });
    return el('div', {}, [el('h1', { text: 'Đồng bộ' }), el('p', { class: 'empty', text: 'Đang kiểm tra...' })]);
  }

  const children = [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Tổng quan', onClick: () => goTo('/') }),
      el('span', { class: 'progress', text: `${store.eventCount} sự kiện ở máy này` }),
    ]),
    el('h1', { text: 'Đồng bộ giữa các máy' }),
  ];

  if (stage === 'signed-in') {
    children.push(
      el('p', { class: 'subtitle', text: `Đang đăng nhập: ${user?.email ?? ''}` }),
      el('p', {
        class: 'empty',
        text: `App tự đồng bộ khi mở, khi rời app và ${AUTO_SYNC_DELAY_MS / 1000} giây sau khi học xong. `
          + (autoSyncStatus.at
            ? `Lần gần nhất ${new Date(autoSyncStatus.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}: ${autoSyncStatus.text}.`
            : 'Chưa chạy lần nào kể từ khi mở app.'),
      }),
      el('button', {
        class: 'primary',
        onClick: () => !busy && run(store, async () => {
          const result = await syncEvents({
            localEvents: store.exportEvents(),
            saveLocal: (incoming) => store.importEvents(incoming),
          });
          return describeSync(result);
        }),
      }, [
        el('span', { text: busy ? 'Đang đồng bộ...' : 'Đồng bộ ngay' }),
        el('small', { text: 'không cần chờ — gửi phần máy chủ thiếu, nhận phần máy này thiếu' }),
      ]),
      el('div', { class: 'actions' }, [
        el('button', {
          class: 'link',
          text: 'Đăng xuất',
          onClick: () => run(store, async () => {
            await signOut();
            stage = 'signed-out';
            user = null;
            return 'Đã đăng xuất. Dữ liệu trên máy vẫn giữ nguyên.';
          }),
        }),
      ]),
    );
  } else {
    const emailInput = el('input', {
      type: 'email', class: 'field', placeholder: 'email của bạn', value: email,
      autocomplete: 'email', inputmode: 'email',
    });
    emailInput.addEventListener('input', (e) => { email = e.target.value; });

    const passwordInput = el('input', {
      type: 'password', class: 'field', placeholder: `mật khẩu (từ ${MIN_PASSWORD_LENGTH} ký tự)`,
      value: password, autocomplete: 'current-password',
    });
    passwordInput.addEventListener('input', (e) => { password = e.target.value; });

    const enter = (task) => (e) => { if (e.key === 'Enter') task(); };
    const doSignIn = () => !busy && run(store, async () => {
      user = await signIn(email.trim(), password);
      stage = 'signed-in';
      password = '';
      return 'Đăng nhập xong. Bấm "Đồng bộ ngay" để trao đổi dữ liệu.';
    });
    passwordInput.addEventListener('keydown', enter(doSignIn));

    children.push(
      emailInput,
      passwordInput,
      el('button', { class: 'primary', onClick: doSignIn }, [
        el('span', { text: 'Đăng nhập' }),
        el('small', { text: 'dùng chung tài khoản này trên cả 3 máy' }),
      ]),
      el('div', { class: 'actions' }, [
        el('button', {
          class: 'link',
          text: 'Lần đầu dùng? Tạo tài khoản',
          onClick: () => !busy && run(store, async () => {
            user = await signUp(email.trim(), password);
            stage = 'signed-in';
            password = '';
            return 'Đã tạo tài khoản và đăng nhập. Bấm "Đồng bộ ngay".';
          }),
        }),
      ]),
    );
  }

  if (message) children.push(el('div', { class: 'note', text: message }));
  return el('div', {}, children);
}

/** Đặt lại khi rời màn. Xoá mật khẩu khỏi bộ nhớ, không giữ lại. */
export function resetSync() {
  message = '';
  busy = false;
  password = '';
}
