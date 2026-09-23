# PROGRESS.md — Trạng thái bàn giao giữa các phiên

> Claude cập nhật file này sau MỖI bước con. Phiên mới đọc file này trước tiên.
> Huy: cách bắt đầu phiên mới xem mục "Bắt đầu một phiên làm việc mới" trong \`README.md\`.

## Trạng thái hiện tại
- **Phạm vi đã chốt (D63): app đủ dùng — chỉ còn THÊM NỘI DUNG.** M0–M6, M8–M13, M15, M18, M21 xong; M16 bỏ; M10 phụ/M14/M17/M19/M20 chỉ làm khi Huy yêu cầu. M7 chờ Huy học thật.
- **App đã dùng học thật được**: https://toeic-app.huybndc-451.workers.dev
- Repo private: https://github.com/huybndc/toeic-app — **896 test pass**.

## Dùng app thế nào (cho Huy)
1. Mở link trên (máy Mac hoặc iPhone).
2. **Chọn tầng từ trước đã** — màn chính có hàng nút \`Tầng từ: Tất cả · Cơ bản · Trung cấp · Cao cấp\`.
   Ở mức 850 thì **bỏ qua "Cơ bản"** (400 từ hay gặp nhất, Huy đã biết hết) — chọn **Trung cấp**
   hoặc **Cao cấp**. Không chọn thì mặc định là Tất cả — trộn đều mọi tầng và cụm từ (D66).
3. Bấm **Phân loại từ vựng** — lướt 20 thẻ một lượt (từ + cụm, xáo ngẫu nhiên), tự chấm **4 mức**:
   \`1\` không biết · \`2\` đoán được theo ngữ cảnh · \`3\` hiểu nghĩa nhưng quên chính tả · \`4\` thành thạo.
   Nghĩa hiện sẵn để đối chiếu; bấm \`Space\` để ẩn/hiện nếu muốn lướt nhanh.
   Chỉ mức 4 mới bị loại khỏi danh sách học.
4. Về màn chính bấm **Ôn tập từ vựng**. Xem từ → **chọn nghĩa đúng** trong 4 lựa chọn (\`1\`–\`4\`); thẻ cụm thì
   xem nghĩa → chọn đúng cụm. Chọn xong mới hiện giải thích + "ôn lại sau N ngày"; \`Space\` sang thẻ kế (D66).
   Mỗi lượt tối đa 10 từ mới, ôn hết thì bấm
   "Học thêm 10 từ mới" nếu còn sức.
5. **Xem lại / tự ôn:** \`Kho từ vựng\` để xem các từ đã chấm và đổi mức; \`Ôn chủ động\` để tự kiểm tra
   một nhóm từ (nhất là nhóm "thành thạo" — quên thì từ tự quay lại danh sách học). Ở màn phân loại,
   \`Backspace\` lùi về từ trước, \`S\` để sau.
6. **Đồng bộ tự động** (D55) khi mở app, khi rời app và 15 giây sau khi học. Mục **Sao lưu** hiện lần chạy
   gần nhất; muốn chắc thì bấm **Đồng bộ ngay**. Mỗi máy chỉ cần đăng nhập một lần.

## Phiên 2026-09-23 (tối, tiếp) — chốt phạm vi (D63) · sửa pipeline (D62) · M21 xong · nội dung CHỜ Gemini key

**1. Huy chốt phạm vi (D63):** app đủ dùng; chỉ còn thêm nội dung + M21. M16 bỏ (luôn làm trọn một lần ngồi).

**2. Sửa pipeline trước khi sinh nội dung (D62) — lỗi suýt xảy ra.** Pipeline ghi file đầu ra CHỈ từ `pipeline/.cache/`
(gitignore, máy này không có) và đánh id theo `cache.size()+1` → chạy sẽ đánh lại id từ `p5-0001`, ghi đè 200 câu cũ
(nhật ký học trỏ nhầm câu) và xoá MP3 của câu nghe cũ. Nay `openWorkCache` nạp file phát hành trước (bản phát hành thắng),
mục đã phát hành giữ nguyên lúc ghi, `nextId` = số lớn nhất + 1. Đã kiểm: chạy lại cả 6 file → giống từng byte.

**3. Sinh nội dung (đang làm dở, chạy tiếp được bất cứ lúc nào).** Huy đã điền `GEMINI_API_KEY` (lần đầu dán nhầm vào
`~/.env` vì terminal đứng ở thư mục nhà — nhớ `pwd` trước khi `nano .env`). Máy này nay đã có `pipeline/.cache/` và
edge-tts (`pipeline/.venv`).
- **Part 5: 200 → 256 câu** (dừng tay ở 256 để chừa hạn mức cho Part 2). Tỉ lệ đạt ~30%: model kiểm định loại câu
  "quá dễ" — đúng thiết kế; các dạng đang tới lượt (danh động từ, giới từ) khó ra câu không lộ.
- **Part 2: 72 → 102 câu** + 120 MP3 (2,2 MB). Dừng vì Gemini báo **503 "high demand"** — thử lại hết lượt mất ~20 phút
  mỗi lần, KHÔNG phải lỗi code. Lần kẹt đầu tưởng do lô to (24 câu) nên đã hạ lô xuống 12.
- **Lỗi bắt được khi đọc thử câu mới (D64):** 200 câu Part 5 cũ có đáp án A = 67% (D chỉ 5 câu). Câu mới nay được cân
  bằng lúc ghi file. Kèm sửa bộ lọc "lời giải nhắc chữ cái": bắt đủ A–D, và hết bắt nhầm "câu dễ"/"câu bị động" (`\b`
  chỉ hiểu chữ ASCII) — lỗi này làm bản thảo Part 2/bộ đề bị loại oan từ trước tới nay.
- **Chạy tiếp** (tiếp đúng chỗ dở; log ghi thẳng ra file):
```bash
node --env-file=.env pipeline/build-questions.js --target 400 > pipeline/.cache/run-part5.log 2>&1
node --env-file=.env pipeline/build-listening.js --target 150 --batch-size 12 > pipeline/.cache/run-part2.log 2>&1
```
  Sau đó: `npm run validate:content` + `npm test`, đọc thử vài câu mới, commit `content:`. Rồi tới các bộ:
  `build-sets.js --part 3|4|6|7 --target …` (Part 7 thêm `--variant single|double|triple`).
- ~~Chờ Huy quyết: xáo phương án lúc hiện câu~~ → Huy đồng ý, đã làm (D65, mục 5).

**4. M21 xong.** Thi thử phần Nghe: nghe xong đếm ngược 5 giây (bộ Part 3/4: 5 giây × số câu) rồi tự sang câu sau và PHÁT
LUÔN, như băng đề thật. Phần Đọc: nút ⚐ đánh dấu câu chưa chắc, ⚑ hiện trên danh sách câu, hộp nộp bài nhắc lại.
Đã chạy thật với âm thanh: câu 7 → đếm 5→1 → câu 8 tự phát → câu 9, không lỗi. **Huy thử trên iPhone** xem câu kế có tự
phát không (Safari chỉ cho phát tiếp trên cùng phần tử Audio đã được chạm mở — thiết kế bộ phát dựa đúng vào điều đó).
8 test mới; **848 test pass**.

**5. Xáo trộn (D65) — Huy yêu cầu 2026-09-24.** Phương án xáo mỗi lần câu hiện ra (Part 2, 5, bộ đề, thi thử), nhật ký
vẫn ghi chữ cái gốc → hết lệch "đáp án A" của 200 câu cũ mà không sửa nội dung. Từ vựng: phân loại trộn từ + cụm từ,
thứ tự ngẫu nhiên mỗi lượt; ôn tập xen từ mới giữa thẻ đến hạn. Đã xem thật: phân loại ra `enlargement, usage, fog…,
comparable to [cụm]`, vào lại ra thứ tự khác; cùng câu Part 5 vào hai lần thì `inadequate` ở A rồi ở D. **882 test pass.**

**6. Ôn từ vựng bằng trắc nghiệm, lịch tính bằng ngày, trộn đều (D66) — Huy yêu cầu 2026-09-24.** Huy báo: chưa thấy
xáo, Ôn tập không có cụm, khoảng ôn 1–5–10 phút vô lý, muốn chọn đáp án thay tự chấm. Kiểm trước: bản deploy ĐÃ có
code D65 (tìm thấy chữ mới trong bundle) — lý do thật là Ôn tập chỉ gồm thẻ đã phân loại, và xáo chung làm cụm chỉ ~6%.
Đã làm: FSRS bỏ bước phút (sai → 1 ngày, đúng → 3 → 14 → 57 ngày); Ôn tập + Ôn chủ động thành trắc nghiệm 4 lựa chọn
(từ → nghĩa Việt; cụm → chọn đúng cụm, có dạng sai hay mắc); phân loại trộn ĐỀU tầng + cụm (12 thẻ thật ra 3 cụm).
Đã xem thật trên trình duyệt: thẻ cụm "phương án thay thế cho" → `an alternative of` / `an alternative to`…, chọn xong
hiện giải thích + "ôn lại sau 1 ngày". **896 test pass.**

### Bước tiếp theo
- **Claude:** chạy tiếp nội dung (mục 3) khi Gemini bớt quá tải — lần gần nhất (01:20) `gemini-3.5-flash` hết hạn mức
  ngày, `gemini-3.1-flash-lite` báo 503. Chạy lại lệnh ở mục 3 là tiếp đúng chỗ dở.
- **Huy:** thử nghe chép + thi thử phần Nghe trên iPhone; kiểm tự đồng bộ trên bản deploy; học thật để đóng M7.
- **Claude:** chỉ còn việc nội dung (D63). Không tự mở milestone mới.

## Phiên 2026-09-23 (19:30) — M13 xong (câu gốc khi gạt từ) · M11 xong (nghe chép)

**1. M13 — câu gốc.** Trước đây `vocab.captured` chỉ có `questionId`; ở bộ Part 3/4/6/7 đó là id CẢ BỘ nên không suy ra được
từ nằm ở câu nào. Nay:
- `sentenceAround()` (`logic/capture.js`) lấy đúng câu chứa từ: cắt ở `. ! ?` + chữ không-thường, và ở xuống dòng; không cắt
  ở "Ms. Lee", "9 a.m. on". Đoạn không có dấu câu mà dài hơn 300 ký tự thì cắt quanh từ, có `…`.
  (Đã sửa một lần: trần ban đầu 150 ký tự cắt mất đuôi câu Part 5 thật dài 170 ký tự — thấy khi chạy trình duyệt.)
- Chạm → "Cần học" và kéo thả (câu đi kèm trong `dataTransfer`, kiểu `application/x-toeic-sentence`) đều ghi `payload.sentence`.
  Gạt từ trong PHƯƠNG ÁN (chip sau khi trả lời) thì không có câu — đúng, vì từ đó không nằm trong câu hỏi.
- Hiện ở: Kho từ vựng › Đã gạt (dòng từ chưa có trong bộ), bảng chi tiết từ, **mặt sau thẻ ôn/ôn chủ động/tra từ**
  ("Câu bạn đã gặp", 2 câu mới nhất, gom cả biến thể raised/raising → raise).
- Sự kiện cũ không có câu vẫn đọc bình thường (không hiện mục đó). 9 test mới; **815 test pass**.
- Đã xem thật trên trình duyệt (nền tối): Part 7 "repair" → đúng câu; "request" ở dòng Subject → đúng dòng đó.
- Nhận xét phụ (không sửa, đúng thiết kế): các từ phổ thông như `schedule`, `project`, `ensure` báo "chưa có trong bộ từ"
  vì bộ TSL/BSL chỉ gồm từ NGOÀI NGSL — sẽ có khi làm M19 (deck NGSL).

**2. M11 — nghe chép (D61).** `logic/dictation.js` (chấm theo từ + chọn đoạn) · `ui/dictation-screen.js` (`#/dictation`).
- Mục Bài thi › nhóm Nghe có nút **"Nghe chép câu nghe sai"** — chỉ hiện khi đã sai ít nhất một câu nghe.
- Luồng: ▶ Nghe (con trỏ vào luôn ô gõ) → gõ → `Enter` chấm → xem chữ gạch ngang (gõ sai/thừa) / gạch dưới (bỏ lỡ) + chữ gốc
  gạt từ được → `Space` sang đoạn kế và PHÁT LUÔN. Đang gõ thì `Esc` = nghe lại. Lượt 8 đoạn.
