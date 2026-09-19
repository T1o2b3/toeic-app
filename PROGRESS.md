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
- **ĐANG CHẠY NỀN:** `npm run build:vocab:bsl` sinh **1161 từ BSL** (24 lô × 50 từ).
  Log: `pipeline/.cache/build-bsl.log`. Tiến độ lưu trong `pipeline/.cache/vocab-ai-bsl.json`
  sau MỖI lô, nên hết hạn mức giữa chừng thì chạy lại đúng lệnh cũ là tiếp tục đúng chỗ dở.
- **Đã sửa quyết định giữa chừng:** bản đầu của D30 định lấy cả NAWL. Đo lại thì NAWL là từ vựng
  học thuật (`electron`, `membrane`, `chemotherapy`) và chỉ thêm đúng **1 từ** vào phủ sóng Part 5
  → bỏ NAWL. Lý do ghi ở **D30b** để lần sau đo giá trị thật trước, đừng lấy số lượng làm bằng chứng.

## ⚠️ ĐANG CHẠY NỀN KHI DỪNG PHIÊN — đọc trước tiên

`npm run build:vocab:bsl` **vẫn đang chạy** khi phiên này dừng (PID 43346 lúc đó).
Nó sinh 1161 từ BSL, chia 24 lô × 50 từ, **lưu cache sau MỖI lô** nên dừng giữa chừng không mất gì.

**Việc đầu tiên của phiên mới — kiểm tra nó:**

```bash
bash scripts/check_processes.sh
```

- **Còn chạy** → để yên, đừng sửa `public/content/vocab-toeic-bsl.json` (nó ghi file đó lúc kết thúc).
- **Đã dừng** → xem đã làm tới đâu rồi chạy tiếp đúng lệnh cũ:

```bash
tail -5 pipeline/.cache/build-bsl.log
```

```bash
node -e "console.log(Object.keys(require('./pipeline/.cache/vocab-ai-bsl.json')).length + '/1161 từ')"
```

```bash
npm run build:vocab:bsl
```

Lúc dừng phiên: **53/1161 từ** (lô 1/24 xong). Hạn mức free tier đặt lại nửa đêm giờ Thái Bình Dương;
hết hạn mức thì hôm sau chạy lại lệnh trên, nó tiếp đúng chỗ dở (D19).

## Bước tiếp theo (cụ thể)

1. **Chạy nốt pipeline BSL** (xem mục trên). Xong thì:
   ```bash
   npm run validate:content && npm test
   ```
   rồi commit `public/content/vocab-toeic-bsl.json` và push — Cloudflare tự deploy.
   Màn chính sẽ hiện `Cao cấp (1161)` thay vì `Cao cấp (3)`.
2. **Push 5 commit đang chờ** (`git push`) — phiên này CHƯA push lần nào.
   App bản deploy vẫn là bản cũ; mọi thứ làm hôm nay chỉ mới có trên máy.
3. Đo lại phủ sóng từ vựng Part 5 sau khi có deck BSL, đối chiếu với con số dự đoán 53% ở D30.
4. Chạy lại `npm run build:vocab` để lấy nốt IPA cho deck TSL (mới có 35/1243 từ).
5. M5: Huy cấu hình Supabase (hướng dẫn ở mục trên) để bật đồng bộ Mac ↔ iPhone.

## File chưa commit khi dừng phiên
- `public/content/vocab-toeic-bsl.json` — **cố ý chưa commit**, mới có 3 từ do chạy thử.
  Pipeline sẽ ghi đè bằng bản đầy đủ. Commit sau khi pipeline xong.

## Vướng mắc / câu hỏi mở
- Q1 (Giai đoạn 2): audio để chung repo hay bucket riêng — chưa tới lúc quyết.
- File deck 1,37 MB (gzip 308 KB). Deck BSL sẽ thêm ~1,3 MB nữa. Đã tách thành file riêng theo deck
  và tải song song (`loadAllVocabDecks`), nhưng vẫn tải CẢ HAI ngay lúc mở app. Nếu thấy chậm trên
  iPhone thì bước sau là chỉ tải deck của tầng đang chọn.
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
