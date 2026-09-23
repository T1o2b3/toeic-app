# PLAN.md — TOEIC app

**Trạng thái: Huy đã duyệt (2026-09-19), không sửa gì.** Đang làm Giai đoạn 1.

## Mục tiêu
App PWA cá nhân, miễn phí 100%, ôn TOEIC L&R cho khoảng 850 → 950, đồng bộ giữa 2 máy Mac và iPhone. Trọng tâm: tìm và vá lỗ hổng cá nhân (sổ lỗi, ôn từ ngắt quãng), phiên học ngắn. Sau này mở rộng từ vựng đời thường.

**Không làm:** Part 1, AI lúc chạy app, Speaking/Writing, dark mode, gamification, giao diện cầu kỳ.

## Cấu trúc thư mục dự kiến
```
toeic-app/
├── src/
│   ├── logic/      # hàm thuần: FSRS wrapper, chấm điểm, reducer nhật ký sự kiện, lịch "15 phút"
│   ├── data/       # IndexedDB, đồng bộ Supabase, tải content
│   ├── ui/         # màn hình + router
│   └── main.js
├── public/content/ # JSON nội dung đã qua kiểm định (sau này: audio/)
├── pipeline/       # script Node sinh nội dung (chạy trên máy, dùng .env)
├── schemas/        # JSON schema cho vocab, question, event
├── tests/
├── scripts/check_file_sizes.sh
└── CLAUDE.md, PLAN.md, DECISIONS.md, PROGRESS.md, README.md
```

## Giả định thời gian
- Giai đoạn 1 (MVP): **~2 giờ/ngày × 7 ngày**. Ít hơn thì MVP trễ tương ứng.
- Từ giai đoạn 2: **~3–4 giờ/tuần**. Con số là giờ ngồi làm cùng Claude Code, đã tính thời gian giải thích/học khái niệm.
- Ước tính cho người mới: sai số ±30%. Ghi giờ thực tế vào PROGRESS.md để hiệu chỉnh.

---

## Giai đoạn 0 — Chuẩn bị (trước ngày 1, ~1–1,5 giờ)
- [ ] **M0.** Cài Node.js LTS, git (kiểm tra `node -v`, `git --version`); tạo tài khoản GitHub, Cloudflare, Supabase; lấy Gemini API key tại Google AI Studio (không bật billing).
  Xong khi: 4 tài khoản đăng nhập được, key nằm trong `.env` trên máy.
  Tiến độ: ✅ Node v24.18.0, npm 11.16.0, git 2.50.1 (đã có sẵn, git đã cấu hình user.name/email). ⏳ Còn lại: 4 tài khoản + Gemini key (Huy tự làm).

## Giai đoạn 1 — MVP (ngày 1–7, ~13 giờ)
- [x] **M1. Khung project + deploy ngay (ngày 1, ~2h).** Vite vanilla, Vitest + 1 test mẫu, git, repo GitHub private, deploy Cloudflare Pages trang "Hello".
  Học: git, npm, Vite, deploy. Xong khi: mở được link trên iPhone; `npm test` pass.
  ✅ Xong 2026-09-19. Link: https://toeic-app.huybndc-451.workers.dev — repo private https://github.com/huybndc/toeic-app
- [x] **M2. Schema + pipeline từ vựng (ngày 2, ~2h).** Schema vocab/event; tải TSL; lấy IPA; Gemini sinh nghĩa Việt, ví dụ, collocation, đồng/trái nghĩa theo lô; validator.
  Học: JSON schema, gọi API, biến môi trường. Xong khi: `public/content/vocab-toeic-tsl.json` ~1200 từ qua validator; Huy duyệt ngẫu nhiên 30 từ.
  ✅ Xong 2026-09-19: 1243/1250 từ qua validator. Duyệt tay 30 từ được thay bằng báo cáo chất lượng
  tự động (`npm run audit:vocab`) + nút "báo câu lỗi" khi dùng thật — Huy đồng ý bỏ bước duyệt tay.
- [x] **M3. Nhật ký sự kiện + màn hình từ vựng (ngày 3, ~2h).** IndexedDB, reducer, FSRS; màn triage (biết/chưa biết), ôn thẻ, highlight từ hay sai, bookmark.
  Học: IndexedDB, hàm thuần + test. Xong khi: ôn được từ, tải lại trang không mất tiến độ; test reducer/FSRS pass.
  ✅ Xong 2026-09-19: 133 test pass; đã thử thật trên bản deploy, tải lại trang giữ nguyên tiến độ.
- [x] **M4. Pipeline Part 5 + màn luyện Part 5 (ngày 4, ~2h).** Schema question; sinh ~200 câu có kiểm định 2 bước; màn luyện, giải thích tiếng Việt, gắn loại lỗi, nút báo câu lỗi.
  Xong khi: làm được 1 lượt 20 câu, sự kiện ghi đúng.
  ✅ Xong 2026-09-19: 200 câu phủ đều 12 loại kiến thức, 100% qua kiểm định 2 bước bằng 2 model
  khác nhau; màn luyện chấm ngay + giải thích tiếng Việt + nút báo câu lỗi đã thử chạy thật.
