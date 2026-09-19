-- Lược đồ cơ sở dữ liệu Supabase cho TOEIC app.
-- Chạy toàn bộ file này một lần trong Supabase → SQL Editor → New query → Run.
--
-- Hai nguyên tắc chi phối thiết kế:
--   D23 — nhật ký sự kiện APPEND-ONLY: chỉ được thêm, không sửa, không xoá.
--   Ràng buộc #4 — RLS bắt buộc bật cho mọi bảng ngay khi tạo.
--
-- RLS (Row Level Security) = luật lọc theo từng DÒNG do chính cơ sở dữ liệu áp đặt.
-- Không có RLS thì bất kỳ ai cầm anon key (key này nằm công khai trong frontend)
-- đều đọc được dữ liệu của người khác.

-- ---------------------------------------------------------------------------
-- 1. Bảng nhật ký sự kiện
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key,                         -- uuid do máy sinh, trùng thì bỏ qua
  user_id     uuid not null references auth.users (id) on delete cascade,
  device_id   text not null,
  ts          bigint not null,                          -- Date.now() lúc sự kiện xảy ra
  type        text not null,
  payload     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()        -- lúc máy chủ nhận được
);

-- Đồng bộ luôn hỏi "sự kiện của tôi, mới hơn mốc X" nên đánh chỉ mục đúng cặp đó.
create index if not exists events_user_ts_idx on public.events (user_id, ts);

alter table public.events enable row level security;

-- Chỉ đọc được sự kiện của chính mình.
drop policy if exists "doc su kien cua minh" on public.events;
create policy "doc su kien cua minh"
  on public.events for select
  using (auth.uid() = user_id);

-- Chỉ ghi được sự kiện mang user_id của chính mình.
drop policy if exists "ghi su kien cua minh" on public.events;
create policy "ghi su kien cua minh"
  on public.events for insert
  with check (auth.uid() = user_id);

-- CỐ Ý KHÔNG có policy cho update và delete.
-- Không có policy nghĩa là thao tác đó bị từ chối với mọi người — đúng tinh thần append-only (D23).
-- Nhờ vậy một lỗi lập trình ở frontend cũng không thể xoá mất lịch sử học.

-- ---------------------------------------------------------------------------
-- 2. Bảng cài đặt (last-write-wins, D23)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.settings enable row level security;

drop policy if exists "doc cai dat cua minh" on public.settings;
create policy "doc cai dat cua minh"
  on public.settings for select using (auth.uid() = user_id);

drop policy if exists "them cai dat cua minh" on public.settings;
create policy "them cai dat cua minh"
  on public.settings for insert with check (auth.uid() = user_id);

-- Cài đặt thì ĐƯỢC phép sửa (khác với sự kiện): bản ghi sau đè bản ghi trước.
drop policy if exists "sua cai dat cua minh" on public.settings;
create policy "sua cai dat cua minh"
  on public.settings for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. Kiểm tra sau khi chạy
-- ---------------------------------------------------------------------------
-- Câu lệnh dưới đây phải trả về rowsecurity = true cho CẢ HAI bảng.
-- Nếu có bảng nào false thì dừng lại, đừng dùng app cho tới khi sửa xong.
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename in ('events', 'settings');
