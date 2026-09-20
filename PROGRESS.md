# PROGRESS.md — Trạng thái bàn giao giữa các phiên

> Claude cập nhật file này sau MỖI bước con. Phiên mới đọc file này trước tiên.
> Huy: cách bắt đầu phiên mới xem mục "Bắt đầu một phiên làm việc mới" trong `README.md`.

## Trạng thái hiện tại
- Giai đoạn: 1 — MVP. **M0–M4 và M6 XONG. M5 code xong, chờ Huy cấu hình Supabase.**
- **App đã dùng học thật được**: https://toeic-app.huybndc-451.workers.dev
- Repo private: https://github.com/huybndc/toeic-app — **265 test pass**.

## Dùng app thế nào (cho Huy)
1. Mở link trên (máy Mac hoặc iPhone).
2. **Chọn tầng từ trước đã** — màn chính có hàng nút `Tầng từ: Tất cả · Cơ bản · Trung cấp · Cao cấp`.
   Ở mức 850 thì **bỏ qua "Cơ bản"** (400 từ hay gặp nhất, Huy đã biết hết) — chọn **Trung cấp**
   hoặc **Cao cấp**. Không chọn thì mặc định là Tất cả và sẽ bắt đầu từ `mister`, `vacation`.
3. Bấm **Phân loại từ vựng** — lướt 20 từ một lượt, tự chấm **4 mức**:
   `1` không biết · `2` đoán được theo ngữ cảnh · `3` hiểu nghĩa nhưng quên chính tả · `4` thành thạo.
   Nghĩa hiện sẵn để đối chiếu; bấm `Space` để ẩn/hiện nếu muốn lướt nhanh.
   Chỉ mức 4 mới bị loại khỏi danh sách học.
4. Về màn chính bấm **Ôn tập từ vựng**. Xem từ → `Space` lật thẻ → tự chấm Quên/Khó/Tốt/Dễ (`1`–`4`).
   Mỗi nút ghi sẵn lần ôn kế tiếp là bao lâu nữa. Mỗi lượt tối đa 10 từ mới, ôn hết thì bấm
   "Học thêm 10 từ mới" nếu còn sức.
5. **Xem lại / tự ôn:** `Kho từ vựng` để xem các từ đã chấm và đổi mức; `Ôn chủ động` để tự kiểm tra
   một nhóm từ (nhất là nhóm "thành thạo" — quên thì từ tự quay lại danh sách học). Ở màn phân loại,
   `Backspace` lùi về từ trước, `S` để sau.
6. **Lưu ý quan trọng:** dữ liệu hiện lưu RIÊNG trên từng máy (IndexedDB), chưa đồng bộ.
   Đồng bộ Mac ↔ iPhone là M5. Học trên một máy trước để tránh lệch dữ liệu.

## Phiên 2026-09-19 (đêm) — Xem lại từ đã biết + ôn chủ động (D32) — XONG, chưa push
Huy báo: phân loại chỉ chọn được 1 trong 4, không xem lại được từ đã biết, không tự ôn được. Xem **D32**.
- **Màn phân loại:** thêm `Để sau` (phím `S`) và `← Từ trước` (phím `Backspace`) để chấm lại từ lỡ tay.
  Chấm lại = ghi thêm sự kiện mới (nhật ký append-only), không sửa sự kiện cũ.
- **Kho từ vựng** (`#/words`, nút ở màn chính): lọc theo mức, tìm (không cần gõ dấu), mở từ để xem đủ
  nội dung và đổi mức. Các dòng "Đã phân loại tới đâu" ở màn chính bấm được, nhảy thẳng vào kho.
- **Ôn chủ động** (`#/practice`): chọn nhóm (thành thạo / hay sai / đánh dấu / đang học), 10 từ mỗi lượt,
  KHÔNG đụng lịch FSRS. Riêng quên một từ "thành thạo" thì hạ xuống "đoán được" để vào lại hàng đợi học.
