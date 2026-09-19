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
