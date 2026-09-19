/**
 * Màn đồng bộ: đăng nhập bằng mã OTP 6 số qua email, rồi trao đổi sự kiện với Supabase.
 * Dùng OTP thay vì magic link vì trên iPhone link sẽ mở Safari chứ không mở PWA (D25).
 */
import { el, goTo } from './dom.js';
import { requestOtp, verifyOtp, getCurrentUser, signOut, syncEvents, isSupabaseConfigured } from '../data/sync.js';
import { describeSync } from '../logic/sync.js';

/** Trạng thái riêng của màn. */
let stage = 'unknown';   // unknown | signed-out | code-sent | signed-in
let email = '';
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
        el('div', { text: '3. Thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY vào .env rồi build lại.' }),
      ]),
      el('button', { class: 'secondary', onClick: () => goTo('/') }, [el('span', { text: 'Về màn chính' })]),
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
      el('button', { class: 'link', text: '← Về màn chính', onClick: () => goTo('/') }),
      el('span', { class: 'progress', text: `${store.eventCount} sự kiện ở máy này` }),
    ]),
    el('h1', { text: 'Đồng bộ giữa các máy' }),
  ];

  if (stage === 'signed-in') {
    children.push(
      el('p', { class: 'subtitle', text: `Đang đăng nhập: ${user?.email ?? ''}` }),
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
        el('small', { text: 'gửi phần máy chủ thiếu, nhận phần máy này thiếu' }),
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
    children.push(emailInput);

    if (stage === 'code-sent') {
      const codeInput = el('input', {
        type: 'text', class: 'field', placeholder: 'mã 6 số trong email',
        inputmode: 'numeric', maxlength: '6',
      });
      children.push(
        codeInput,
        el('button', {
          class: 'primary',
          onClick: () => !busy && run(store, async () => {
            user = await verifyOtp(email.trim(), codeInput.value.trim());
            stage = 'signed-in';
            return 'Đăng nhập thành công. Bấm "Đồng bộ ngay" để trao đổi dữ liệu.';
          }),
        }, [el('span', { text: 'Xác nhận mã' })]),
      );
    } else {
      children.push(
        el('button', {
          class: 'primary',
          onClick: () => !busy && run(store, async () => {
            await requestOtp(email.trim());
            stage = 'code-sent';
            return 'Đã gửi mã 6 số tới email. Nhập mã vào ô bên dưới.';
          }),
        }, [
          el('span', { text: 'Gửi mã đăng nhập' }),
          el('small', { text: 'mã 6 số, không dùng magic link' }),
        ]),
      );
    }
  }

  if (message) children.push(el('div', { class: 'note', text: message }));
  return el('div', {}, children);
}

/** Đặt lại khi rời màn. */
export function resetSync() {
  message = '';
  busy = false;
}
