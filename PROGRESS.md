# PROGRESS.md — Trạng thái bàn giao giữa các phiên

> Claude cập nhật file này sau MỖI bước con. Phiên mới đọc file này trước tiên.

## Trạng thái hiện tại
- Giai đoạn: 1 — MVP
- Milestone: **M1 (khung project + deploy)** — code + GitHub đã xong, còn bước nối Cloudflare Pages.
- Huy đã duyệt PLAN.md nguyên trạng ngày 2026-09-19 và giao Claude toàn quyền quyết định.

### Đã xong
- M0 phần công cụ: Node v24.18.0, npm 11.16.0, git 2.50.1, git đã có user.name/user.email.
- M1 phần local:
  - `package.json` + Vite 7 + Vitest 3; script `dev` / `build` / `test` / `test:watch`.
  - Cấu trúc thư mục theo PLAN (`src/logic`, `src/data`, `src/ui`, `public/content`, `pipeline`, `schemas`, `tests`).
  - `src/logic/events.js`: `createEvent` (sự kiện bất biến, validate type + deviceId) và
    `mergeEventLogs` (gộp nhật ký nhiều thiết bị, bỏ trùng theo id, sắp xếp ổn định) — nền cho D23.
  - `src/data/device.js`: id thiết bị lưu localStorage.
  - `src/ui/home-screen.js` + `style.css`: màn hình chào tạm, sẽ thay bằng router ở M3.
  - `tests/events.test.js`: **7 test pass**. `npm run build` chạy được. Đã xem thật trên dev server.
  - `.claude/launch.json` để mở dev server nhanh.
- Git repo đã init (nhánh `main`), commit đầu: `chore: khung project Vite + Vitest, nhật ký sự kiện ban đầu`.
- Đã push lên GitHub **private**: https://github.com/huybndc/toeic-app (remote `origin`, nhánh `main`).
  Credential GitHub có sẵn trong macOS Keychain nên `git push` chạy không cần cấu hình thêm.
- `.env` đã tạo với `GEMINI_API_KEY` (chmod 600, đã xác nhận git bỏ qua, KHÔNG có trên GitHub). `.env.example` được commit.

## Bước tiếp theo (cụ thể)
1. **Huy tự làm — nối Cloudflare Pages** (Claude không đăng nhập / cấp quyền OAuth hộ được):
   dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git → chọn repo `toeic-app`.
   Cấu hình build: framework preset **Vite**, build command `npm run build`, output directory `dist`,
   thêm biến môi trường `NODE_VERSION` = `22`. Xong thì báo link `*.pages.dev` cho Claude.
2. Sau khi mở được link trên iPhone → **M1 xong** → sang **M2 (schema + pipeline từ vựng)**.
3. M2 đã sẵn sàng bắt đầu bất cứ lúc nào (chỉ cần Gemini API key trong `.env`).

## Vướng mắc / câu hỏi mở
- ~~Q2 (chặn M2)~~ → **đã giải quyết 2026-09-19**: TSL 1.2 (1250 từ) và NGSL 1.2 (2809 từ) đều CC BY-SA 4.0.
  Dùng được, chỉ cần ghi công + phát hành phần dữ liệu phái sinh cùng giấy phép. Chi tiết: DECISIONS.md D18.
  → M2 không còn bị chặn.
- npm 11 chặn install script của `esbuild`; đã kiểm tra `npm run build` vẫn chạy bình thường nên bỏ qua.

## Giờ thực tế so với ước tính
| Milestone | Ước tính | Thực tế | Ghi chú |
|---|---|---|---|
| M0 (phần công cụ) | ~1–1,5h | ~0h | Node/git đã có sẵn trên máy |
| M1 (phần local) | ~2h (cả deploy) | ~15 phút | Còn phần GitHub + Cloudflare chờ tài khoản |

## Nhật ký phiên (mới nhất ở trên, mỗi phiên 1–3 dòng)
- 2026-09-19 — Push lên GitHub private thành công, tạo `.env` + `.env.example`. Còn mỗi Cloudflare Pages là xong M1.
  ⚠️ Gemini key từng bị dán vào khung chat → đã dặn Huy tạo key mới và xoá key cũ ở Google AI Studio.
- 2026-09-19 — Huy duyệt PLAN, giao toàn quyền. Dựng khung Vite+Vitest, viết `events.js` (7 test pass),
  màn hình chào chạy được, git init + commit đầu. Chờ Huy tạo tài khoản để push + deploy.
- 2026-09-19 — Bộ bàn giao được tạo từ claude.ai: CLAUDE.md, PLAN.md, DECISIONS.md, PROGRESS.md, skill mini-project-setup.