- [x] **M5. Supabase + đồng bộ (ngày 5, ~2,5h).** Bảng events + settings, **bật RLS**, đăng nhập OTP, đồng bộ 2 chiều theo sự kiện.
  Học: database, RLS, auth. Xong khi: làm bài trên Mac → thấy trên iPhone và ngược lại; user khác không đọc được dữ liệu.
  Phương án lùi nếu trễ: đồng bộ thủ công bằng nút "Đồng bộ" thay vì tự động.
  🔄 2026-09-19: CODE ĐÃ XONG (schema SQL + RLS, đăng nhập OTP, đồng bộ hai chiều, 10 test).
  Đã chọn phương án nút "Đồng bộ" thủ công cho MVP. Chờ Huy tạo project Supabase và điền
  2 biến vào `.env` là chạy — xem hướng dẫn trong PROGRESS.md.
  ✅ Xong 2026-09-23: Huy cấu hình Supabase + đăng nhập + đồng bộ trên bản deploy; RLS đã kiểm từ ngoài
  (không đăng nhập thì đọc ra rỗng, ghi bị chặn). Sửa kèm lỗi chỉ đọc được 1000 sự kiện đầu.
- [x] **M6. PWA + "15 phút hôm nay" + xuất dữ liệu (ngày 6, ~2h).** vite-plugin-pwa, cài lên màn hình iPhone, phiên học trộn từ đến hạn + câu từng sai + câu mới, nút xuất JSON.
  Học: manifest, service worker, cache. Xong khi: app cài được trên iPhone, mở offline vẫn học được.
  ✅ Xong 2026-09-19: manifest + service worker chạy trên bản deploy; đã kiểm tra bộ nhớ offline có
  cả `vocab-toeic-tsl.json` lẫn `questions-part5.json`; nút xuất JSON hoạt động.
- [ ] **M7. Đệm + dùng thật (ngày 7, ~0,5–1h).** Sửa lỗi phát sinh, viết README.
  Xong khi: Huy dùng MVP học thật 1 phiên trên mỗi thiết bị.

## Giai đoạn 2 — Luyện nghe (tuần 2–4, ~10 giờ)
- [x] M8. Pipeline audio: script hội thoại (có filler), edge-tts 4 giọng, MP3 mono, hash tên file; quyết Q1.
  ✅ 2026-09-20 (phần Part 2): 58 câu qua kiểm định 2 bước, 232 đoạn MP3 (5,2 MB), 5 giọng Mỹ/Anh/Úc; Q1 chốt ở D35.
  Còn lại cho Part 3–4: hội thoại nhiều giọng trong một đoạn — dùng lại `pipeline/lib/tts.js`.
- [x] M9. Part 2 (lượt nghe ngắn) + điều chỉnh tốc độ, nghe lại.
  ✅ 2026-09-20: màn `#/listen`, tốc độ 0.75×/1×/1.25×, chỉ A/B/C không chữ, nút chọn khoá tới khi nghe hết, transcript sau khi trả lời, cache offline dần.
- [x] M10. Part 3–4: đọc trước câu hỏi có giờ, transcript đánh dấu câu chứa đáp án, bảng/biểu đơn giản bằng HTML.
  ✅ 2026-09-20 (phần chính): Part 3 = 13 bộ/39 câu, Part 4 = 10 bộ/30 câu, âm thanh nhiều giọng, xem trước câu hỏi, transcript sau khi
  trả lời. Chưa làm: bảng/biểu trong Part 3, đánh dấu câu chứa đáp án trong transcript.
- [ ] M11. Dictation câu nghe sai.

## Giai đoạn 3 — Đọc mở rộng + phân tích (tuần 5–6, ~7 giờ)
- [x] M12. Part 6, Part 7 (single/double/triple), đo thời gian từng câu.
  ✅ 2026-09-20 (nội dung + màn luyện): Part 6 = 4 bộ/16 câu, Part 7 = 15 bộ/45 câu (đơn 10 · đôi 2 · ba 3), qua kiểm định
  chéo. Part 7 nay = 20 bộ/59 câu. Đo thời gian từng câu: chưa làm.
- [ ] M13. Chạm từ trong bài đọc/transcript → lưu vào deck `my-words` kèm câu gốc.
- [ ] M14. Dashboard cơ bản: tỉ lệ đúng theo part và loại lỗi, xu hướng.

## Giai đoạn 4 — Thi thử (tuần 7–8, ~7 giờ)
- [x] M15. Chế độ theo part / theo kỹ năng / full (194 câu); chế độ luyện vs thi; bấm giờ.
  ✅ 2026-09-20: `#/exam` — đề đủ / Nghe / Đọc / từng Part, tính giờ, tự nộp khi hết giờ, kết quả + xem lại câu sai (D38).
  Đủ nội dung để dựng đúng 194 câu (đã kiểm bằng dữ liệu thật); mới đủ MỘT đề nên chưa có nhiều đề khác nhau.
