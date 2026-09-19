# PROGRESS.md — Trạng thái bàn giao giữa các phiên

> Claude cập nhật file này sau MỖI bước con. Phiên mới đọc file này trước tiên.

## Trạng thái hiện tại
- Giai đoạn: 1 — MVP. **M0, M1, M2, M3 đã xong** (2026-09-19).
- **App đã dùng học thật được**: https://toeic-app.huybndc-451.workers.dev
- Repo private: https://github.com/huybndc/toeic-app — 133 test pass.

## Dùng app thế nào (cho Huy)
1. Mở link trên (máy Mac hoặc iPhone).
2. Bấm **Phân loại từ đã biết / chưa biết** — lướt 20 từ một lượt, bấm "Đã biết" để loại bớt.
3. Về màn chính bấm **Ôn tập ngay**. Xem từ → bấm "Hiện nghĩa" → tự chấm Quên/Khó/Tốt/Dễ.
   Mỗi nút ghi sẵn lần ôn kế tiếp là bao lâu nữa.
4. Bàn phím: `Space` lật thẻ, `1`–`4` chấm điểm. Màn phân loại: `1` chưa biết, `2` đã biết.
5. **Lưu ý quan trọng:** dữ liệu hiện lưu RIÊNG trên từng máy (IndexedDB), chưa đồng bộ.
   Đồng bộ Mac ↔ iPhone là M5. Học trên một máy trước để tránh lệch dữ liệu.

## Đã xong trong phiên 2026-09-19
- **M1**: Vite + Vitest, git, GitHub private, Cloudflare Workers tự deploy mỗi lần push.
- **M2**: schema vocab/event; pipeline sinh 1243/1250 từ TSL 1.2 (nghĩa Việt, 2 ví dụ song ngữ,
  collocation, đồng/trái nghĩa, note bẫy TOEIC); validator; `npm run audit:vocab`.
  Chỉ 35/1243 từ có IPA vì API từ điển hỏng — chạy lại pipeline sẽ tự tra tiếp.
- **M3**: FSRS bọc sau interface riêng; reducer gấp nhật ký sự kiện; IndexedDB append-only;
  router hash; màn tổng quan / phân loại / ôn thẻ / từ hay sai.
- **RESEARCH.md**: khảo sát TOEIC Lab, GenLang, Test-English, Anki → 6 điểm UX đã áp dụng.
- **CLAUDE.md**: thêm 6 quy tắc kỹ thuật bắt buộc + checklist cuối mỗi bước con + quy tắc làm song song.

## Bước tiếp theo (cụ thể)
1. **M4 — Part 5**: schema question; pipeline sinh ~200 câu có kiểm định 2 bước (prompt A sinh,
   prompt B tự giải, lệch thì loại); màn luyện 20 câu, giải thích tiếng Việt, gắn loại lỗi, nút báo câu lỗi.
   Lưu ý hạn mức: mỗi model free tier ~20 request/ngày (D19) → gộp nhiều câu mỗi request.
2. **M5 — Supabase + đồng bộ** (quan trọng với Huy vì dùng 2 Mac + iPhone).
3. Chạy lại `npm run build:vocab` vài ngày tới để lấy nốt IPA + 7 từ còn thiếu.

## Vướng mắc / câu hỏi mở
- Q1 (Giai đoạn 2): audio để chung repo hay bucket riêng — chưa tới lúc quyết.
- File deck 1,37 MB (gzip 308 KB). Chấp nhận được với 1243 từ, nhưng khi thêm Part 5/6/7 nên tách
  file theo deck và tải theo nhu cầu. Ghi nhớ khi làm M6 (PWA cache).
- API từ điển (dictionaryapi.dev) chập chờn, chỉ lấy được 35/1243 IPA. Nếu lần chạy sau vẫn hỏng,
  cân nhắc đổi nguồn sang Wiktionary.

## Giờ thực tế so với ước tính
| Milestone | Ước tính | Thực tế | Ghi chú |
|---|---|---|---|
| M0 (công cụ) | ~1–1,5h | ~0h | Node/git đã có sẵn |
| M1 | ~2h | ~35 phút | Credential GitHub sẵn trong Keychain |
| M2 | ~2h | ~2h15 | Phát sinh 3 lỗi mạng (timeout, quota, IPA chậm) |
| M3 | ~2h | ~1h | Làm song song lúc pipeline chạy nền |

## Nhật ký phiên (mới nhất ở trên)
- 2026-09-19 — **MVP học được rồi**: M2 + M3 xong, deploy chạy thật, 133 test pass.
  Rút 6 quy tắc kỹ thuật từ sự cố thật vào CLAUDE.md. Khảo sát đối thủ → RESEARCH.md.
- 2026-09-19 — M1 xong: deploy Cloudflare, repo private, 7 test.
- 2026-09-19 — Huy duyệt PLAN, giao toàn quyền quyết định.
- 2026-09-19 — Bộ bàn giao được tạo từ claude.ai.
