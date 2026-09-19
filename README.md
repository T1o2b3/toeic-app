# TOEIC app (cá nhân)

PWA ôn TOEIC Listening & Reading, miễn phí 100%, đồng bộ Mac + iPhone.
Xem `PLAN.md` (lộ trình), `DECISIONS.md` (quyết định + lý do), `PROGRESS.md` (trạng thái hiện tại).

## Chạy

```bash
npm install      # chỉ lần đầu
npm run dev      # mở http://localhost:5173
npm test         # chạy test
npm run build    # build ra dist/
```

## Bắt đầu một phiên làm việc mới với Claude Code

Áp dụng cho MỌI lần quay lại project, kể cả sau nhiều tuần.

### 1. Mở đúng thư mục
Mở Claude Code với thư mục `toeic_app` (không phải thư mục cha). Claude tự đọc `CLAUDE.md`.

### 2. Gõ câu mở đầu này
```
Đọc PROGRESS.md rồi tóm tắt: đang ở milestone nào, bước tiếp theo là gì, hôm nay nên làm gì.
```
Không cần kể lại gì thêm. Mọi thứ cần biết đã nằm trong `PROGRESS.md`, `PLAN.md`, `DECISIONS.md`.
Claude sẽ tự đối chiếu với `git log` để biết thực tế khớp tài liệu không.

### 3. Trong lúc làm
- Muốn đổi hướng hoặc thêm ý tưởng: cứ nói. Nếu nằm ngoài milestone hiện tại, Claude sẽ ghi vào
  mục **Backlog** trong `PLAN.md` thay vì làm ngay (ràng buộc #8).
- Muốn đổi một quyết định đã ghi trong `DECISIONS.md`: Claude phải hỏi lại trước khi đổi (ràng buộc #9).

### 4. Khi nào gõ `/clear`
- Khi Claude chủ động báo "đã lưu trạng thái, hãy `/clear`".
- Hoặc khi chuyển sang việc khác hẳn (ví dụ đang làm nội dung, giờ chuyển sang sửa giao diện).

**Trước khi `/clear`, nếu Claude chưa tự làm thì gõ:**
```
Cập nhật PROGRESS.md, chạy check_processes.sh, rồi commit và push.
```

### 5. Nếu phiên bị đứt giữa chừng (mất mạng, đóng nhầm)
Không mất gì. Phiên mới chỉ cần:
```
Chạy git status và git log --oneline -5, đối chiếu với PROGRESS.md xem có gì làm dở không.
```

### 6. Cách báo lỗi cho nhanh
Kèm đủ 2 thứ này thì Claude dò ra gần như ngay:
1. **Số hiệu bản build** ở cuối màn chính (vd `bản 2026-09-19 12:19`) — để biết có đang xem bản cũ không.
2. **Nguyên văn dòng lỗi** hiện trên màn hình, hoặc ảnh chụp.

Nếu lỗi ở app đã deploy: tải lại trang trước khi báo (Mac `Cmd+Shift+R`; iPhone đóng hẳn app rồi mở lại).

## Pipeline nội dung (chạy trên máy, không chạy trong app)

```bash
npm run build:vocab -- --limit 20   # thử 20 từ đầu trước cho chắc
npm run build:vocab                 # làm toàn bộ 1250 từ TSL
npm run validate:content            # kiểm tra file nội dung theo schema
npm run audit:vocab                 # soi chất lượng + bốc 30 từ ngẫu nhiên để duyệt
```

Việc chạy dài nên ghi log ra file để theo dõi được tiến độ, và nhớ dọn tiến trình nền khi xong:

```bash
npm run build:vocab > /tmp/vocab-run.log 2>&1 &   # chạy nền, theo dõi bằng: tail -f /tmp/vocab-run.log
bash scripts/check_processes.sh                   # xem còn tiến trình nền nào không
```

Cần `GEMINI_API_KEY` trong `.env` (xem `.env.example`). Pipeline **chạy lại được nhiều lần**:
kết quả AI của từng từ được lưu ở `pipeline/.cache/`, chạy lại chỉ gọi AI cho từ còn thiếu —
quan trọng vì free tier giới hạn số lượt mỗi phút.

## Cấu trúc

| Thư mục | Trách nhiệm |
|---|---|
| `src/logic/` | Hàm thuần, không đụng DOM — test được bằng Node |
| `src/data/` | IndexedDB, đồng bộ Supabase, tải nội dung |
| `src/ui/` | Màn hình + router, chỉ nơi này được đụng DOM |
| `public/content/` | Nội dung JSON đã kiểm định (từ vựng, câu hỏi) |
| `pipeline/` | Script Node sinh nội dung, chạy trên máy (không chạy trong app) |
| `schemas/` | JSON schema cho vocab / question / event |
| `tests/` | Test Vitest cho `src/logic` và `pipeline` |

`src/logic/` không bao giờ import từ `src/ui/`.

## Ghi công nguồn dữ liệu

- **TOEIC Service List (TSL) 1.2** — Browne, C. & Culligan, B. (2013), <https://www.newgeneralservicelist.com>.
  Phát hành theo [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- **New General Service List (NGSL) 1.2** — Browne, C., Culligan, B. & Phillips, J. (2013), cùng nguồn và cùng giấy phép.

Dữ liệu từ vựng trong `public/content/` là bản phái sinh của hai danh sách trên nên cũng theo CC BY-SA 4.0
(xem `DECISIONS.md` — D18). Phần mã nguồn không thuộc phạm vi giấy phép này.
