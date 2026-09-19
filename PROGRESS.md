# PROGRESS.md — Trạng thái bàn giao giữa các phiên

> Claude cập nhật file này sau MỖI bước con. Phiên mới đọc file này trước tiên.

## Trạng thái hiện tại
- Giai đoạn: 1 — MVP
- Milestone: **M2 — schema + pipeline từ vựng.** Code xong hết, **đang chờ Gemini API key hợp lệ** để chạy thật.
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

### M2 — đã xong phần code (58 test pass)
- `schemas/vocab.schema.json`, `schemas/event.schema.json` (JSON Schema 2020-12, kiểm bằng ajv).
- `pipeline/data/TSL_12_stats.csv`: 1250 từ nguồn, commit kèm ghi công CC BY-SA 4.0.
- `pipeline/lib/`: `tsl.js` (đọc CSV, sinh id vĩnh viễn), `vocab-entry.js` (chuẩn hoá dữ liệu AI),
  `prompt-vocab.js` (prompt + đọc kết quả + khớp từ thiếu), `ai-provider.js` (Gemini, đổi được nhà
  cung cấp theo D14, có `withRetry` cho lỗi 429/5xx), `ipa.js`, `cache.js`, `validate-deck.js`.
- `pipeline/build-vocab.js` (`npm run build:vocab`) và `pipeline/validate-content.js` (`npm run validate:content`).

## Bước tiếp theo (cụ thể)
1. **ĐANG CHỜ HUY:** lưu Gemini API key hợp lệ (bắt đầu bằng `AIza`, lấy ở aistudio.google.com/apikey)
   vào `.env` dòng `GEMINI_API_KEY=...`. Key Huy đưa lần đầu (`AQ.A…`) bị API trả 401
   `ACCESS_TOKEN_TYPE_UNSUPPORTED` — sai loại credential.
2. Có key rồi: `npm run build:vocab -- --limit 20` để thử 20 từ, Claude đọc kết quả xem chất lượng
   nghĩa Việt/ví dụ có ổn không, chỉnh prompt nếu cần (nhớ tăng `VOCAB_PROMPT_VERSION`).
3. Ổn rồi thì chạy toàn bộ 1250 từ (chia nhiều đợt cũng được, cache tự nhớ).
4. Huy duyệt ngẫu nhiên 30 từ → M2 xong → sang **M3 (IndexedDB + FSRS + màn hình từ vựng)**.

## Vướng mắc / câu hỏi mở
- ~~Q2 (chặn M2)~~ → **đã giải quyết 2026-09-19**: TSL 1.2 (1250 từ) và NGSL 1.2 (2809 từ) đều CC BY-SA 4.0.
  Dùng được, chỉ cần ghi công + phát hành phần dữ liệu phái sinh cùng giấy phép. Chi tiết: DECISIONS.md D18.
  → M2 không còn bị chặn.
- npm 11 chặn install script của `esbuild`; đã kiểm tra `npm run build` vẫn chạy bình thường nên bỏ qua.

## Giờ thực tế so với ước tính
| Milestone | Ước tính | Thực tế | Ghi chú |
|---|---|---|---|
| M0 (phần công cụ) | ~1–1,5h | ~0h | Node/git đã có sẵn trên máy |
| M1 | ~2h | ~35 phút | Máy đã sẵn Node/git + credential GitHub trong Keychain nên nhanh hơn nhiều |

## Nhật ký phiên (mới nhất ở trên, mỗi phiên 1–3 dòng)
- 2026-09-19 — M2: viết xong toàn bộ pipeline từ vựng + schema + validator, 58 test pass. Chờ key hợp lệ để chạy thật.
- 2026-09-19 — **M1 XONG**: deploy Cloudflare thành công, https://toeic-app.huybndc-451.workers.dev chạy đúng
  trên cả desktop lẫn khổ iPhone. Lưu ý: Cloudflare giờ dùng tên miền `*.workers.dev` (xem D27b).
- 2026-09-19 — Push lên GitHub private thành công, tạo `.env` + `.env.example`. Còn mỗi Cloudflare Pages là xong M1.
  ⚠️ Gemini key từng bị dán vào khung chat → đã dặn Huy tạo key mới và xoá key cũ ở Google AI Studio.
- 2026-09-19 — Huy duyệt PLAN, giao toàn quyền. Dựng khung Vite+Vitest, viết `events.js` (7 test pass),
  màn hình chào chạy được, git init + commit đầu. Chờ Huy tạo tài khoản để push + deploy.
- 2026-09-19 — Bộ bàn giao được tạo từ claude.ai: CLAUDE.md, PLAN.md, DECISIONS.md, PROGRESS.md, skill mini-project-setup.