- Code mới: `src/logic/{word-library,practice,triage-history}.js` + 38 test; UI `src/ui/{words,practice}-screen.js`,
  `word-detail.js` (dùng chung với màn ôn thẻ). **303 test pass.**
- Đã chạy thử toàn bộ luồng bằng jsdom + dữ liệu deck thật (35 kiểm tra: đếm, để sau, lùi, bấm đôi, lọc, tìm,
  đổi mức, ôn chủ động, reset khi rời màn). CHƯA nhìn bằng mắt trên trình duyệt thật — Huy mở app kiểm giúp
  phần bố cục trên iPhone (hàng lọc, hàng nút dính đáy).

## Phiên 2026-09-19 (đêm, tiếp) — deck BSL đủ, IPA, test giao diện — XONG
- **Deck BSL đủ 1161/1161 từ**, hợp lệ theo schema. 958 từ do `gemini-flash-lite-latest` sinh (hết hạn mức ngày
  của model chính) — mẫu 10 từ đọc lên chất lượng tốt. Màn chính giờ hiện `Cao cấp (1161)`.
- **IPA: 35 → 1176/1247 (TSL) và 1080/1161 (BSL)** nhờ đổi sang Wiktionary theo lô (D33). dictionaryapi.dev đã chết.
  Hai lỗi lúc làm (header tiếng Việt, HTTP 429) đều đã có test canh.
- **Đo lại phủ sóng Part 5** (`npm run audit:coverage`): TSL+BSL phủ **37%** phương án câu `vocabulary`
  (đáp án đúng 41%), thấp hơn dự đoán 53% ở D30. Không phải deck kém: 68 phương án chỉ từ 17 câu, và phần thiếu
  chủ yếu là từ chức năng (`so`, `for`, `but`, `although`) cùng biến thể động từ (`raised`, `rising`) — loại
  không đáng học thành thẻ. Từ nội dung thật sự còn thiếu: `erratic`, `suspend`, `reconstruct`, `reconfigure`,
  `incompatible`, `inaccessible`, `inconclusive`, `interview`, `consecutively`, `frequently`.
  Bài học: nhãn `errorType=vocabulary` của AI lẫn cả câu liên từ; đo phủ sóng theo khớp chính xác từ.
- **`tests/ui-flow.test.js`** (16 test, jsdom): chạy thật các màn phân loại / kho từ / ôn chủ động — bắt được
  loại lỗi giữa logic và màn hình mà test logic thuần không thấy. **`validate:content` giờ kiểm cả BSL.**
  `audit:vocab -- --deck bsl` soi deck BSL. **343 test pass.**

## Phiên 2026-09-20 (tối) — Part 5 theo đề thật, chấm điểm, thi thử hai phần, UI hai cột — ĐANG LÀM
Huy giao 4 việc + 3 bổ sung giữa phiên. Xem **D39–D42**.
- **Part 5 đúng đề thật (D39):** một lượt = 30 câu đánh số **101–130**, chia đúng mặt cắt đề thật
  (từ loại 10 · từ vựng 10 · ngữ pháp 10 — trước đây lấy đều 12 dạng nên 2/3 lượt là ngữ pháp), xáo thứ tự,
  chốt danh sách khi bắt đầu lượt. Chỗ trống in dài `-------` như đề in. **Giấu loại kiến thức** cho tới khi
  trả lời xong. Đo nhịp từng câu (đề thật ~20 giây/câu) và tổng kết cuối lượt theo ba nhóm.
- **Chấm điểm 10–990 (D39):** `src/logic/score.js` — bảng quy đổi ETS, luôn hiện KHOẢNG + chữ "ước lượng",
  cộng thêm sai số lấy mẫu `sqrt(p(1-p)/n)` nên làm ít câu thì khoảng rộng ra. Chỉ làm một kỹ năng thì không
  bịa điểm kỹ năng kia. Điểm được lưu vào `exam.finished` để sau vẽ đường tiến bộ.
