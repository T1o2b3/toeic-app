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