- [ ] M16. Làm dở trên máy này, tiếp trên máy khác; màn xem lại sau bài.
- [ ] M21. Thi thử giống đề thật hơn (Huy gửi mô tả giao diện thi của IIG, 2026-09-20 — bảng đối chiếu đầy đủ
  ở PROGRESS.md). Chỉ áp cho màn THI THỬ; màn luyện giữ nghe lại + chỉnh tốc độ.
  - [x] Audio phát MỘT LẦN, không tua, không nghe lại ✅ 2026-09-20 (Huy chốt làm mục này trước).
  - [ ] Tự chuyển câu sau ~5 giây dừng.
  - [ ] Đánh dấu câu chưa chắc để quay lại (chỉ có tác dụng ở phần Đọc).

## Giai đoạn 5 — Hoàn thiện & mở rộng (tuần 9–10 trở đi, ~6 giờ + liên tục)
- [ ] M17. Trang ngữ pháp & từ nối (tra cứu + liên kết câu từng sai).
- [x] M18. GitHub Actions: ping Supabase chống tạm dừng ~~+ backup hằng tuần~~ (bỏ backup — D57).
  ✅ Xong 2026-09-23: `.github/workflows/keep-supabase-awake.yml`, 3 ngày/lần; chạy tay lần đầu thành công.
- [ ] M19. Deck từ vựng đời thường (NGSL / chủ đề đời sống).
- [ ] M20. Bản nhận xét điểm mạnh/yếu + cách luyện (đo đạc trước, AI viết lời khuyên trong pipeline — D44; chi tiết ở Backlog).
- Liên tục: chạy pipeline bổ sung nội dung ~30 phút/tuần khi cần.

## Tổng ước tính
~44 giờ làm việc, **khoảng 10 tuần** theo nhịp trên. MVP dùng được từ ngày 7.

## Backlog (ý tưởng chưa lên lịch)
- ~~Ước lượng "mức sẵn sàng thi"~~ → **đã làm 2026-09-20, xem D39** (điểm ước lượng 10–990 kèm khoảng dao động).
- **M20 — Bản nhận xét điểm mạnh/điểm yếu + cách luyện** (Huy đề xuất 2026-09-20). **Huy đã chốt: đường 2 —
  chạy AI trong pipeline, KHÔNG gọi API lúc app chạy (D44).** Ba đường đã cân nhắc: Huy nói "chạy API đánh giá", nhưng **ràng buộc #2 cấm gọi AI lúc app chạy** (DECISIONS.md D02:
  app phải chạy offline, không có khoá API trong frontend, không tốn tiền/hạn mức khi dùng). Ba đường đi:
  1. **Không cần AI** — app tự tính từ nhật ký: tỉ lệ đúng theo 12 dạng câu Part 5, theo kỹ năng, theo Part,
     nhịp làm bài, từ hay quên; rồi khớp với một bảng "yếu dạng này → luyện thế này" viết sẵn bằng tiếng Việt.
     Làm được ngay, offline, miễn phí, không đụng ràng buộc nào. Nhận xét sẽ đúng nhưng khô.
  2. **AI trong pipeline** — Huy bấm "Xuất dữ liệu", chạy `npm run advise` trên máy Huy, dán bản nhận xét
     (do AI viết) trở lại app. Giữ nguyên ràng buộc #2, lời văn hay hơn, nhưng phải thao tác tay mỗi lần.
  3. **Gọi API lúc chạy** — sửa ràng buộc #2. Cần một proxy giữ khoá API (Cloudflare Worker), và hạn mức
     miễn phí của Gemini là theo ngày nên có lúc app sẽ báo lỗi. Đây là đổi kiến trúc, phải ghi vào DECISIONS.md.
  **Thứ tự làm:** phần đo đạc của (1) trước vì nó là đầu vào của (2) và tự nó đã dùng được;
  rồi mới thêm bước AI viết lời khuyên. Xem D44.
- Kế hoạch hôm nay dạng nhiều nhiệm vụ nhỏ có tiến độ `3/5 xong` — cân nhắc khi làm M6. (RESEARCH.md)
- **Deck `my-words` từ các từ đã gạt** (D34): pipeline đọc file xuất dữ liệu (nút "Xuất dữ liệu"), lấy các từ
  `vocab.captured` chưa có trong deck, sinh nghĩa + ví dụ như deck TSL/BSL. Khi có, các từ đó tự thành thẻ học
  (app tra lại theo deck hiện tại nên không phải sửa nhật ký).
- Kéo thả bằng pointer events để dùng được trên cảm ứng — hiện iPhone dùng chạm-rồi-bấm (D34).