- **Thi thử đúng cấu trúc thật (D39):** đề đủ chạy **hai đồng hồ riêng** — Nghe 45 phút rồi Đọc 75 phút,
  sang phần sau KHÔNG quay lại được (trước đây gộp 194 câu vào một đồng hồ 120 phút). Câu mang **số hiệu thật**.
- **UI hai cột (D41):** `splitPane` — tài liệu bên trái, câu hỏi + phương án bên phải trên màn rộng;
  iPhone vẫn một cột. Áp cho Part 5, các bộ Part 3/4/6/7 và thi thử.
- **Chấm cả bộ một lượt (D42):** bộ nhiều câu chỉ chấm + giải thích sau khi trả lời HẾT bộ (chấm từng câu là
  lộ bài cho các câu sau); đổi đáp án thoải mái trước khi chấm.
- **Gom hàm dùng chung:** `src/ui/blocks.js` (`optionList`, `splitPane`, `noticeCard`, `confirmCard`) thay cho
  **4 bản sao** của dãy nút chọn đáp án và 2 bản sao bố cục hai cột. Quy tắc mới trong CLAUDE.md.
- **Nới hạn mức file 300 → 450 (D40)** theo yêu cầu của Huy.
- **Lỗi nội dung thật:** `p5-0079` không có chỗ trống → đã `retired`; pipeline và `validate:content` nay đều chặn.
- **735 test pass** (thêm: part5, score, ui-quiz, phases/numbering trong exam).

## Phiên 2026-09-20 (chiều) — Đủ nội dung cho đề 194 câu + thi thử đủ bộ — XONG, đã lưu
Huy giao: "đẩy nhanh các phần ngoài Part 5 để có đề 194/200". 194 = 200 trừ 6 câu Part 1 (cần ảnh).
- **Nội dung mới** (kiểm định chéo 2 model như D12; bộ chỉ đạt khi MỌI câu khớp): Part 3 = 13 bộ/39 câu · Part 4 = 10 bộ/30 câu ·
  Part 6 = 4 bộ/16 câu · Part 7 = 20 bộ/59 câu (đơn/đôi/ba) · Part 2 = 72 câu. **Dựng thử bằng dữ liệu thật ra đúng đề 194 câu**
  (25·39·30·30·16·54), 120 phút, không trùng câu. Âm thanh: 375 file MP3 (13 MB), giọng Mỹ/Anh/Úc/Canada theo giới tính người nói.
- **Kiến trúc chung** (D37): một schema `set.schema.json`, một pipeline `npm run build:sets -- --part N [--variant single|double|triple]`,
  một màn `#/sets?part=N`, thống kê theo kỹ năng Nghe/Đọc. Dashboard đổi "Part 5/Nghe Part 2" → "Đọc/Nghe".
- **Thi thử `#/exam`** (D38, M15): đề đủ / chỉ Nghe / chỉ Đọc / từng Part, tính giờ (đồng hồ, tự nộp khi hết giờ), danh sách câu,
  kết quả theo Part + xem lại câu sai. Chấm SỐ CÂU ĐÚNG, không quy đổi điểm. Ghi nhật ký một lần khi nộp.
- **Dashboard mới** (D36): ba số đầu trang thay số sự kiện thô (học tuần này/mục tiêu 90 phút · từ nhớ vững · đúng ở bài thi).
- **Lỗi thật bắt được giữa chừng** (đều có test canh): dọn âm thanh mồ côi xoá nhầm Part 3/4 · schema đòi ≥ 2 lượt nói làm Part 4 bị
  chặn khi ghi · giờ thi dài hơn đề thật khi Part 7 vượt 1 câu · đổi Part trong màn luyện làm dính lượt cũ · màu đỏ của "lỗ hổng"
  dùng nhầm cho điểm số ở màn kết quả (phát hiện bằng ảnh chụp màn hình thật).
