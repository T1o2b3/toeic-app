# DECISIONS.md — Nhật ký quyết định

Mỗi quyết định: nội dung, lý do, trade-off chấp nhận. Muốn đổi một quyết định → thêm mục mới "Thay thế Dxx", không xóa mục cũ.

## Sản phẩm

**D01. MVP dùng được sau tối đa 1 tuần; tính năng khác làm dần.**
Lý do: việc học không được chờ app. Trade-off: MVP rất hẹp (từ vựng + Part 5), phần nghe để giai đoạn sau.

**D02. Bỏ Part 1.** Cần ảnh, sinh ảnh miễn phí chất lượng thất thường; ở mức 850 Part 1 gần như không mất điểm. Trade-off: full test là 194 câu.

**D03. Thiết kế cho nhịp học ngắn (1–2 giờ/tuần, 6–12 tháng).** Mặc định số từ mới/ngày thấp (điều chỉnh được), có nút "15 phút hôm nay", cảnh báo khi hàng đợi ôn tồn đọng. Trade-off: tiến độ từ mới chậm hơn, đổi lại không bị quá tải rồi bỏ.

**D04. Từ vựng tổ chức theo "deck" ngay từ đầu** (`toeic-tsl` trước, sau này `ngsl`, `daily`, `my-words`). Lý do: đã biết sẽ mở rộng sang từ vựng đời thường; thêm trường `deck` bây giờ gần như không tốn gì, thêm sau thì phải chuyển đổi dữ liệu.

## Nội dung

**D10. Sinh nội dung trước (pipeline trên máy), không gọi AI lúc dùng app.** Lý do: an toàn API key, không phụ thuộc hạn mức free tier khi đang học. Trade-off: ngân hàng câu hữu hạn, cần chạy pipeline định kỳ.

**D11. Nguồn:** từ vựng TOEIC Service List 1.2 (Browne & Culligan, cần ghi nguồn; kiểm tra lại license trước khi dùng); IPA từ Free Dictionary API/Wiktionary (AI chỉ dự phòng); nghĩa Việt, ví dụ, collocation, đồng/trái nghĩa do Gemini Flash (free tier) sinh; câu hỏi do Gemini Flash sinh.

**D12. Kiểm định câu hỏi 2 bước:** prompt A sinh câu, prompt B tự giải không thấy đáp án; lệch → loại. Thêm lọc trùng lặp, Huy duyệt nhanh ~10% mỗi lô, nút "báo câu lỗi" trong app.

**D13. Mỗi mục nội dung ghi nguồn gốc** (`gen: {model, promptVersion, batch, date}`) để gỡ cả lô nếu kém.

**D14. Module gọi AI có thể thay nhà cung cấp** (Gemini chính, OpenRouter dự phòng). Free tier có thể bị cắt bất cứ lúc nào.

**D15. Audio:** edge-tts (đủ giọng US/UK/AU/CA; không chính thức nên có thể hỏng) gọi qua dòng lệnh; Kokoro (Apache 2.0, chỉ US/UK) dự phòng. MP3 mono bitrate thấp, tên file = hash nội dung, sinh một lần. Không precache audio. Trade-off: TTS dễ nghe hơn đề thật → mặc định 1.1x, xen kẽ giọng, script có filler; đo lại bằng đề mẫu ETS định kỳ.

**D16. ID nội dung vĩnh viễn; không sửa mục đã phát hành** (đánh dấu `status: "retired"`). Schema JSON được kiểm tra tự động; pipeline từ chối dữ liệu sai.

**D17. Không đưa nguyên văn đề ETS vào prompt/repo.** Prompt mô tả dạng đề bằng lời.

**D18. Q2 đã giải quyết: TSL 1.2 và NGSL 1.2 đều là CC BY-SA 4.0 → dùng được.** (kiểm tra 2026-09-19 tại newgeneralservicelist.com)
- TSL 1.2: 1250 từ, "TOEIC Service List by Browne, C. and Culligan, B., is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License."
- NGSL 1.2: 2809 từ, cùng giấy phép (thêm tác giả Phillips, J.) — dùng cho deck `ngsl` ở M19.
- Nghĩa vụ kèm theo: **BY** (ghi công tác giả) và **SA** (bản phái sinh phải cùng CC BY-SA 4.0).
- Cách tuân thủ trong project:
  1. File `public/content/vocab-toeic-tsl.json` có trường `attribution` ghi nguồn + giấy phép; README ghi công.
  2. Phần **dữ liệu từ vựng** (kể cả nghĩa Việt/ví dụ do Gemini sinh, vì gắn với danh sách gốc) coi là bản phái sinh → phát hành dưới CC BY-SA 4.0.
  3. **Code không bị ảnh hưởng**: ShareAlike chỉ áp cho bản phái sinh của danh sách, không lan sang phần mềm đọc nó.
- Vì app là private, cá nhân, chưa phân phối công khai → nghĩa vụ chưa phát sinh; vẫn ghi công từ đầu cho đúng và khỏi sửa sau.

## Kỹ thuật

**D20. Pipeline viết bằng Node.js** (cùng ngôn ngữ với app). TTS gọi CLI, không cần viết Python.

**D21. Frontend:** Vite + JavaScript thuần, hash router tự viết, tách `src/logic` (thuần, test được) và `src/ui`. Trade-off: không có framework → phải giữ kỷ luật cấu trúc.

**D22. PWA bằng vite-plugin-pwa** (tránh lỗi cache cũ khi deploy). Vẫn giải thích cơ chế service worker để học.

**D23. Dữ liệu người dùng = nhật ký sự kiện append-only.** Sự kiện `{id: uuid, deviceId, ts, type, payload}`, bất biến. Đồng bộ = trao đổi sự kiện còn thiếu → không xung đột. Trạng thái (lịch ôn, từ hay sai, thống kê) tính lại từ nhật ký. Cài đặt/tên deck dùng last-write-wins. Trade-off: tính lại mỗi lần mở app (không đáng kể với 1 người dùng).

**D24. Offline-first:** ghi vào IndexedDB trước, đồng bộ Supabase sau.

**D25. Supabase free:** chỉ lưu sự kiện + cài đặt. RLS bắt buộc. Đăng nhập **OTP 6 số qua email** (magic link mở nhầm Safari thay vì PWA trên iPhone). Free project tự tạm dừng sau 7 ngày không hoạt động → GitHub Actions ping định kỳ. Free không có backup tự động → nút xuất JSON + backup định kỳ.

**D26. Ôn từ bằng FSRS** (thư viện mã nguồn mở), bọc sau interface riêng. Nhờ D23, đổi thuật toán sau này chỉ cần tính lại.

**D27. Host: Cloudflare Pages** (repo private vẫn deploy miễn phí). Hash router nên không cần cấu hình server.

**D28. Test:** Vitest cho `src/logic` và `pipeline` (schema, chấm điểm, FSRS wrapper, gộp sự kiện). Không test UI.

## Câu hỏi còn mở
- Q1 (Giai đoạn 2): audio để chung repo hay repo/bucket riêng? Quyết khi ước lượng được dung lượng thực.
- ~~Q2 (trước M2): xác nhận license của TSL 1.2 và NGSL.~~ → **Đã giải quyết, xem D18.**