- Chữ đang gõ không mất khi màn vẽ lại (đổi tốc độ, đồng bộ kéo sự kiện về) — có test, đã thử gỡ chốt thì test đỏ.
- 25 test mới; **840 test pass**. Đã chạy thật trên trình duyệt với âm thanh thật (nền tối, 560px): phát, Esc, Enter, Space
  đều đúng, không lỗi console.
- Ô nhập toàn app lên 16px: dưới 16px iPhone tự phóng to trang khi chạm vào ô (ô Tìm từ cũng đang bị).

### Bước tiếp theo
- **Huy thử nghe chép:** làm vài câu Part 2 (cố ý sai một câu nếu cần) → Bài thi › Nghe chép câu nghe sai. Nhớ đối chiếu số
  hiệu bản build sau deploy.
- Huy: kiểm tự đồng bộ trên bản deploy + học thật 1 phiên Mac + 1 phiên iPhone để đóng M7 (xem phiên 18:40 bên dưới).
- **Claude tự làm tiếp** (theo giá trị): M21 phần còn lại (đánh dấu câu chưa chắc ở phần Đọc của thi thử; tự chuyển câu
  sau ~5 giây ở phần Nghe) → M10 phần còn lại (đánh dấu câu chứa đáp án trong transcript Part 3/4) → M16.

## Phiên 2026-09-23 (18:40) — Supabase chạy thật · tự đồng bộ · M18 · người mới · đánh bóng giao diện (A)

Huy đã cấu hình Supabase xong, đăng nhập và đồng bộ được trên bản deploy (524 sự kiện ở Mac).

**1. Merge nhánh `claude/exciting-allen-8406f0`** (checklist Supabase A–H viết lại) — merge sạch.

**2. Tự kiểm RLS từ bên ngoài** — dùng đúng URL + publishable key lấy từ bundle JS của bản deploy
(key này vốn công khai), gọi thẳng REST API mà KHÔNG đăng nhập:
- đọc `events` → `[]`, đọc `settings` → `[]` (có dữ liệu thật của Huy mà không thấy dòng nào);
- ghi một dòng giả vào `events` → `42501 new row violates row-level security policy`.
→ Nửa sau tiêu chí M5 "người khác không đọc được dữ liệu" đạt. **PLAN.md: M5 → [x].**

**3. Sửa lỗi đồng bộ sẽ âm thầm mất dữ liệu khi quá 1000 sự kiện.** `syncEvents` đọc cả bảng bằng MỘT
lệnh `select`, mà Supabase **trả tối đa 1000 dòng/request và không báo lỗi khi cắt** (Settings → API →
Max rows). Hiện 524 sự kiện nên chưa lộ; vài tuần nữa vượt 1000 thì máy kia không bao giờ nhận được phần
dư, còn màn hình vẫn báo "Đồng bộ xong". Nay đọc theo trang (`order(created_at, id)` + `range`), dừng
khi trang RỖNG (đúng cả khi Max rows bị chỉnh nhỏ hơn 1000). 2 test mới ở `tests/sync.test.js` với máy
chủ giả cắt ở 1000 và 300 dòng — đã kiểm test ĐỎ trên code cũ. Truy vấn mới đã thử trên Supabase thật.

**4. Máy này chưa có `node_modules`** (repo mới chép sang) → đã `npm ci`. Huy đã tự tạo `.env` bằng `nano`
(có 2 biến Supabase). Bản deploy vẫn lấy biến từ Cloudflare, không từ `.env`.

**5. Tự đồng bộ (D55) — Huy đồng ý.** `startAutoSync(store)` ở `src/data/sync.js`, gắn ở `src/main.js`
(không ở `mountApp` → test giao diện không gọi mạng). Chạy lúc mở app, lúc quay lại/rời app, lúc có mạng
lại, và 15 giây sau sự kiện cuối. Màn Đồng bộ hiện lần chạy gần nhất. 3 test mới (hẹn giờ giả): đồng bộ
ngay khi mở · chờ yên 15 giây, vẽ lại màn không tính · chưa đăng nhập thì không gọi máy chủ. Đã kiểm test
đỏ khi bỏ chốt "sự kiện vừa kéo về không hẹn đồng bộ". Chạy thử trình duyệt với `.env` thật: không lỗi
console, chưa đăng nhập thì không có request nào tới Supabase. **806 test pass.**
**CHƯA kiểm được nhánh ĐÃ đăng nhập trên trình duyệt** (cần mật khẩu của Huy) — Huy kiểm ở bước dưới.

**6. M18 — ping Supabase chống tạm dừng.** `.github/workflows/keep-supabase-awake.yml`: 3 ngày/lần gọi
`events?select=id&limit=1` bằng publishable key (RLS trả rỗng nhưng DB vẫn chạy truy vấn = có hoạt động);
lỗi thì job đỏ → GitHub gửi email. Đã chạy thử đúng lệnh curl ở máy với `.env` thật: trả `[]`, exit 0.
Cần 2 secret — Huy tự đặt (bước học về secret), đọc thẳng từ `.env` để khỏi dán tay:
```bash
grep '^VITE_SUPABASE_URL=' .env | cut -d= -f2- | gh secret set SUPABASE_URL
grep '^VITE_SUPABASE_ANON_KEY=' .env | cut -d= -f2- | gh secret set SUPABASE_PUBLISHABLE_KEY
gh workflow run keep-supabase-awake.yml
gh run list --workflow keep-supabase-awake.yml --limit 1
```

**7. Đăng ký tài khoản để MỞ (D56)** — Huy chia sẻ link cho bạn bè; bước H bỏ. Backup tự động bỏ (D57).
Huy đã đặt 2 secret, workflow ping chạy tay lần đầu **thành công** (Supabase trả `[]`). **M18 → [x].**

**8. M7 — nhìn app bằng mắt người mới** (bạn bè của Huy, D56). Xoá dữ liệu tab thử, chạy ở 375×812:
- Nút "Bắt đầu" của người mới nay sang **màn Từ vựng** (có hàng "Tầng từ") thay vì vào thẳng phân loại —
  trước đây ai cũng bắt đầu từ `mister`, `vacation`, người 800+ dễ tưởng app không hợp mình.
- Màn Sao lưu khi chưa đăng nhập: một dòng nói tiến độ đang nằm ở đâu, Safari xoá sau 7 ngày không mở, cách
  "Thêm vào MH chính".
- Bỏ các câu chỉ đúng với Huy: "cả 3 máy", "Mac ↔ iPhone", "từ Huy tự đánh dấu".
- README: mục **"Gửi app cho bạn bè"** — tin nhắn soạn sẵn để copy (repo private, bạn bè không đọc được README).

**9. Bỏ bộ chọn "Part 5 mỗi lượt 10/20/30" (D58)** theo yêu cầu Huy — lượt cố định 30 câu. Kèm sửa ô "Hôm nay"
báo Part 5 là 20 câu trong khi lượt thật 30 (nay mọi chỗ dùng `PART5_COUNT`).

**10. Đánh bóng giao diện — phần A (D59).** Huy giao: "làm gì tiếp thì tự đánh giá rồi triển khai luôn, không cần hỏi".
- Icon SVG thay ◔ Aa ✎ ⇅ 🌙 👁 ⬇ (hàm `icon()` ở `blocks.js`, dùng ở thanh điều hướng, nút sáng/tối, phân loại, xuất dữ liệu).
- Đổi màn: mờ dần 180ms (View Transitions), về đầu trang (trước đây cuộn xuống cuối màn chính rồi bấm tab thì màn
  mới mở giữa chừng), focus về tiêu đề mới. Trang ẩn thì trình duyệt bỏ hiệu ứng — đã chặn lỗi "Uncaught" thừa.
- `index.html`: màn chờ "Đang tải bài học…", đặt sáng/tối trước lần vẽ đầu (hết nháy trắng), **`apple-touch-icon`**
  (trước đây thêm ra MH chính iPhone thì icon là ảnh chụp trang), `theme-color` sáng/tối.
- Sửa: menu trái ở nền tối có mảng sáng chói (màu viết cứng) · `toggleTheme` văng lỗi ở duyệt riêng tư Safari.
- Đã kiểm: 802 test pass (test canh sẵn lỗi "mở app không có thanh điều hướng" — đã thử đưa lỗi vào, 2 test đỏ),
  trình duyệt 375×812 + 1280×800 sáng/tối, không lỗi console, build có đủ thẻ meta.

**11. Phân tích bằng tiếng Việt (D60)** — Huy: "phần phân tích toàn tiếng Anh mình không hiểu".
- 37 dạng câu có tên Việt (`ERROR_TYPE_LABEL`), dùng ở bảng lỗ hổng (màn chính + Bài thi), thẻ dạng câu Part 5, Part 2.
- 40 lời giải/bẫy Part 7 tiếng Anh (bộ p7-0001…0010, model flash-lite bỏ qua lời dặn) → đã dịch. Pipeline nay loại
  câu có lời giải không phải tiếng Việt ở cả 3 bộ sinh; 2 test mới canh (đã thử đỏ trên nội dung cũ).
- Bỏ chữ "deck" và mã `toeic-tsl + toeic-bsl` khỏi màn hình. **806 test pass**, `validate:content` sạch.

**12. Chế độ tối — sửa các chỗ còn chói/tàng hình.** Quét CSS tìm màu viết cứng: phương án đang chọn, dòng transcript
đang phát, ô "làm dở" ở bảng câu thi thử đều là nền sáng cố định → nay dùng biến (`--good-soft`, `--hard-soft` mới).
Biểu đồ chưa từng có bản tối: mức "Thành thạo" `#0d366b` trên nền `#161616` gần như tàng hình → thêm bộ màu tối, đã
chạy `validate_palette` (skill dataviz) cho cả 3 màu chuỗi lẫn thang 4 mức, qua hết. Đã xem thật ở 375×812.

### Bước tiếp theo
- **Đánh bóng phần B — Claude đã tự cân nhắc lại và HOÃN:** thang khoảng cách/cỡ chữ thống nhất đụng toàn bộ CSS, rủi
  ro vỡ cao mà người dùng gần như không thấy khác. Hiệu ứng khi chọn đáp án thì sẽ PHÁT LẠI mỗi lần màn vẽ lại
  (vd chạm gạt từ sau khi trả lời) — phiền hơn là đẹp. Làm khi có lý do cụ thể.
- **Phiên sau, Claude tự làm theo thứ tự** (Huy giao tự chọn — memory `autonomy-next-steps`):
  1. **Chốt M13:** gạt từ đã có ở Part 5, nghe Part 2, bộ đề 3/4/6/7, transcript (`capture-tray.js`). Kiểm xem sự kiện
     `vocab.captured` có lưu câu gốc chưa; có rồi thì đánh dấu M13 phần app xong, phần deck `my-words` (pipeline sinh
     nghĩa) để Backlog như đã ghi.
  2. **M11 — nghe chép (dictation) câu nghe sai:** tận dụng MP3 + transcript sẵn có; chấm theo từ, bỏ qua hoa/thường
     và dấu câu. Logic chấm viết ở `src/logic/` + test trước, rồi mới nối màn.