- **Chưa thử nghe thật trên thiết bị** — xem "Bước tiếp theo" mục 1. **677 test pass** (thêm: sets, exam, set-check, ui-sets, ui-exam...).

## Phiên 2026-09-20 — M8 + M9 (luyện nghe Part 2) — XONG, đã lưu
- **M8 pipeline âm thanh:** `npm run build:listening` sinh câu hỏi-đáp Part 2 (kiểm định chéo 2 model như D12), cân bằng
  đáp án A/B/C, tạo MP3 bằng edge-tts (venv riêng `pipeline/.venv`, đã gitignore). **58/72 câu** đạt, 232 đoạn, 5,2 MB.
  Lô cuối bị dừng vì model dự phòng trả JSON hỏng → chạy lại đúng lệnh cũ là tiếp tục tới 72 (cache đã lưu).
- **M9 màn luyện nghe:** `#/listen` (nút "Luyện nghe Part 2" ở màn chính). Chỉ thấy A/B/C, nút chọn khoá tới khi nghe hết;
  tốc độ 0.75/1/1.25; xong mới hiện transcript + giải thích + gạt từ lạ. Xem **D35**.
- **Lỗi bắt được giữa chừng:** xoay đáp án làm sai lời giải thích AI viết ("đáp án B"). Sửa ở gốc bằng prompt v2 +
  bộ lọc, bản v1 bỏ đi sinh lại. Kiểm tra bản cuối: 0/58 câu nhắc chữ cái, đáp án A=20 B=19 C=19.
- `validate:content` giờ kiểm cả bộ câu nghe VÀ mọi file MP3 được tham chiếu phải tồn tại.
- **CHƯA thử nghe thật trên iPhone/Mac** — jsdom dùng bộ phát giả. Huy nghe thử: có ra tiếng khi chạm "Nghe câu này"
  không, nghe hết mới chọn được không, tốc độ 0.75× có méo giọng không, bật máy bay rồi nghe lại câu đã nghe.
- **485 test pass** (thêm: audio-player, listen, tts, prompt-listening, listening-assemble, ui-listen).

## Phiên 2026-09-19 (đêm, cuối) — Gạt từ lạ lúc làm Part 5 (D34) — XONG
Huy đề xuất: gặp từ lạ khi làm bài ngoài từ vựng thì kéo thả vào danh sách cần học, không hiện nghĩa.
- **Part 5:** mỗi từ trong câu chạm/kéo được; khay "Cần học" dưới câu hỏi. Từ trong phương án A–D chỉ gạt
  được sau khi trả lời (không lộ gợi ý). Từ đã có trong deck (kể cả dạng chia) vào thẳng hàng đợi học.
- **Kho từ vựng › Đã gạt:** cả từ trong deck lẫn từ CHƯA có trong deck (kèm số lần gặp, nút "Tra nghĩa ↗").
- Loại sự kiện mới `vocab.captured`; code mới `src/logic/capture.js`, `src/ui/capture-tray.js`.
- **391 test pass** (32 test logic gạt từ, 11 test giao diện `tests/ui-capture.test.js`, test dùng chung ở
  `tests/helpers/ui-app.js`). CHƯA thử kéo thả bằng chuột thật trên trình duyệt — jsdom giả lập sự kiện `drop`.

## Mục tiêu phiên này: 3 milestone — ĐÃ ĐẠT
- ✅ **M4**: 200 câu Part 5 (phủ đều 12 loại kiến thức, 100% qua kiểm định 2 bước) + màn luyện.
- ✅ **M6**: PWA cài được, học offline được, phiên "15 phút hôm nay", nút xuất dữ liệu.
- ✅ **M5 (code)**: schema SQL + RLS, đăng nhập OTP, đồng bộ hai chiều. Chờ Huy cấu hình để chạy thật.

## LƯU Ý KHI KIỂM TRA LỖI SAU KHI DEPLOY
Màn chính hiện số hiệu bản build ở dòng cuối (`bản 2026-09-19 12:19`). Trước khi kết luận
"lỗi chưa sửa", hãy đối chiếu số này. Nếu cũ hơn lần build mới nhất thì đang xem bản cũ trong
bộ nhớ đệm của service worker → tải lại trang (Mac: Cmd+Shift+R; iPhone: đóng hẳn app rồi mở lại).
App đã có cơ chế tự tải lại khi thấy bản mới, nhưng lần đầu ngay sau khi deploy vẫn có thể lệch.

## VIỆC CỦA HUY — kích hoạt đồng bộ (M5), khoảng 15 phút

Đăng nhập bằng **email + mật khẩu** (D25c — đã đổi từ OTP vì Supabase chặn sửa mẫu email
khi chưa có SMTP riêng).

1. supabase.com → New project. Name `toeic-app`, Region **Singapore**, gói Free.
   Lưu lại Database Password nó sinh ra.
2. **SQL Editor** → New query → dán toàn bộ `supabase/schema.sql` → **Run**.
   Kết quả cuối phải là `rowsecurity = true` cho CẢ HAI bảng. Nếu không, DỪNG LẠI.
3. **Authentication → Sign In / Providers → Email**:
   - Công tắc **Email** (provider) phải **BẬT**. Tắt nó thì API trả `Email logins are disabled`.
   - Chỉ tắt riêng **Confirm email** bên trong. Bấm Save.