- **Huy kiểm tự đồng bộ trên bản deploy** (nhớ đối chiếu số hiệu bản build): Mac học 1 thẻ → chờ 20 giây →
  mở app trên iPhone (đăng nhập cùng tài khoản nếu chưa) → vào **Sao lưu**: dòng "Lần gần nhất … nhận về 1".
- **M7 xong khi** Huy học thật 1 phiên trên Mac + 1 phiên trên iPhone. Gặp lỗi gì thì báo (kèm số hiệu bản build).
- Sau M7, theo PLAN: M10 còn dở (bảng/biểu Part 3, đánh dấu câu chứa đáp án) · M11 dictation · M13 chạm từ lưu deck.

## Phiên 2026-09-24 — Gợi ý theo chỗ yếu · học cụm từ · gộp nhóm (D52–D54) — XONG, ĐÃ PUSH

**1. Nút "hôm nay" → HAI lựa chọn, chọn theo chỗ đang yếu (D52).** Trước đây nút trỏ cứng vào ôn thẻ
rồi Part 5, bất kể đang hổng phần nào.
- `logic/suggest.js` mới: bảng điểm `NEED` 0–100 tra được. Thẻ quá hạn tăng theo SỐ LƯỢNG (3 thẻ = việc
  vặt; 25 thẻ = vượt mọi thứ, theo R6 + D03) · phần **chưa làm câu nào** = 70 (hổng lớn nhất) · làm dưới
  5 câu = 55 "chưa đủ kết luận" · đủ số liệu thì càng sai càng cao.
- Mỗi lựa chọn kèm **lý do bằng chữ**: *"vì chưa làm câu nào — chỗ hổng lớn nhất"*.
- **Hai lựa chọn bắt buộc KHÁC LOẠI** (từ vựng / cụm từ / đọc / nghe): một lựa chọn duy nhất mà không hợp
  hoàn cảnh là mất cả phiên — đang ngồi chỗ ồn thì không luyện nghe được.
- **Xoá `logic/today.js`** (`planToday`/`planTarget`) — không còn ai dùng. 14 test mới cho `suggest.js`.

**2. Cụm từ học được như từ vựng (D53).** Huy: "collocation chỉ là liệt kê chứ không có chức năng học".
- **Không dựng hệ thống song song.** `reduceVocabState` chỉ khoá theo `wordId` và mọi hàm hàng đợi đều
  nhận `entries` từ ngoài → chỉ cần `collocationEntries()` cho cụm hình dạng giống mục deck là được FSRS,
  4 mức, đánh dấu, nhật ký append-only miễn phí. Id `col-xxxx` không đụng `tsl-`/`bsl-`.
- **Học MỚI tách riêng** (`#/triage?kind=colloc`, nút "Học cụm từ mới" ở mục Từ vựng). Màn đổi chữ theo
  chế độ: *"Bạn dùng được CỤM này tới mức nào?"*, *"còn 142 cụm từ chưa học"*.
- **ÔN LẠI chung một hàng đợi** với từ vựng — mục Từ vựng ghi *"7 thẻ (từ + cụm)"*.
- Mặt sau thẻ cụm hiện **dạng sai** (`✗ không dùng: do a decision`) — thứ cần nhớ không phải nghĩa.
- Đã chạy thật trọn vòng trên trình duyệt: học 3 cụm → lượt ôn có cả `vacation`, `client` lẫn
  `make a decision`, `make an appointment`. 6 test mới ở `tests/ui-colloc-learn.test.js`.

**3. Gộp nhóm cho bớt cuộn (D54).** Trước đây mỗi mục là một nút full-width hai dòng, 7–8 nút xếp dọc.
- `navGroup()` ở `blocks.js` (dùng ở cả hai màn). **Từ vựng** = `Học` / `Tra cứu & xem lại`.
  **Bài thi** = `Luyện phần Đọc` / `Luyện phần Nghe` — gộp theo KỸ NĂNG, vì lúc chọn Huy cân nhắc
  "giờ có đeo tai nghe được không", không phải số thứ tự Part.
- Hai cột từ 30rem trở lên; việc chính chiếm cả hàng. Bảng lỗ hổng gập vào `<details>`.
- Đo ở 375×812: cả hai màn còn **~1,3–1,4 màn hình**.

**4. Gợi ý phát triển tiếp — đã làm luôn:** dùng lại chính bộ chấm ở màn Bài thi để đánh dấu
**"← cần nhất"** lên đúng một phần. Gộp nhóm cho gọn thì dễ mất dấu "nên bắt đầu từ đâu"; đánh dấu này
trả lại điều đó mà không phải đọc bảng số. Có test canh "đúng một phần được đánh dấu".

**801 test pass.** Đã kiểm thật trên trình duyệt ở 375×812, không lỗi console, build sạch.

### Bước tiếp theo
- Huy học thử vài lượt cụm từ rồi cho biết: 4 mức chấm (không biết / đoán được / quên chính tả / thành
  thạo) có hợp với cụm từ không, hay cần thang khác (vd "nhớ cụm nhưng quên giới từ").
- Chưa làm: gợi ý mới xét phần thi + từ vựng, **chưa xét dạng câu** (word-form, verb-tense…). Muốn nút
  "hôm nay" chỉ thẳng "luyện dạng word-form" thì cần lọc câu theo `errorType` — việc riêng, chưa làm.

## Phiên 2026-09-23 (khuya) — Làm lại UX-UI quanh "động lực quay lại" (D51) — XONG, ĐÃ PUSH

Huy: "mục tiêu ban đầu không quá quan tâm UX-UI nhưng nhận ra phần này rất quan trọng trong việc kích
thích học lại." Đã xem lại **toàn bộ 15 màn** trước khi đề xuất.

**Phát hiện lớn nhất khi rà soát: app đang tự đi ngược khảo sát của chính nó.** `RESEARCH.md` mục
"Điều CỐ Ý KHÔNG lấy" ghi rõ **không làm streak** — vì nhịp 1–2 giờ/tuần (D03) khiến chuỗi ngày đứt gần
như mỗi tuần, biến mỗi lần mở app thành lời nhắc vừa thất bại. Vậy mà màn chính đang hiện `Chuỗi N ngày`.
Đó chính là thứ đang làm hỏng đúng cái Huy muốn cải thiện.

**Nguyên tắc chốt (D51): động lực = tiến độ CỘNG DỒN, không phải chuỗi ngày.** Bốn việc:

**1. Bỏ "Chuỗi N ngày" → "N tuần đã học".** `studyStreak` (ngày liên tiếp, có tụt) bị xoá hẳn, thay bằng
`activeWeeks` ở `logic/dashboard.js`: đếm số TUẦN từng có học, **chỉ tăng**. Nghỉ ba tuần quay lại vẫn
thấy nguyên công sức cũ. Có dấu ✓ khi tuần này đã học — đủ biết còn nợ hay chưa, không đủ thành áp lực.
Tuần tính từ **thứ Hai**; 6 test cũ của streak thay bằng 6 test mới (có case "nghỉ mấy tuần rồi học lại
thì cộng thêm, không reset").

**2. Màn "xong một lượt" dùng chung — chỗ quyết định có quay lại hay không.** Trước đây 5 màn kết thúc
(ôn thẻ · phân loại · Part 5 · ôn chủ động · bộ đề) mỗi màn tự bày một kiểu, phần lớn chỉ có một câu chữ
xám: làm xong không thấy gì thay đổi. Nay dùng chung `sessionDone()` ở `ui/blocks.js`, trả lời ba câu
theo thứ tự: **làm được bao nhiêu** (con số to) · **đổi được cái gì** (dòng tạo động lực) · **làm gì tiếp**
(luôn có nút). Vd ôn thẻ xong: "5 thẻ đã ôn · trong đó 4 từ mới · Không còn thẻ nào đến hạn…".
Thêm `gradedThisRound` ở `review-screen.js` — đếm VIỆC ĐÃ LÀM, không lấy độ dài hàng đợi (quy tắc #7).

**3. Màn chính đảo thứ tự: việc-cần-làm lên trên, phân tích xuống dưới.** Thứ tự mới: Hôm nay → 3 số
liệu → Từ vựng → Bài thi → *(gập)* biểu đồ 14 ngày → đồng bộ. Đo trên 375×812: thẻ "Hôm nay" **nằm trọn
trong màn đầu, không phải cuộn**. Biểu đồ 14 ngày vào `<details>` — màn chính lo "làm gì bây giờ".

**4. Không màn nào được là ngõ cụt.** Hết việc đến hạn, màn chính trước đây chỉ hiện một câu chữ xám
"Luyện thêm ở mục Bài thi nhé" — đúng lúc Huy đang rảnh và sẵn sàng học thì app không cho gì để bấm.
Nay có nút *Luyện đề* và *Xem cụm từ TOEIC*. Có **test canh bất biến này**: thẻ "Hôm nay" luôn ≥ 1 nút.

**Kèm theo — sửa bố cục điện thoại** (đo thật ở 375×812, không phải đoán):
- Thẻ từ ở màn ôn/phân loại: cao **325px = 40% màn hình** (trước ~23%, hơn nửa màn dưới bỏ trống), chữ từ 38px.
- 4 nút chấm: **2 cột × 114px** thay vì 4 cột làm chữ vỡ thành 4 dòng. Không tràn, không cuộn ngang.

**792 test pass** (thêm 2 test bất biến UX). Đã kiểm thật trên trình duyệt ở 375×812 và 1280×900, build
production sạch.

### Cố ý KHÔNG làm
Điểm, huy hiệu, bảng xếp hạng, thông báo đẩy, và **mọi thứ đếm theo ngày**. Ràng buộc #8 + RESEARCH.md.
Đã ghi chú ngay trong RESEARCH.md rằng kết luận này từng bị vi phạm một lần.

### Bước tiếp theo
- Huy dùng thử 1–2 tuần rồi cho biết: màn "xong một lượt" có làm thấy đáng công không, hay vẫn nhạt.
- Chưa đụng tới: màn Thi thử, Kho từ vựng, Tra từ (chưa thấy vấn đề về động lực ở đó).

## Phiên 2026-09-23 (tối) — Làm lại Collocations + plugin — XONG, ĐÃ PUSH

**Collocations: bỏ cách cũ, làm lại theo CỤM (D50).** Huy báo màn cũ "giống học từng từ vựng hơn là học
thành từng cụm". Đo lại dữ liệu thì đúng: 6.882 cụm sinh theo từng từ, **95% là tính từ+danh từ mô tả**
(`textile industry`, `corporate campus`) — từ vựng, không phải collocation.
- Thay bằng **142 cụm tuyển thủ công**, chia 5 nhóm theo MẪU: Động từ+danh từ (55) · Động từ+giới từ (28)
  · Tính từ+giới từ (20) · Danh từ+giới từ (14) · Cụm cố định văn phòng (25).
- **140/142 cụm có kèm dạng SAI hay mắc**: `pay attention to` ✓ / `give attention to` ✗,
  `do a decision` ✗, `comply to` ✗, `responsible of` ✗.
- Ô tìm kiếm **tra được cả dạng sai** — gõ "give attention" ra "pay attention to". Đó mới là lúc cần tra.
  Tìm được cả bằng nghĩa tiếng Việt không dấu ("chu y den").
- File nội dung mới `public/content/collocations.json`; `src/logic/collocations.js` viết lại còn 38 dòng
  (bỏ bảng tự phân loại chủ đề theo từ khoá — chủ đề giờ nằm sẵn trong dữ liệu).
- **10 test mới** ở `tests/collocations.test.js`, canh cả chất lượng nội dung (id không trùng, mọi cụm
  ≥ 2 chữ, > 80% có dạng sai). **789 test pass.**
- Trường `collocations` của từng từ trong deck **giữ nguyên**, vẫn dùng làm ví dụ ở màn chi tiết từ.

**Plugin Claude Code: cài thêm 2 cái để đỡ phải đọc lại codebase mỗi phiên.**
- `serena` — MCP phân tích code theo ký hiệu (hàm/class), tìm và sửa đúng chỗ mà không phải đọc cả file.
- `claude-md-management` — giữ CLAUDE.md khỏi lạc hậu, gom bài học mỗi phiên vào đó.
- **Đã `brew install uv`** vì `serena` gọi `uvx`; không có nó thì MCP im lặng không khởi động.
- **MCP chỉ nạp lúc mở phiên mới** — Huy `/clear` rồi bắt đầu phiên sau thì serena mới có tác dụng.
- Tổng 7 plugin, always-on ~8.000 token/phiên. Chi tiết và quy tắc tối ưu ở
  `.claude/skills/mini-project-setup/SKILL.md` mục "Plugin của Claude Code".
- **Cần Huy làm:** MCP của plugin `cloudflare` chưa đăng nhập được (phiên này không chạy OAuth được).
  Muốn dùng thì mở Claude Code ở terminal, gõ `/mcp` rồi cho phép `cloudflare`. Không làm cũng không sao —
  14 skill Workers/Wrangler vẫn dùng được, chỉ mất phần gọi thẳng API Cloudflare.

### Bước tiếp theo
- Huy mở app xem mục **Từ vựng › Collocations**, kiểm giúp: 142 cụm này có đúng loại Huy muốn học không,
  thiếu nhóm nào (vd cụm cho Part 7 đọc hiểu) thì nói, mình bổ sung.
- Chưa có cơ chế **ôn tập** collocation (mới chỉ tra cứu). Muốn đưa vào lịch ôn FSRS như từ vựng thì
  nói — đó là việc riêng, chưa làm.

## Phiên 2026-09-23 (chiều) — Dò và sửa lỗi sau đợt nâng cấp UI — XONG

Huy báo "codebase đang bị lỗi syntax và lỗi UI nghiêm trọng". Dò ra **5 lỗi**, đều sinh ra từ ba
commit nâng cấp UI trước đó (`a733474`, `9d4628b`, `1b298e5`, `ad1580d`). **779 test pass.**

**1. Lỗi syntax làm TRẮNG MÀN HÌNH (nặng nhất).** `src/ui/words-screen.js` dòng 136 và 164 có dấu
backtick bị escape (`\``) trong code — không phải trong chuỗi. File không parse được, mà đây là file
`app.js` import, nên **cả app không chạy**, không chỉ màn Kho từ vựng.
- *Bài học công cụ:* `node --check <file>` **KHÔNG bắt được lỗi này** — với file ESM (`"type": "module"`)
  nó trả về exit 0 dù cú pháp sai. Muốn kiểm syntax thật thì dùng parser: `node_modules/.bin/esbuild
  --loader=js --format=esm < file.js > /dev/null`. Đã suýt kết luận sai vì tin `node --check`.

**2. 43 class CSS đang dùng mà không còn rule** — đây là "UI lộn xộn". Commit `a733474` xoá 164 dòng
`style.css`, các commit sau chỉ hoàn lại một phần. Mất cả những thứ cốt lõi: `.options` / `.option-text`
(phương án của MỌI màn luyện và thi), `.verdict`, `.gaps`, `.tray*` (khay gạt từ), `.pace*` (đồng hồ nhịp),
`.weak-list`, `button:disabled`, `.tools`. Ngoài ra toàn bộ UI mới của màn kết quả (`.tab-group`,
`.wrong-item-*`, `.analysis-*`) **chưa bao giờ có CSS**.
- Đã khôi phục + viết mới, thêm 3 biến `--good-soft / --again-soft / --chosen-soft` để nền nhạt không
  chói ở dark mode (bản cũ viết cứng `#eef6f1`).
- *Cách tự kiểm về sau:* script đếm class dùng trong `src/ui/*.js` mà không có trong CSS — xem mục
  "Kiểm tra nhanh" dưới đây.

**3. Màn kết quả thi in ra chữ `[object HTMLDivElement]`.** `exam-result.js` viết
`question.trap ? [el(...), el(...)] : []` giữa danh sách con, mà `el()` không làm phẳng mảng lồng nên cả
mảng bị `String()`. Sửa ở GỐC: `el()` nay làm phẳng mảng lồng và bỏ qua `null/undefined/false`.

**4. Kho từ vựng: bấm chip lọc không ăn gì.** `renderWords` đọc `?f=` và `?open=` ở MỌI lần vẽ, mà
`store.refresh()` vẽ lại với đúng bộ params cũ → mọi lựa chọn bị kéo ngược về địa chỉ. Nay chỉ đọc địa chỉ
ở lần vẽ đầu của mỗi lượt vào màn (`readParams`).
- Kèm theo: ô tìm kiếm quay lại kiểu **chỉ vẽ lại danh sách**, không vẽ lại cả màn — vẽ lại cả màn dựng ô
  nhập mới nên con trỏ nhảy ra ngoài, chỉ gõ được một chữ cái mỗi lần. Lỗi này màn Collocations cũng dính.

**5. Màn Collocations: bấm chủ đề không có gì xảy ra.** Code gán `window.location.hash = '#/collocations'`
trong khi đang ở đúng địa chỉ đó — gán hash bằng giá trị cũ thì trình duyệt **không** phát `hashchange`,
nên màn không bao giờ vẽ lại. Nay gọi thẳng hàm vẽ lại.

**6. Thi thử — hai lỗi ở phần "cứu bài thi" (M16).**
- **Tự động phát audio sau 500 ms** khi bắt đầu bài / chuyển câu. Cộng với luật "phát MỘT lần, không nghe
  lại" (M21) thì Huy **mất luôn đoạn nghe trước khi kịp đeo tai nghe**, nút khoá vĩnh viễn. Đây là hành vi
  chưa từng được chốt trong DECISIONS.md (ràng buộc #9) — đã bỏ, quay lại "Huy bấm Nghe thì mới phát".
  *Nếu Huy MUỐN tự phát cho giống phòng thi thật thì nói, mình làm kèm đếm ngược 5 giây chuẩn bị.*
- **Khôi phục bài dở ra ĐỀ KHÁC.** `buildExamForm` xáo ngẫu nhiên, mà lúc khôi phục lại dựng đề bằng
  `Math.random` → đề mới hoàn toàn, mọi câu đã trả lời không khớp câu nào, nhưng màn hình vẫn báo khôi
  phục thành công. Nay lưu `seed` và dựng lại bằng `seededRandom(seed)` (mới, ở `src/logic/shuffle.js`).
  Bản lưu cũ không có `seed` thì bỏ, còn hơn dựng sai. Bỏ luôn `console.log` gỡ lỗi còn sót.

**Việc gọn làm thêm:** `.claude/launch.json` khai cổng 5180 nhưng vite chạy 5173 → sửa lại.

### Kiểm tra nhanh (chạy trước khi commit)
```bash
npm test
bash scripts/check_file_sizes.sh .
for f in $(find src public pipeline tests -name '*.js'); do \
  node_modules/.bin/esbuild --loader=js --format=esm < "$f" >/dev/null || echo "LỖI SYNTAX: $f"; done
```

### Bước tiếp theo
- Huy mở app kiểm bằng mắt trên iPhone (mình mới xem trên Chromium 800×600): màn Kho từ vựng bố cục
  hai cột có bị chật không, màn kết quả thi các tab theo Part có bấm được không.
- M5 (đồng bộ Supabase) vẫn đang chờ Huy cấu hình — không đụng gì trong phiên này.

## Phiên 2026-09-23 — Nâng cấp UI & Cứu bài thi (D50) — XONG, ĐÃ PUSH
Huy báo: kết quả thi bị scroll quá nhiều, UI từ vựng lộn xộn, muốn thêm Collocations, và bài thi bị mất khi refresh.
- **Màn kết quả (`exam-result.js`):** Tách nội dung sai thành các tab theo Part. Bấm vào từng câu sẽ hiện **Transcript** (cho bài nghe) và **Giải thích chi tiết + Bẫy**.
- **UI Từ vựng (`words-screen.js`):** Chuyển sang layout Master-Detail (Danh sách $\rightarrow$ Chi tiết).
- **Module Collocations mới:** Tạo `src/logic/collocations.js` và `src/ui/collocations-screen.js` để tách riêng cụm từ cố định ra khỏi từ vựng đơn.
- **Cứu bài thi (M16):** Triển khai lưu trạng thái bài thi vào `localStorage`. Tự động khôi phục khi refresh trang.
- **Dọn rác:** Fix các lỗi export thừa và lỗi build liên quan đến `listen.js`.
- Đã push lên `main` $\rightarrow$ Cloudflare tự deploy.

## Phiên 2026-09-19 (đêm) — Xem lại từ đã biết + ôn chủ động (D32) — XONG
Huy báo: phân loại chỉ chọn được 1 trong 4, không xem lại được từ đã biết, không tự ôn được. Xem **D32**.
- **Màn phân loại:** thêm \`Để sau\` (phím \`S\`) và \`← Từ trước\` (phím \`Backspace\`) để chấm lại từ lỡ tay.
  Chấm lại = ghi thêm sự kiện mới (nhật ký append-only), không sửa sự kiện cũ.
- **Kho từ vựng** (\`#/words\`, nút ở màn chính): lọc theo mức, tìm (không cần gõ dấu), mở từ để xem đủ
  nội dung và đổi mức. Các dòng "Đã phân loại tới đâu" ở màn chính bấm được, nhảy thẳng vào kho.
- **Ôn chủ động** (\`#/practice\`): chọn nhóm (thành thạo / hay sai / đánh dấu / đang học), 10 từ mỗi lượt,
  KHÔNG đụng lịch FSRS. Riêng quên một từ "thành thạo" thì hạ xuống "đoán được" để vào lại hàng đợi học.
- Code mới: \`src/logic/{word-library,practice,triage-history}.js\` + 38 test; UI \`src/ui/{words,practice}-screen.js\`,
  \`word-detail.js\` (dùng chung với màn ôn thẻ). **303 test pass.**
- Đã chạy thử toàn bộ luồng bằng jsdom + dữ liệu deck thật (35 kiểm tra: đếm, để sau, lùi, bấm đôi, lọc, tìm,
  đổi mức, ôn chủ động, reset khi rời màn). CHƯA nhìn bằng mắt trên trình duyệt thật — Huy mở app kiểm giúp
  phần bố cục trên iPhone (hàng lọc, hàng nút dính đáy).

## Phiên 2026-09-19 (đêm, tiếp) — deck BSL đủ, IPA, test giao diện — XONG
- **Deck BSL đủ 1161/1161 từ**, hợp lệ theo schema. 958 từ do \`gemini-flash-lite-latest\` sinh (hết hạn mức ngày
  của model chính) — mẫu 10 từ đọc lên chất lượng tốt. Màn chính giờ hiện \`Cao cấp (1161)\`.
- **IPA: 35 $\rightarrow$ 1176/1247 (TSL) và 1080/1161 (BSL)** nhờ đổi sang Wiktionary theo lô (D33). dictionaryapi.dev đã chết.
  Hai lỗi lúc làm (header tiếng Việt, HTTP 429) đều đã có test canh.
- **Đo lại phủ sóng Part 5** (\`npm run audit:coverage\`): TSL+BSL phủ **37%** phương án câu \`vocabulary\`
  (đáp án đúng 41%), thấp hơn dự đoán 53% ở D30. Không phải deck kém: 68 phương án chỉ từ 17 câu, và phần thiếu
  chủ yếu là từ chức năng (\`so\`, \`for\`, \`but\`, \`although\`) cùng biến thể động từ (\`raised\`, \`rising\`) — loại
  không đáng học thành thẻ. Từ nội dung thật sự còn thiếu: \`erratic\`, \`suspend\`, \`reconstruct\`, \`reconfigure\`,
  \`incompatible\`, \`inaccessible\`, \`inconclusive\`, \`interview\`, \`consecutively\`, \`frequently\`.
  Bài học: nhãn \`errorType=vocabulary\` của AI lẫn cả câu liên từ; đo phủ sóng theo khớp chính xác từ.
- **\`tests/ui-flow.test.js\`** (16 test, jsdom): chạy thật các màn phân loại / kho từ / ôn chủ động — bắt được
  loại lỗi giữa logic và màn hình mà test logic thuần không thấy. **\`validate:content\` giờ kiểm cả BSL.**
  \`audit:vocab -- --deck bsl\` soi deck BSL. **343 test pass.**

## Phiên 2026-09-20 (tối, máy Huy) — Ba góp ý lúc đang học + dọn refactor — ĐANG LÀM

Huy nhắn ba góp ý trong lúc đang làm Part 6. Hai cái đầu đã làm xong, đã kiểm trên trình duyệt thật.

**1. Gạt từ trong PHƯƠNG ÁN ở Part 3/4/6/7 (D45) — XONG.** Trước đây chỉ gạt được từ trong tài liệu (D34 mới
làm cho Part 5). Nay chấm xong cả bộ thì từng từ trong phương án chạm được luôn, y như chữ trong đoạn văn.
- **Không bê chip của Part 5 sang** vì phương án Part 3/4/7 là cả câu: đo trên nội dung thật ra **19–21 từ
  khác nhau mỗi câu** $\rightarrow$ một bộ 5 câu thành cả trăm chip. Câu chèn câu của Part 6 có tới 43 từ chạm được.
- Chi tiết dễ vấp: phải vẽ bằng \`<div\>` chứ không phải \`<button disabled\>` — trình duyệt KHÔNG gửi sự kiện
  chạm cho con của nút bị disabled. CSS đổi \`button.option\` $\rightarrow$ \`.option\`.

**2. Đồng hồ nhịp ở màn bộ đề (D46) — XONG.** Đo so với chuẩn, KHÔNG đếm ngược, không khoá gì (muốn đếm ngược
thật thì vào Thi thử). Mốc dùng chung ở \`src/logic/pace.js\`: Part 5 = 20 giây/câu · Part 6 = 30 · Part 7 = 60
(cộng lại đúng 75 phút phần Đọc) · Part 3/4 = 5 giây/câu và **chỉ chạy sau khi nghe xong**, vì nhịp phần nghe
do băng quyết định (con số 5 giây lấy từ mô tả giao diện thi của IIG mà Huy gửi).

**Hai lỗi thật bắt được khi xem bằng trình duyệt** (test jsdom không thấy vì jsdom không có cuộn trang):
- Chạm một từ ở cuối bộ là trang **nhảy về đầu**, mất chỗ đang đọc — vì vẽ lại thay sạch nội dung.
  Nay thao tác gạt từ giữ nguyên chỗ cuộn (\`keepScroll\` trong \`capture-tray.js\`).
- Ngược lại, bấm "Bộ tiếp theo" thì **không** về đầu bài mới mà rơi vào lưng chừng (\`scrollToTop\` trong \`dom.js\`).

**759 test pass** (thêm \`tests/pace.test.js\` và 5 test giao diện ở \`ui-sets\`). Đã xem thật trên Chromium
1280×900 và 375×812: hai cột, đồng hồ chạy 00:08$\rightarrow$00:11, chấm xong ra "⏱ 00:17 · chuẩn 02:00 cho 4 câu —
nhanh hơn 01:43", gạt từ "successfully" vào danh sách học ngon.

**3. Góp ý thứ ba: mô tả giao diện đề thi thật (IIG) — ĐÃ ĐỐI CHIẾU, CHƯA sửa gì, chờ Huy chốt.**

Đã soi từng ý trong mô tả Huy gửi so với code hiện tại:

| Đề thật | App | |
|---|---|---|
| 120 phút / 200 câu; Nghe 45 phút, Đọc 75 phút | Thi thử chạy hai đồng hồ riêng 45 + 75 | ✅ D39 |
| Không được quay lại phần Nghe khi đã sang Đọc | Sang phần sau là một chiều | ✅ D39 |
| Thang 0–990, hiện điểm ngay sau khi nộp | Điểm ước lượng 10–990 kèm khoảng dao động | ✅ D39 |
| Part 1 & 2 KHÔNG hiện câu hỏi/đáp án trên màn | Part 2 trong thi thử chỉ hiện A/B/C trống | ✅ |
| Part 3 & 4 CÓ hiện câu hỏi/đáp án | Hiện sẵn | ✅ |
| Đọc: màn chia đôi, văn bản trái, câu hỏi phải | \`splitPane\` | ✅ D41 |
| Danh sách câu chia theo phần để theo dõi | Nút "Danh sách câu" (palette) | ✅ |
| **Audio phát MỘT LẦN, không tua, không dừng** | Thi thử vẫn cho "▶ Nghe lại (đã nghe N lần)" | ❌ **lệch** |
| **Tự chuyển câu sau ~5 giây dừng** | App đợi Huy bấm Tiếp | ❌ **lệch** |
| **Đánh dấu câu chưa chắc để quay lại** | Chưa có (palette chỉ tô câu đã làm) | ❌ **thiếu** |
| Part 1 (6 câu tả tranh) | Không có (cần ảnh) | ❌ đã biết, 194/200 |
| Thanh trên hiện tổng số câu đã làm | Chỉ hiện trong palette, theo từng bộ | ⚠️ nhỏ |

**Huy chốt:** làm mục "nghe một lần, không tua" — **XONG**. Hai mục còn lại (tự chuyển câu sau ~5 giây,
đánh dấu câu để quay lại) để trong M21, chưa làm.
- **Thi thử** nay mỗi đoạn phát ĐÚNG MỘT LẦN: nghe xong nút khoá lại, ghi "✓ Đã nghe xong · đề thật không
  cho nghe lại". Phím Space cũng theo luật đó (không thì bấm phím là lách được nút đã khoá).
  Rời câu rồi quay lại vẫn khoá — \`heard\` đếm theo từng đơn vị, không reset khi chuyển câu.
- **Phát lỗi giữa chừng thì KHÔNG tính là đã nghe** $\rightarrow$ vẫn bấm lại được. Trục trặc kỹ thuật không được
  phép làm mất câu.
- **Màn LUYỆN giữ nguyên** nghe lại + chỉnh tốc độ 0.75×: đó là lúc học, không phải lúc đo sức.
- Đã chạy thật trên trình duyệt: bấm Nghe $\rightarrow$ hết chuỗi 4 đoạn (câu hỏi + A/B/C) **không lỗi**, rồi nút tự
  khoá. Tức là đường phát âm thanh thật chạy được trên Mac (test jsdom dùng bộ phát giả nên không chứng
  minh được điều này). **Vẫn chưa ai xác nhận có TIẾNG ra loa** — cửa sổ trình duyệt của Claude không
  nghe được; Huy nghe thử giúp.

### Việc gọn nhẹ làm thêm cuối phiên
- **Sửa lỗi gạt cả CỤM thay vì một từ.** \`normalizeWord('have been')\` trước đây trả về nguyên cụm
  \`"have been"\` $\rightarrow$ chip phương án của Part 5 ghi cả cụm vào danh sách học, không bao giờ tra được nghĩa.
  **31% phương án Part 5 dài hơn một từ** nên lỗi này gặp thường xuyên. Sửa ở hai lớp: chip tách từng từ
  (\`tokenize\`), và \`normalizeWord\` từ chối mọi chuỗi có khoảng trắng — nhật ký là append-only (ràng buộc #5)
  nên rác ghi vào là nằm lại vĩnh viễn, phải chặn ở gốc. Sự kiện CŨ dạng cụm tự rơi khỏi "Kho từ vựng › Đã gạt".
  Màn Tra từ gõ cả cụm nay báo đúng lý do thay vì "gõ thêm chữ cái".
- **Đã tắt 3 server dev của project khác** (\`project_linalg\`, \`project_kmap\` chiếm cổng 5173–5176).
  Huy cho phép tự tắt từ nay, đã ghi vào CLAUDE.md.
- **Deck TSL đủ 1250/1250 từ lần đầu tiên** — hoá ra 3 từ "AI không sinh được" bấy lâu là **lỗi mã hoá file**:
  \`TSL_12_stats.csv\` là Latin-1 (byte \`0xE9\` = "é"), đọc bằng UTF-8 nên \`résumé\` thành \`r?sum?\`; AI nhận
  chuỗi rác nên không trả về gì khớp, pipeline chỉ báo "nhận 0/3 từ" chứ không chỉ ra nguyên nhân.
  \`readWordlistCsv\` nay thử UTF-8 nghiêm ngặt rồi mới lùi về windows-1252. Sinh lại: nhận **3/3**.
  Thêm đúng \`tsl-0026 résumé\` · \`tsl-0105 café\` · \`tsl-0714 entrée\` (id lấy theo RANK nên lấp vào ba chỗ
  trống sẵn có) — **không mục cũ nào bị sửa hay xoá**, đúng ràng buộc #6. Cả ba đều có IPA.
- **IPA còn thiếu: ĐÃ ĐO, QUYẾT ĐỊNH KHÔNG LÀM.** 152 từ thiếu IPA (TSL 71 + BSL 81) đều được cache ghi
  \`null\` = Wiktionary chắc chắn không có (đúng quy tắc #4), nên **chạy lại pipeline không bao giờ bù được** —
  ghi chú cũ "chạy lại sẽ tự tra tiếp" là SAI. Đo thử: chỉ **21/152** từ theo được sang biến thể chính tả
  (\`traveler$\rightarrow$traveller\`, \`jewelry$\rightarrow$jewellery\`), và vài đích trong đó còn là lối viết cổ (\`distributor$\rightarrow$distributour\`).
  131 từ còn lại (\`quarterly\`, \`upcoming\`, \`photocopier\`…) là từ phái sinh/ghép, trang Wiktionary KHÔNG có
  mục phát âm nào. 21 từ trên 2411 = 0,9% deck $\rightarrow$ không đáng viết thêm bộ theo biến thể chính tả.
- **Kiểm branch** (\`git fetch --prune\` + \`git branch -r --no-merged main\`): không có nhánh nào chưa merge.
  Nhánh \`claude/redesign-part-5-toeic-fm73hx\` đã nằm trong \`main\` (merge e516a76) — còn sót trên GitHub,
  xoá được nếu Huy muốn. Quy tắc kiểm branch thường xuyên đã vào CLAUDE.md.

### Dọn nốt refactor (kế hoạch 1A/1B/1C ở cuối file)
- **1A XONG** — \`pipeline/lib/cli.js\` (\`projectPath\`, \`today\`, \`flagValue\`, \`flagNumber\`, \`hasFlag\`) + 8 test.
  Nối vào **cả 7 script** pipeline, không chỉ 4 script build: \`audit-vocab\` (cùng kiểu đọc cờ \`--deck\`),
  \`coverage-part5\` và \`validate-content\` (cùng cách tìm gốc project). Bớt 73 dòng chép tay, thêm 54.
  - Làm đúng như kế hoạch dặn: **gom "đọc MỘT cờ", KHÔNG gom thành một \`parseArgs\` chung** — mỗi script có bộ
    cờ riêng, mặc định của \`--target\` ở \`build-sets\` còn đổi theo \`--part\`.
  - \`today\` là HÀM chứ không phải hằng: pipeline chạy vài giờ có thể vắt qua nửa đêm, mỗi lô nên mang đúng ngày của nó.
  - **Đã chạy thật** (local có \`.env\`): \`validate:content\` (8 file nội dung + mọi MP3 tham chiếu) · \`audit:vocab -- --deck bsl\`
    (đọc đúng deck 1161 từ) · \`audit:coverage\` · \`build-sets --part 9\` và \`--variant bogus\` báo lỗi đúng, không gọi AI.
    Ba script build chưa chạy thật (tốn hạn mức AI) — phần đường dẫn của chúng dùng chung hàm đã chạy ở trên.
- **1B XONG** — \`renderClips\` + \`EDGE_TTS_MISSING\` + \`AUDIO_FAILED_MESSAGE\` trong \`pipeline/lib/tts.js\`
  (không đẻ file mới: đây đúng là module âm thanh). \`build-listening\` và \`build-sets\` bớt mỗi bên ~20 dòng.
  Nhận thẳng mảng \`clips\` đã dựng, không tự dựng — vì hai bên dựng khác nhau (\`assembleEntry\`/\`assembleSet\`).
  Giữ nguyên luật **có đoạn lỗi thì KHÔNG ghi file nội dung** (có test canh riêng).
  - Tiện thể: \`build-sets\` nay cũng báo tiến độ mỗi 40 đoạn như \`build-listening\` (quy tắc số 5).
  - **Đã chạy thật cả hai** (\`--no-generate\` nên không gọi AI): Part 3 = 77 đoạn, Part 2 = 288 đoạn,
    cả hai "0 mới, đã có đủ, 0 lỗi" và file nội dung ghi ra **y hệt từng byte** (git sạch).
- **1C (gộp listen/quiz) CHƯA làm** — kế hoạch ghi rõ rủi ro CAO, nên làm riêng một phiên. Xem mục cuối file.

## Phiên 2026-09-20 (khuya) — Soát codebase + refactor DRY — XONG giai đoạn A & B, ĐÃ MERGE VÀO MAIN

> **Đã merge vào \`main\` và push lúc kết phiên** $\rightarrow$ Cloudflare tự build và deploy (D27b).
> **Huy kiểm giúp:** mở app, xem dòng cuối màn chính có phải \`bản 2026-09-20 12:xx\` không. Nếu vẫn là bản cũ:
> Mac \`Cmd+Shift+R\`, iPhone đóng hẳn app rồi mở lại (service worker giữ bản cũ — xem mục "Sau mỗi lần deploy").
> *Claude KHÔNG tự kiểm được link thật: môi trường phiên này chặn \`*.workers.dev\` ở tầng proxy (403).*


Huy giao: "kiểm tra file dư thừa, refactor ở mức độ phù hợp, báo cáo phần nào đã làm phần nào chưa".
Cách soát: script đếm (a) export không ai import, (b) file không ai import, (c) dòng code giống hệt ở ≥ 2 file.

### ĐÃ REFACTOR (2 commit, 750 test pass)

**A. Lớp giao diện** (\`refactor: gom code trùng lặp ở lớp giao diện\`)
| Gom về | Thay cho | Số nơi dùng |
|---|---|---|
| \`blocks.js\` \`backLink\` / \`backButton\` | nút "← Bài thi" / "Về mục Từ vựng"… chép tay | 8 màn |
| \`blocks.js\` \`verdictLine\` + \`explanationCard\` | khối "Đúng/Sai + giải thích + bẫy" | 3 màn |
| \`blocks.js\` \`letterFromKey\` | đọc phím 1–4 / A–D | 3 màn |
| \`blocks.js\` \`speedChooser\` | hàng chọn tốc độ 0.75/1/1.25× | 2 màn |
| \`word-detail.js\` \`renderWordHead\` | mặt trước thẻ từ (từ + IPA + từ loại) | 3 màn |
| \`audio-player.js\` \`createPlayerSlot\` | chỗ tạo/huỷ bộ phát + tiêm bộ phát giả | 3 màn |
| \`vocab-levels.js\` \`LEVEL_INFO[].css\` | 3 bản \`LEVEL_CLASS\` chép tay | 3 màn |
| \`exam-time.js\` \`SKILL_LABEL\` | 2 bản nhãn Nghe/Đọc **khác chữ nhau** | 4 nơi |
- Bỏ **13 export** chỉ dùng trong chính file đó (đang giả vờ là API công khai) và **8 import thừa**.
- Bắt được một lỗi cùng loại vừa sửa ở Part 5: màn nghe Part 2 **lộ dạng câu hỏi** (\`wh-where\`) trước khi trả lời.

**B. Pipeline** (\`refactor: gom luật luân phiên model\`)
- \`pipeline/lib/model-pair.js\` + 9 test: ba pipeline (Part 5, Part 2, bộ Part 3/4/6/7) chép tay cùng một đoạn
  "hai model, hết hạn mức ngày thì đổi, tránh hai vai trùng model". Đây đúng là chỗ đã từng có lỗi thật (quy tắc #3).
- **Đổi hành vi có chủ đích:** \`withRetry\` không thử lại khi lỗi là hết hạn mức NGÀY — trước đây vẫn lùi
  2+4+8+16 giây rồi mới báo, phí ~30 giây mỗi lô. Có test canh cả hai loại 429 (theo ngày / theo phút).
- **CHƯA chạy thật ba script này** (môi trường phiên này không có \`GEMINI_API_KEY\`). Đã kiểm \`node --check\`
  và \`npm run validate:content\`. **Lần chạy pipeline tới, Huy để ý dòng log đầu tiên có đúng "Model sinh đề: … ·
  model kiểm định: …" không** — sai là biết ngay từ lô đầu, không mất hạn mức.

### CHƯA REFACTOR (cố ý, có lý do — để phiên sau làm tiếp)

1. **Pipeline: \`parseArgs\` + \`path()\` + \`today\`** lặp ở cả 4 script (\`build-vocab/questions/listening/sets\`).
   *Chưa làm vì* mỗi script có bộ cờ riêng (\`--target\`, \`--batch\`, \`--part\`,
   \`--variant\`, \`--list\`); gom phải thiết kế
   một bộ đọc cờ dùng chung. **Ước ~1 giờ, rủi ro thấp.** Nên làm trước tiên ở phiên sau.
2. **Pipeline: khối sinh âm thanh** (\`EDGE_TTS\`, \`runLimited\`, đếm created/existed/failed, thông báo lỗi edge-tts)
   lặp ở \`build-listening\` và \`build-sets\`, khoảng 25 dòng. *Chưa làm vì* hai bên lấy \`clips\` theo cách khác nhau.
   **Ước ~45 phút.**
3. **Pipeline: khối "báo cáo lô"** (\`+N câu đạt · loại: … · trùng …\`) và khối dựng \`entry\` (explanation/trap/verify)
   lặp ở \`build-listening\` và \`build-questions\`. **Ước ~30 phút.**
4. **UI: \`listen-screen\` và \`quiz-screen\` gần như cùng một màn** ("một câu · chấm ngay · giải thích · báo câu sai"),
   khác mỗi phần nghe. Gom được thành một bộ điều khiển chung nhưng **đây là refactor lớn nhất còn lại và rủi ro
   cao nhất** (hai màn đều có trạng thái riêng, khoá bàn phím, khay gạt từ). **Ước 2–3 giờ, nên làm riêng một phiên.**
…1338 tokens truncated…chéo 2 model như D12; bộ chỉ đạt khi MỌI câu khớp): Part 3 = 13 bộ/39 câu · Part 4 = 10 bộ/30 câu ·
  Part 6 = 4 bộ/16 câu · Part 7 = 20 bộ/59 câu (đơn/đôi/ba) · Part 2 = 72 câu. **Dựng thử bằng dữ liệu thật ra đúng đề 194 câu**
  (25·39·30·30·16·54), 120 phút, không trùng câu. Âm thanh: 375 file MP3 (13 MB), giọng Mỹ/Anh/Úc/Canada theo giới tính người nói.
- **Kiến trúc chung** (D37): một schema \`set.schema.json\`, một pipeline \`npm run build:sets -- --part N [--variant single|double|triple]\`,
  một màn \`#/sets?part=N\`, thống kê theo kỹ năng Nghe/Đọc. Dashboard đổi "Part 5/Nghe Part 2" $\rightarrow$ "Đọc/Nghe".
- **Thi thử \`#/exam\`** (D38, M15): đề đủ / Nghe / Đọc / từng Part, tính giờ, tự nộp khi hết giờ, kết quả + xem lại câu sai. Chấm SỐ CÂU ĐÚNG, không quy đổi điểm. Ghi nhật ký một lần khi nộp.
- **Dashboard mới** (D36): ba số đầu trang thay số sự kiện thô (học tuần này/mục tiêu 90 phút · từ nhớ vững · đúng ở bài thi).
- **Lỗi thật bắt được giữa chừng** (đều có test canh): dọn âm thanh mồ côi xoá nhầm Part 3/4 · schema đòi $\ge$ 2 lượt nói làm Part 4 bị
  chặn khi ghi · giờ thi dài hơn đề thật khi Part 7 vượt 1 câu · đổi Part trong màn luyện làm dính lượt cũ · màu đỏ của "lỗ hổng"
  dùng nhầm cho điểm số ở màn kết quả (phát hiện bằng ảnh chụp màn hình thật).
- **Chưa thử nghe thật trên thiết bị** — xem "Bước tiếp theo" mục 1. **677 test pass** (thêm: sets, exam, set-check, ui-sets, ui-exam...).

## Phiên 2026-09-20 — M8 + M9 (luyện nghe Part 2) — XONG, đã lưu
- **M8 pipeline âm thanh:** \`npm run build:listening\` sinh câu hỏi-đáp Part 2 (kiểm định chéo 2 model như D12), cân bằng
  đáp án A/B/C, tạo MP3 bằng edge-tts (venv riêng \`pipeline/.venv\`, đã gitignore). **58/72 câu** đạt, 232 đoạn MP3 (5,2 MB), 5 giọng Mỹ/Anh/Úc; Q1 chốt ở D35.
  Lô cuối bị dừng vì model dự phòng trả JSON hỏng $\rightarrow$ chạy lại đúng lệnh cũ là tiếp tục tới 72 (cache đã lưu).
- **M9 màn luyện nghe:** \`#/listen\` (nút "Luyện nghe Part 2" ở màn chính). Chỉ thấy A/B/C, nút chọn khoá tới khi nghe hết;
  tốc độ 0.75/1/1.25; xong mới hiện transcript + giải thích + gạt từ lạ. Xem **D35**.
- **Lỗi bắt được giữa chừng:** xoay đáp án làm sai lời giải thích AI viết ("đáp án B"). Sửa ở gốc bằng prompt v2 +
  bộ lọc, bản v1 bỏ đi sinh lại. Kiểm tra bản cuối: 0/58 câu nhắc chữ cái, đáp án A=20 B=19 C=19.
- \`validate:content\` giờ kiểm cả bộ câu nghe VÀ mọi file MP3 được tham chiếu phải tồn tại.
- **CHƯA thử nghe thật trên iPhone/Mac** — jsdom dùng bộ phát giả. Huy nghe thử: có ra tiếng khi chạm "Nghe câu này"
  không, nghe hết mới chọn được không, tốc độ 0.75× có méo giọng không, bật máy bay rồi nghe lại câu đã nghe.
- **485 test pass** (thêm: audio-player, listen, tts, prompt-listening, listening-assemble, ui-listen).

## Phiên 2026-09-19 (đêm, cuối) — Gạt từ lạ lúc làm Part 5 (D34) — XONG
Huy đề xuất: gặp từ lạ khi làm bài ngoài từ vựng thì kéo thả vào danh sách cần học, không hiện nghĩa.
- **Part 5:** mỗi từ trong câu chạm/kéo được; khay "Cần học" dưới câu hỏi. Từ trong phương án A–D chỉ gạt
  được sau khi trả lời (không lộ gợi ý). Từ đã có trong deck (kể cả dạng chia) vào thẳng hàng đợi học.
- **Kho từ vựng › Đã gạt:** cả từ trong deck lẫn từ CHƯA có trong deck (kèm số lần gặp, nút "Tra nghĩa ↗").
- Loại sự kiện mới \`vocab.captured\`; code mới \`src/logic/capture.js\`, \`src/ui/capture-tray.js\`.
- **391 test pass** (32 test logic gạt từ, 11 test giao diện \`tests/ui-capture.test.js\`, test dùng chung ở
  \`tests/helpers/ui-app.js\`). CHƯA thử kéo thả bằng chuột thật trên trình duyệt — jsdom giả lập sự kiện \`drop\`.

## Mục tiêu phiên này: 3 milestone — ĐÃ ĐẠT
- ✅ **M4**: 200 câu Part 5 (phủ đều 12 loại kiến thức, 100% qua kiểm định 2 bước) + màn luyện.
- ✅ **M6**: PWA cài được, học offline được, phiên "15 phút hôm nay", nút xuất dữ liệu.
- ✅ **M5 (code)**: schema SQL + RLS, đăng nhập OTP, đồng bộ hai chiều. Chờ Huy cấu hình để chạy thật.

## LƯU Ý KHI KIỂM TRA LỖI SAU KHI DEPLOY
Màn chính hiện số hiệu bản build ở dòng cuối (\`bản 2026-09-19 12:19\`). Trước khi kết luận
"lỗi chưa sửa", hãy đối chiếu số này. Nếu cũ hơn lần build mới nhất thì đang xem bản cũ trong
bộ nhớ đệm của service worker $\rightarrow$ tải lại trang (Mac: Cmd+Shift+R; iPhone: đóng hẳn app rồi mở lại).
App đã có cơ chế tự tải lại khi thấy bản mới, nhưng lần đầu ngay sau khi deploy vẫn có thể lệch.

## ~~VIỆC CỦA HUY — kích hoạt đồng bộ (M5)~~ — A–G XONG 2026-09-23, còn bước H (giữ để tra cứu)

> Viết lại 2026-09-23. Bản cũ có hai chỗ lệch với giao diện hiện nay: (1) trên Cloudflare phải đặt biến ở
> mục biến của **Build**, không phải biến lúc chạy của Worker; (2) Supabase nay gọi key công khai là
> **Publishable key** (`sb_publishable_…`), tên cũ `anon` chỉ còn ở tab Legacy.
> Đăng nhập bằng **email + mật khẩu** (D25c), không dùng mã OTP.

**Bốn khái niệm cần biết trước (đọc 1 phút):**
- **Supabase** = cơ sở dữ liệu Postgres + đăng nhập, chạy trên mây, gói Free. App chỉ gửi lên nhật ký sự kiện và cài đặt.
- **RLS (Row Level Security)** = luật "mỗi tài khoản chỉ đọc/ghi được dòng của mình", do chính database áp đặt.
  Key của app nằm công khai trong code frontend, nên RLS là lớp bảo vệ DUY NHẤT (ràng buộc #4).
- **Publishable key** (`sb_publishable_…`, bản cũ là `anon`) được phép nằm trong app. **Secret key**
  (`sb_secret_…`, bản cũ là `service_role`) bỏ qua mọi RLS → **không bao giờ** dán vào app (ràng buộc #3).
- **Biến lúc build**: Vite chép giá trị `VITE_…` vào file JS lúc build. Máy build của Cloudflare phải thấy
  biến thì app mới có — đặt nhầm chỗ là app vẫn báo "Chưa cấu hình Supabase".

### A. Tạo project (~3 phút) — đã tạo từ trước thì dùng lại, bỏ qua A
- [ ] supabase.com → đăng nhập (bằng GitHub cho nhanh) → **New project**.
- [ ] Name `toeic-app` · Region **Southeast Asia (Singapore)** · Plan **Free**.
- [ ] Database Password: bấm **Generate**, lưu vào trình quản lý mật khẩu (app không dùng, nhưng mất thì khó lấy lại).
- [ ] Chờ project chạy xong (~1–2 phút).

### B. Tạo bảng + bật RLS (~3 phút) — Huy tự làm bước này
- [ ] Mở `supabase/schema.sql` trong repo, copy **toàn bộ**.
- [ ] Dashboard → **SQL Editor** → **New query** → dán → **Run**. Nếu Supabase cảnh báo "destructive operation"
      (do các dòng `drop policy if exists`) thì xác nhận Run — file chạy lại bao nhiêu lần cũng an toàn.
- [ ] Bảng kết quả cuối: `events | true` và `settings | true`. **Có `false` → DỪNG, báo lại, không dùng tiếp.**
- [ ] Kiểm chéo: **Table Editor** → hai bảng `events`, `settings` KHÔNG có nhãn "Unrestricted"/"RLS disabled".

### C. Bật đăng nhập email + mật khẩu (~2 phút)
- [ ] **Authentication → Sign In / Providers**.
- [ ] Provider **Email**: **BẬT** (tắt thì app báo `Email logins are disabled`).
- [ ] **Confirm email**: **TẮT** → **Save** (không tắt thì tạo tài khoản xong bị báo "đang bắt xác nhận email").
- [ ] **Allow new users to sign up**: để BẬT tạm thời — sẽ tắt ở bước H.

### D. Lấy URL + key (~1 phút)
- [ ] **Project Settings → API Keys** → copy **Publishable key** (`sb_publishable_…`).
      Chỉ thấy tab Legacy thì lấy key `anon` `public`.
- [ ] **Project URL**: nút **Connect** ở đầu trang project (hoặc **Project Settings → Data API**).
      Đúng dạng `https://<mã-project>.supabase.co` — KHÔNG có `/` hay `/rest/v1` ở cuối.
- [ ] ❌ KHÔNG copy `sb_secret_…` hay `service_role`.

### E. Chạy thử trên Mac trước (tuỳ chọn, nên làm, ~3 phút)
- [ ] Mở `.env` ở thư mục repo, điền (không ngoặc kép, không khoảng trắng):
      `VITE_SUPABASE_URL=https://<mã-project>.supabase.co` và `VITE_SUPABASE_ANON_KEY=sb_publishable_…`
      (tên biến vẫn là `ANON_KEY` — chỉ là cái tên, publishable key dùng được y hệt).
- [ ] `npm run dev` → mở link → **Đồng bộ giữa các máy** (nút gần cuối màn chính).
      Thấy ô email/mật khẩu = đúng. Thấy "Cấu hình Supabase đang sai" → dòng lỗi chỉ đúng chỗ sai
      (thiếu biến / URL sai dạng / dán nhầm URL vào ô key).
- [ ] Xong thì tắt `npm run dev` (`Ctrl+C`).

### F. Đưa lên bản deploy trên Cloudflare (~3 phút + chờ build)
- [ ] dash.cloudflare.com → **Workers & Pages** → `toeic-app` → **Settings** → mục **Build** →
      **Variables and secrets** → **Add**: `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`, kiểu **Text** là đủ
      (cả hai vốn công khai trong code app).
- [ ] ⚠️ KHÔNG đặt ở mục **Variables and Secrets** riêng của Worker (biến lúc chạy) — Vite lúc build không thấy chúng.
- [ ] Build lại: tab **Deployments** → bản build mới nhất → **Retry build** (hoặc đợi lần push kế tiếp lên `main`).
- [ ] Mở app → tải lại trang (Mac `Cmd+Shift+R`; iPhone đóng hẳn app rồi mở lại) → **đối chiếu số hiệu bản build**
      ở cuối màn chính với giờ build mới → vào màn Đồng bộ. Vẫn "Chưa cấu hình" = biến đặt sai mục ở trên.

### G. Tạo tài khoản + đồng bộ hai máy (~3 phút)
- [ ] Máy 1 (Mac): màn Đồng bộ → email + mật khẩu (từ 8 ký tự) → **Lần đầu dùng? Tạo tài khoản** → **Đồng bộ ngay**
      → phải ra "Đồng bộ xong: gửi lên N sự kiện".
- [ ] Kiểm tra: Supabase → **Table Editor → events** có khoảng N dòng.
- [ ] Máy 2 (iPhone): cùng email + mật khẩu → **Đăng nhập** (KHÔNG tạo tài khoản mới) → **Đồng bộ ngay**.
- [ ] Quay lại Mac bấm **Đồng bộ ngay** lần nữa. Máy nào trước cũng được: đồng bộ là GỘP nhật ký hai chiều, không đè.
- [ ] Thử thật: ôn 1 thẻ trên iPhone → Đồng bộ → Mac Đồng bộ → thẻ đó đã được tính ôn trên Mac.

### H. Khoá cửa (~3 phút) — đây là nửa sau của tiêu chí M5 "user khác không đọc được dữ liệu"
- [ ] Cửa sổ ẩn danh → mở app → **Tạo tài khoản** bằng email thứ hai (vd `huybndc+test@gmail.com`) → **Đồng bộ ngay**
      → dòng thông báo KHÔNG được có chữ "nhận về" (không thấy sự kiện nào của Huy).
- [ ] Supabase → **Authentication → Users** → xoá tài khoản test.
- [ ] **Authentication → Sign In / Providers** → **TẮT "Allow new users to sign up"** → Save.
      Lý do: key công khai + không cần xác nhận email = ai cũng tạo được tài khoản và lấp đầy 500 MB của gói Free.
      Huy chỉ cần MỘT tài khoản cho mọi máy.

### Sau khi xong
- Project Free **tự tạm dừng sau 7 ngày không hoạt động**. Nghỉ học hơn một tuần mà đồng bộ báo lỗi → vào dashboard
  bấm **Restore project**. Tự động ping chống tạm dừng là M18 (cần secret trên GitHub).
- Gói Free không backup tự động → thỉnh thoảng bấm **Xuất dữ liệu**.
- Báo lại cho Claude: kết quả bước B (`true`/`true`) và dòng thông báo ở bước G → đánh dấu M5 xong trong PLAN.md.

## Đã xong trong phiên 2026-09-19
- **M1**: Vite + Vitest, git, GitHub private, Cloudflare Workers tự deploy mỗi lần push.
- **M2**: schema vocab/event; pipeline sinh 1243/1250 từ TSL 1.2 (nghĩa Việt, 2 ví dụ song ngữ,
  collocation, đồng/trái nghĩa, note bẫy TOEIC); validator; \`npm run audit:vocab\`.
  Chỉ 35/1243 từ có IPA vì API từ điển hỏng — chạy lại pipeline sẽ tự tra tiếp.
- **M3**: FSRS bọc sau interface riêng; reducer gấp nhật ký sự kiện; IndexedDB append-only;
  router hash; màn tổng quan / phân loại / ôn thẻ / từ hay sai.
- **RESEARCH.md**: khảo sát TOEIC Lab, GenLang, Test-English, Anki $\rightarrow$ 6 điểm UX đã áp dụng.
- **CLAUDE.md**: thêm 6 quy tắc kỹ thuật bắt buộc + checklist cuối mỗi bước con + quy tắc làm song song.

## Không còn tiến trình nền nào (đã kiểm tra bằng \`scripts/check_processes.sh\`)

## Bước tiếp theo (cụ thể)

> **Phiên sau chạy LOCAL trên máy Huy** (Huy quyết 2026-09-20), không chạy trên cloud nữa.
> Chạy local mở ra ba thứ phiên cloud KHÔNG làm được, nên tận dụng ngay:
> 1. có \`.env\` $\rightarrow$ **chạy được pipeline** (phiên cloud không có \`GEMINI_API_KEY\`);
> 2L. mở được link thật (cloud bị proxy chặn \`*.workers.dev\`) $\rightarrow$ tự kiểm bản deploy;
> 3. mở được trình duyệt thật $\rightarrow$ nhìn bố cục bằng mắt, không phải chỉ chụp ảnh headless.

### 1. Dọn nốt refactor — **1A và 1B ĐÃ XONG ngày 2026-09-20 (tối)**, chỉ còn 1C

> Giữ lại nguyên văn kế hoạch bên dưới vì phần "cái khó" của 1C vẫn còn giá trị.
> **1A** $\rightarrow$ \`pipeline/lib/cli.js\` (đã chạy thật \`validate:content\`, \`audit:vocab --deck bsl\`, \`audit:coverage\`).
> **1B** $\rightarrow$ \`renderClips\` trong \`pipeline/lib/tts.js\` (đã chạy thật Part 3 = 77 đoạn, Part 2 = 288 đoạn,
> file nội dung ra y hệt từng byte).
> **1C** $\rightarrow$ Huy chốt để RIÊNG một phiên, chưa làm.

**1A. ~~Gom \`parseArgs\` + \`path()\` + \`today\` của 4 script pipeline~~ — XONG 2026-09-20**
- Lặp ở: \`pipeline/build-vocab.js\`, \`build-questions.js\`, \`build-listening.js\`, \`build-sets.js\`.
- Ba dòng giống hệt nhau ở cả bốn file:
  \`const path = (relative) => new URL(relative, ROOT).pathname;\`
  \`const today = new Date().toISOString().slice(0, 10);\`
  và hàm đọc cờ \`return index === -1 ? fallback : Number.parseInt(argv[index + 1], 10);\`
- **Cái khó (đọc trước khi làm):** mỗi script có bộ cờ RIÊNG — \`--target\`, \`--batch\`, \`--part\`,
  \`--variant\`, \`--list\`, \`--generate\`. Nên helper phải là "đọc một cờ" chứ không phải "đọc hết cờ":
  vd \`flag(argv, '--target', 200)\` và \`hasFlag(argv, '--generate')\`, còn việc ghép thành object
  thì để từng script tự làm. Gom thành một \`parseArgs\` chung cho cả bốn là SAI hướng.
- Đặt ở đâu: thêm vào \`pipeline/lib/\` — cân nhắc gộp chung file với \`path()\` vì cùng là tiện ích chạy CLI.
- Kiểm tra: \`node --check\` từng file + \`npm test\` + chạy thử một lệnh có cờ thật (local có \`.env\`).

**1B. ~~Gom khối sinh âm thanh của \`build-listening.js\` và \`build-sets.js\`~~ — XONG 2026-09-20**
- Khoảng 25 dòng giống nhau: \`EDGE_TTS\`, kiểm tra đã cài edge-tts chưa, \`runLimited(clips, 4, …)\`,
  ba biến đếm \`created/existed/failed\`, dòng log tiến độ mỗi 40 đoạn, và luật
  **"có đoạn lỗi thì KHÔNG ghi file nội dung"** (luật này quan trọng, đừng làm rơi lúc gom).
- **Cái khó:** hai bên lấy danh sách \`clips\` theo cách khác nhau (Part 2 từ \`assembleEntry\`,
  các bộ từ \`assembleSet\`). Helper nên nhận thẳng mảng \`clips\` đã dựng sẵn, không tự đi dựng.
- Kiểm tra: chỉ chạy thật được ở local (cần \`pipeline/.venv/bin/edge-tts\`).

**1C. Gộp hai màn \`listen-screen.js\` và \`quiz-screen.js\`** * (~2–3 giờ, rủi ro CAO — Huy chốt 2026-09-20: làm RIÊNG một phiên)*
- Hai màn gần như cùng một thứ: "một câu · chấm ngay · giải thích · nút báo câu sai · lượt có bộ đếm",
  khác mỗi phần nghe và số phương án (3 với Part 2, 4 với Part 5).
- Đã giống nhau tới mức chép tay cả tên hàm: \`answer()\`, \`report()\`, \`next()\`, \`roundQueue()\`.
- **Vì sao rủi ro cao:** mỗi màn giữ trạng thái riêng ở mức module (\`picked\`, \`locked\`, \`doneThisRound\`,
  \`heard\`, \`nowKey\`), có khoá bàn phím riêng, và Part 5 còn có khay gạt từ + lượt theo mặt cắt đề thật (D39).
  Gộp ẩu là vỡ cả hai. **Điều kiện an toàn:** \`tests/ui-listen.test.js\` (18 test) và \`tests/ui-quiz.test.js\`
  (9 test) phải xanh nguyên vẹn, KHÔNG được sửa test cho vừa code mới.
- Gợi ý hướng: tách phần "vòng lặp một lượt câu hỏi" thành một bộ điều khiển chung nhận cấu hình
  (số phương án, có phần nghe hay không, cách dựng lượt), còn phần vẽ giữ riêng từng màn.

**Đã cố ý KHÔNG gom — đừng làm lại cho mất công:**
- \`build-vocab.js\` không dùng \`model-pair\`: nó xoay MỘT model (không cần cặp sinh/kiểm định) và có nhánh 401/403 riêng.
- \`pad()\` ở \`dashboard.js\` định dạng **ngày**, ở \`exam-time.js\` định dạng **khoảng thời gian** — trùng ký tự
  chứ không trùng kiến thức.
- Đoạn một dòng lặp đúng 2 lần (\`byId\`, \`tierEntries\`): đẻ hàm cho chúng còn rối hơn để nguyên.

### 2. Việc của Huy trên máy thật (chưa ai kiểm, tôi không kiểm hộ được)
- **Đối chiếu số hiệu bản build** ở cuối màn chính trước khi kết luận bất cứ lỗi nào.
- Mac: menu trái có hiện không; Part 5 và Part 7 có đúng hai cột không; thi thử "Riêng Part 6"
  trọn một vòng $\rightarrow$ nộp $\rightarrow$ xem **điểm ước lượng** có hợp lý không.
- iPhone: thanh tab đáy + một cột còn nguyên không (CSS điều hướng vừa đổi, đây là chỗ dễ vỡ nhất).
- **Nghe thử thật Part 2/3/4 trên iPhone** — test dùng bộ phát GIẢ nên lỗi âm thanh không thể lộ ra bằng test.
- M5: đăng nhập + "Đồng bộ ngay" trên cả hai máy (càng học nhiều trước khi bật thì dữ liệu càng lệch).
- Part 5 cố định **30 câu/lượt** (đúng đề thật). Bộ chọn 10/20/30 đã bỏ (D58).

### 3. Lần chạy pipeline tới — kiểm giúp một dòng
Ba script (\`build:questions\`, \`build:listening\`, \`build:sets\`) vừa đổi sang \`lib/model-pair.js\` nhưng
**chưa chạy thật lần nào** (phiên cloud không có khoá API). Dòng log đầu phải có dạng
\`Model sinh đề: … · model kiểm định: …\`. Sai thì lộ ngay từ lô đầu, không mất hạn mức.

### 4. Sau refactor thì tới (theo thứ tự tôi đề xuất)
1. **M16 — cứu bài thi đang làm dở**: hiện thoát giữa chừng là mất sạch; đề đủ dài 2 tiếng nên đây là rủi ro thật.
2. **Đa dạng đề thi**: Part 3/4/6 mới đủ ĐÚNG MỘT đề (13/10/4 bộ) $\rightarrow$ thi lần hai gặp lại y hệt.
   \`npm run build:sets -- --part N --target M\`, chạy các Part **nối tiếp**, không song song (chung hạn mức AI).
3. **M20 — nhận xét điểm mạnh/yếu** (D44): *nên hoãn tới khi Huy đã học thật vài tuần* — nó đọc nhật ký
   làm bài, mà ít dữ liệu thì nhận xét chỉ ra câu chung chung. Phần đo đạc làm trước, AI viết lời khuyên sau.
4. M10 còn dở (bảng/biểu Part 3, đánh dấu câu chứa đáp án trong transcript) — **PLAN.md đang đánh dấu \`[x]\`
   nhưng thực tế chưa xong; Huy xác nhận giúp là tính xong hay để mở.** M11 (dictation) chưa làm.
5. ~~Sinh bù 3 từ TSL còn thiếu và ~70 từ chưa có IPA~~ — **XONG/ĐÃ KHÉP LẠI 2026-09-20**: 3 từ là lỗi mã
   hoá file CSV, đã sửa và deck nay đủ 1250/1250. Còn 152 từ thiếu IPA thì Wiktionary vốn không có (đã đo,
   chỉ 21 từ cứu được) $\rightarrow$ **đừng chạy lại \`build:vocab\` để mong bù IPA, không có tác dụng.**
6. M18 (GitHub Actions ping Supabase + sao lưu hằng tuần) cần Huy tạo secret trên GitHub.

## Vướng mắc / câu hỏi mở
- Q1 (Giai đoạn 2): audio để chung repo hay bucket riêng — chưa tới lúc quyết.
- File deck 1,4 MB (gzip ~310 KB); deck BSL thêm ~1,6 MB nữa (đã có IPA). Đã tách thành file riêng theo deck
  và tải song song (\`loadAllVocabDecks\`), nhưng vẫn tải CẢ HAI ngay lúc mở app. Nếu thấy chậm trên
  iPhone thì bước sau là chỉ tải deck của tầng đang chọn.
- ~~API từ điển chập chờn~~ $\rightarrow$ đã đổi sang Wiktionary (D33).

## Giờ thực tế so với ước tính
| Milestone | Ước tính | Thực tế | Ghi chú |
|---|---|---|---|
| M0 (công cụ) | ~1–1,5h | ~0h | Node/git đã có sẵn |
| M1 | ~2h | ~35 phút | Credential GitHub sẵn trong Keychain |
| M2 | ~2h | ~2h15 | Phát sinh 3 lỗi mạng (timeout, quota, IPA chậm) |
| M3 | ~2h | ~1h | Làm song song lúc pipeline chạy nền |

## Nhật ký phiên (mới nhất ở trên)
- 2026-09-19 (tối) — Huy báo 3 việc. Lỗi bộ đếm hoá ra có ở cả 3 màn $\rightarrow$ thành quy tắc bắt buộc #7.
  Phân loại 4 mức (D29). Đo ra deck TSL lệch hẳn so với Part 5 $\rightarrow$ thêm deck BSL (D30) + phân tầng (D31).
  265 test pass. Sửa thêm lỗi \`check_processes.sh\` bỏ sót pipeline chạy bằng đường dẫn tương đối —
  script báo "sạch" trong khi job vẫn sống, đúng thứ nó sinh ra để chặn.
  Dừng phiên theo yêu cầu của Huy; pipeline BSL còn chạy nền ở 53/1161 từ.
- 2026-09-19 — **MVP học được rồi**: M2 + M3 xong, deploy chạy thật, 133 test pass.
  Rút 6 quy tắc kỹ thuật từ sự cố thật vào CLAUDE.md. Khảo sát đối thủ $\rightarrow$ RESEARCH.md.
- 2026-09-19 — M1 xong: deploy Cloudflare, repo private, 7 test.
- 2026-09-19 — Huy duyệt PLAN, giao toàn quyền quyết định.
- 2026-09-19 — Bộ bàn giao được tạo từ claude.ai.