4. **Project Settings → API**: copy **Project URL** và **anon public** key.
   KHÔNG dùng `service_role` key (ràng buộc #3).
5. Thêm vào `.env`: `VITE_SUPABASE_URL=...` và `VITE_SUPABASE_ANON_KEY=...`
6. Cloudflare → toeic-app → Settings → Variables: thêm đúng 2 biến đó → deploy lại.
7. Mở app → **Đồng bộ giữa các máy** → nhập email + mật khẩu (từ 8 ký tự) →
   **Lần đầu dùng? Tạo tài khoản** → sau đó bấm **Đồng bộ ngay**.
8. Máy thứ hai: cùng email + mật khẩu đó, bấm **Đăng nhập** rồi **Đồng bộ ngay**.

## Đã xong trong phiên 2026-09-19
- **M1**: Vite + Vitest, git, GitHub private, Cloudflare Workers tự deploy mỗi lần push.
- **M2**: schema vocab/event; pipeline sinh 1243/1250 từ TSL 1.2 (nghĩa Việt, 2 ví dụ song ngữ,
  collocation, đồng/trái nghĩa, note bẫy TOEIC); validator; `npm run audit:vocab`.
  Chỉ 35/1243 từ có IPA vì API từ điển hỏng — chạy lại pipeline sẽ tự tra tiếp.
- **M3**: FSRS bọc sau interface riêng; reducer gấp nhật ký sự kiện; IndexedDB append-only;
  router hash; màn tổng quan / phân loại / ôn thẻ / từ hay sai.
- **RESEARCH.md**: khảo sát TOEIC Lab, GenLang, Test-English, Anki → 6 điểm UX đã áp dụng.
- **CLAUDE.md**: thêm 6 quy tắc kỹ thuật bắt buộc + checklist cuối mỗi bước con + quy tắc làm song song.

## Phiên 2026-09-19 (buổi tối) — 3 việc Huy giao

**Việc 1 — lỗi bộ đếm (XONG, commit d6a3b1d).** Huy phát hiện đúng: lỗi *universal*, có ở cả 3 màn.
- Gốc chung: lấy `queue.length` làm "số việc còn lại". Mọi hàng đợi đều là **cửa sổ trượt** —
  cắt N mục từ kho lớn hơn, làm xong một mục thì mục kế lấp vào ngay → con số không bao giờ giảm.
  Phân loại kẹt ở 20 (deck còn 1243 từ), ôn thẻ kẹt ở 10 (maxNew luôn được lấp đầy).
- Sửa: `src/logic/round.js` dùng chung + `countUntriaged`/`reviewCounts` (đếm không bị cắt).
  Màn phân loại và màn ôn thẻ nay có khái niệm "lượt" rõ ràng như màn Part 5.
- Đã ghi thành **quy tắc bắt buộc số 7** trong CLAUDE.md. Đã kiểm tra thật trên trình duyệt:
  20→19→18→17 và 1243→1240; màn ôn 2→1.

**Việc 2 — phân loại 4 mức + hiện nghĩa (XONG, commit cc11b37).** Xem **D29**.
- 4 mức: không biết / đoán được theo ngữ cảnh / quên chính tả / thành thạo. Chỉ mức cuối bị loại
  khỏi hàng đợi; từ chưa biết gì được học trước (`studyPriority`).
- Nghĩa + 1 ví dụ hiện sẵn khi phân loại, tắt được, lưu theo từng máy.
- Phần khó nhất là **tương thích ngược**: nhật ký append-only (ràng buộc #5) nên sự kiện cũ
  `{known}` phải đọc đúng mãi mãi, và sự kiện mới vẫn ghi kèm `known` để máy còn chạy bản app cũ
  trong cache service worker không xếp nhầm từ. Có 8 test canh riêng chỗ này.

**Việc 3 — cân đối từ vựng theo Part 5 (2/3, xem D30, D30b, D31).**
- **Đo được gì:** trên 200 câu Part 5 đã sinh, phương án của câu `errorType=vocabulary` chỉ có
  **32% nằm trong deck**. `amend`, `abolish`, `enforce`, `inadequate`, `erratic` — không có từ nào.
  Nguyên nhân: TSL 1.2 là danh sách **bổ sung cho NGSL**, 1250 từ tầng nền cho mức 500–700 điểm.
  Kiểm chứng: TSL ∩ NGSL = 0 từ; `interview`, `raise`, `frequent` không nằm trong TSL.
- **Xong (commit 2c4f3d0):** phân tầng cơ bản/trung cấp/cao cấp, suy ra từ `rank`+`deck` lúc chạy
  nên không đụng file nội dung đã phát hành (D16). Huy chọn tầng ở màn chính.
- **Xong (commit b3c0078):** pipeline sinh được deck thứ hai; app tải nhiều deck, thiếu deck phụ
  thì bỏ qua chứ không sập.
- **XONG:** pipeline sinh đủ **1161 từ BSL** (xem mục phiên đêm bên dưới).
- **Đã sửa quyết định giữa chừng:** bản đầu của D30 định lấy cả NAWL. Đo lại thì NAWL là từ vựng
  học thuật (`electron`, `membrane`, `chemotherapy`) và chỉ thêm đúng **1 từ** vào phủ sóng Part 5
  → bỏ NAWL. Lý do ghi ở **D30b** để lần sau đo giá trị thật trước, đừng lấy số lượng làm bằng chứng.

## Không còn tiến trình nền nào (đã kiểm tra bằng `scripts/check_processes.sh`)

## Bước tiếp theo (cụ thể)

1. **Huy thử trên máy thật** (mọi thứ dưới đây mới chạy bằng jsdom + bộ phát âm thanh GIẢ, chưa nghe thử thật):
   - iPhone: chạm "Nghe" ở Part 2/3/4 có ra tiếng không; nghe hết mới chọn được (Part 2); bật máy bay rồi nghe lại
     câu đã nghe; tốc độ 0.75× có méo giọng không.
   - Thi thử `#/exam` → "Riêng Part 6" (ngắn nhất, 12 phút) để thử cả vòng: làm → danh sách câu → nộp → xem lại câu sai.
   - Kéo thả từ lạ vào khay "Cần học" trên Mac; chạm-rồi-bấm trên iPhone (D34).
   - M5: đăng nhập + "Đồng bộ ngay" trên hai máy (Supabase và biến môi trường Cloudflare đã có sẵn, đã kiểm tra).
2. **Đa dạng đề thi thử:** Part 3 / 4 / 6 mới đủ ĐÚNG MỘT đề (13 / 10 / 4 bộ) nên mỗi lần "Đề đủ" chỉ đổi thứ tự bộ, không đổi
   nội dung; Part 7 có 20 bộ (59 câu, dư ~5); Part 2 (72) và Part 5 (200) đa dạng hơn. Muốn 3 đề khác nhau: sinh thêm gấp ~3 lần
   (`npm run build:sets -- --part N --target M`, chạy các Part NỐI TIẾP không song song vì cùng hạn mức AI).
3. **M16:** làm dở rồi tiếp trên máy khác — hiện thoát giữa bài thi là mất bài (D38).
4. M10 còn dở: bảng/biểu trong Part 3, đánh dấu câu chứa đáp án trong transcript. M11 (dictation câu nghe sai) chưa làm.
5. Sinh bù: 3 từ TSL còn thiếu và ~70 từ chưa có IPA — `npm run build:vocab` (chạy đơn lẻ, xem D33).
6. M18 (GitHub Actions ping Supabase + sao lưu hằng tuần) cần Huy tạo secret trên GitHub.

## Vướng mắc / câu hỏi mở
- Q1 (Giai đoạn 2): audio để chung repo hay bucket riêng — chưa tới lúc quyết.
- File deck 1,4 MB (gzip ~310 KB); deck BSL thêm ~1,6 MB nữa (đã có IPA). Đã tách thành file riêng theo deck
  và tải song song (`loadAllVocabDecks`), nhưng vẫn tải CẢ HAI ngay lúc mở app. Nếu thấy chậm trên
  iPhone thì bước sau là chỉ tải deck của tầng đang chọn.
- ~~API từ điển chập chờn~~ → đã đổi sang Wiktionary (D33).

## Giờ thực tế so với ước tính
| Milestone | Ước tính | Thực tế | Ghi chú |
|---|---|---|---|
| M0 (công cụ) | ~1–1,5h | ~0h | Node/git đã có sẵn |
| M1 | ~2h | ~35 phút | Credential GitHub sẵn trong Keychain |
| M2 | ~2h | ~2h15 | Phát sinh 3 lỗi mạng (timeout, quota, IPA chậm) |
| M3 | ~2h | ~1h | Làm song song lúc pipeline chạy nền |

## Nhật ký phiên (mới nhất ở trên)
- 2026-09-19 (tối) — Huy báo 3 việc. Lỗi bộ đếm hoá ra có ở cả 3 màn → thành quy tắc bắt buộc #7.
  Phân loại 4 mức (D29). Đo ra deck TSL lệch hẳn so với Part 5 → thêm deck BSL (D30) + phân tầng (D31).
  265 test pass. Sửa thêm lỗi `check_processes.sh` bỏ sót pipeline chạy bằng đường dẫn tương đối —
  script báo "sạch" trong khi job vẫn sống, đúng thứ nó sinh ra để chặn.
  Dừng phiên theo yêu cầu của Huy; pipeline BSL còn chạy nền ở 53/1161 từ.
- 2026-09-19 — **MVP học được rồi**: M2 + M3 xong, deploy chạy thật, 133 test pass.
  Rút 6 quy tắc kỹ thuật từ sự cố thật vào CLAUDE.md. Khảo sát đối thủ → RESEARCH.md.
- 2026-09-19 — M1 xong: deploy Cloudflare, repo private, 7 test.
- 2026-09-19 — Huy duyệt PLAN, giao toàn quyền quyết định.
- 2026-09-19 — Bộ bàn giao được tạo từ claude.ai.
