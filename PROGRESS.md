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

## Phiên 2026-09-20 (tối, máy Huy) — Ba góp ý lúc đang học + dọn refactor — ĐANG LÀM

Huy nhắn ba góp ý trong lúc đang làm Part 6. Hai cái đầu đã làm xong, đã kiểm trên trình duyệt thật.

**1. Gạt từ trong PHƯƠNG ÁN ở Part 3/4/6/7 (D45) — XONG.** Trước đây chỉ gạt được từ trong tài liệu (D34 mới
làm cho Part 5). Nay chấm xong cả bộ thì từng từ trong phương án chạm được luôn, y như chữ trong đoạn văn.
- **Không bê chip của Part 5 sang** vì phương án Part 3/4/7 là cả câu: đo trên nội dung thật ra **19–21 từ
  khác nhau mỗi câu** → một bộ 5 câu thành cả trăm chip. Câu chèn câu của Part 6 có tới 43 từ chạm được.
- Chi tiết dễ vấp: phải vẽ bằng `<div>` chứ không phải `<button disabled>` — trình duyệt KHÔNG gửi sự kiện
  chạm cho con của nút bị disabled. CSS đổi `button.option` → `.option`.

**2. Đồng hồ nhịp ở màn bộ đề (D46) — XONG.** Đo so với chuẩn, KHÔNG đếm ngược, không khoá gì (muốn đếm ngược
thật thì vào Thi thử). Mốc dùng chung ở `src/logic/pace.js`: Part 5 = 20 giây/câu · Part 6 = 30 · Part 7 = 60
(cộng lại đúng 75 phút phần Đọc) · Part 3/4 = 5 giây/câu và **chỉ chạy sau khi nghe xong**, vì nhịp phần nghe
do băng quyết định (con số 5 giây lấy từ mô tả giao diện thi của IIG mà Huy gửi).

**Hai lỗi thật bắt được khi xem bằng trình duyệt** (test jsdom không thấy vì jsdom không có cuộn trang):
- Chạm một từ ở cuối bộ là trang **nhảy về đầu**, mất chỗ đang đọc — vì vẽ lại thay sạch nội dung.
  Nay thao tác gạt từ giữ nguyên chỗ cuộn (`keepScroll` trong `capture-tray.js`).
- Ngược lại, bấm "Bộ tiếp theo" thì **không** về đầu bài mới mà rơi vào lưng chừng (`scrollToTop` trong `dom.js`).

**759 test pass** (thêm `tests/pace.test.js` và 5 test giao diện ở `ui-sets`). Đã xem thật trên Chromium
1280×900 và 375×812: hai cột, đồng hồ chạy 00:08→00:11, chấm xong ra "⏱ 00:17 · chuẩn 02:00 cho 4 câu —
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
| Đọc: màn chia đôi, văn bản trái, câu hỏi phải | `splitPane` | ✅ D41 |
| Danh sách câu chia theo phần để theo dõi | Nút "Danh sách câu" (palette) | ✅ |
| **Audio phát MỘT LẦN, không tua, không dừng** | Thi thử vẫn cho "▶ Nghe lại (đã nghe N lần)" | ❌ **lệch** |
| **Tự chuyển câu sau ~5 giây dừng** | App đợi Huy bấm Tiếp | ❌ **lệch** |
| **Đánh dấu câu chưa chắc để quay lại** | Chưa có (palette chỉ tô câu đã làm) | ❌ **thiếu** |
| Part 1 (6 câu tả tranh) | Không có (cần ảnh) | ❌ đã biết, 194/200 |
| Thanh trên hiện tổng số câu đã làm | Chỉ hiện trong palette, theo từng bộ | ⚠️ nhỏ |

**Đề xuất của Claude:** tách đôi rõ ràng — **màn LUYỆN giữ nguyên** (nghe lại thoải mái, chỉnh tốc độ
0.75×: đó là cách học), còn **màn THI THỬ làm đúng đề thật** (một lần, không tua, tự chuyển câu). Học và thi
là hai việc khác nhau; làm thi thử giống thật mới đo được sức thật. Chờ Huy chốt trước khi sửa (ràng buộc #8).

### Dọn nốt refactor (kế hoạch 1A/1B/1C ở cuối file)
- **1A XONG** — `pipeline/lib/cli.js` (`projectPath`, `today`, `flagValue`, `flagNumber`, `hasFlag`) + 8 test.
  Nối vào **cả 7 script** pipeline, không chỉ 4 script build: `audit-vocab` (cùng kiểu đọc cờ `--deck`),
  `coverage-part5` và `validate-content` (cùng cách tìm gốc project). Bớt 73 dòng chép tay, thêm 54.
  - Làm đúng như kế hoạch dặn: **gom "đọc MỘT cờ", KHÔNG gom thành một `parseArgs` chung** — mỗi script có bộ
    cờ riêng, mặc định của `--target` ở `build-sets` còn đổi theo `--part`.
  - `today` là HÀM chứ không phải hằng: pipeline chạy vài giờ có thể vắt qua nửa đêm, mỗi lô nên mang đúng ngày của nó.
  - **Đã chạy thật** (local có `.env`): `validate:content` (8 file nội dung + mọi MP3 tham chiếu) · `audit:vocab -- --deck bsl`
    (đọc đúng deck 1161 từ) · `audit:coverage` · `build-sets --part 9` và `--variant bogus` báo lỗi đúng, không gọi AI.
    Ba script build chưa chạy thật (tốn hạn mức AI) — phần đường dẫn của chúng dùng chung hàm đã chạy ở trên.
- **1B XONG** — `renderClips` + `EDGE_TTS_MISSING` + `AUDIO_FAILED_MESSAGE` trong `pipeline/lib/tts.js`
  (không đẻ file mới: đây đúng là module âm thanh). `build-listening` và `build-sets` bớt mỗi bên ~20 dòng.
  Nhận thẳng mảng `clips` đã dựng, không tự dựng — vì hai bên dựng khác nhau (`assembleEntry`/`assembleSet`).
  Giữ nguyên luật **có đoạn lỗi thì KHÔNG ghi file nội dung** (có test canh riêng).
  - Tiện thể: `build-sets` nay cũng báo tiến độ mỗi 40 đoạn như `build-listening` (quy tắc số 5).
  - **Đã chạy thật cả hai** (`--no-generate` nên không gọi AI): Part 3 = 77 đoạn, Part 2 = 288 đoạn,
    cả hai "0 mới, đã có đủ, 0 lỗi" và file nội dung ghi ra **y hệt từng byte** (git sạch).
- **1C (gộp listen/quiz) CHƯA làm** — kế hoạch ghi rõ rủi ro CAO, nên làm riêng một phiên. Xem mục cuối file.

## Phiên 2026-09-20 (khuya) — Soát codebase + refactor DRY — XONG giai đoạn A & B, ĐÃ MERGE VÀO MAIN

> **Đã merge vào `main` và push lúc kết phiên** → Cloudflare tự build và deploy (D27b).
> **Huy kiểm giúp:** mở app, xem dòng cuối màn chính có phải `bản 2026-09-20 12:xx` không. Nếu vẫn là bản cũ:
> Mac `Cmd+Shift+R`, iPhone đóng hẳn app rồi mở lại (service worker giữ bản cũ — xem mục "Sau mỗi lần deploy").
> *Claude KHÔNG tự kiểm được link thật: môi trường phiên này chặn `*.workers.dev` ở tầng proxy (403).*


Huy giao: "kiểm tra file dư thừa, refactor ở mức độ phù hợp, báo cáo phần nào đã làm phần nào chưa".
Cách soát: script đếm (a) export không ai import, (b) file không ai import, (c) dòng code giống hệt ở ≥ 2 file.

### ĐÃ REFACTOR (2 commit, 750 test pass)

**A. Lớp giao diện** (`refactor: gom code trùng lặp ở lớp giao diện`)
| Gom về | Thay cho | Số nơi dùng |
|---|---|---|
| `blocks.js` `backLink` / `backButton` | nút "← Bài thi" / "Về mục Từ vựng"… chép tay | 8 màn |
| `blocks.js` `verdictLine` + `explanationCard` | khối "Đúng/Sai + giải thích + bẫy" | 3 màn |
| `blocks.js` `letterFromKey` | đọc phím 1–4 / A–D | 3 màn |
| `blocks.js` `speedChooser` | hàng chọn tốc độ 0.75/1/1.25× | 2 màn |
| `word-detail.js` `renderWordHead` | mặt trước thẻ từ (từ + IPA + từ loại) | 3 màn |
| `audio-player.js` `createPlayerSlot` | chỗ tạo/huỷ bộ phát + tiêm bộ phát giả | 3 màn |
| `vocab-levels.js` `LEVEL_INFO[].css` | 3 bản `LEVEL_CLASS` chép tay | 3 màn |
| `exam-time.js` `SKILL_LABEL` | 2 bản nhãn Nghe/Đọc **khác chữ nhau** | 4 nơi |
- Bỏ **13 export** chỉ dùng trong chính file đó (đang giả vờ là API công khai) và **8 import thừa**.
- Bắt được một lỗi cùng loại vừa sửa ở Part 5: màn nghe Part 2 **lộ dạng câu hỏi** (`wh-where`) trước khi trả lời.

**B. Pipeline** (`refactor: gom luật luân phiên model`)
- `pipeline/lib/model-pair.js` + 9 test: ba pipeline (Part 5, Part 2, bộ Part 3/4/6/7) chép tay cùng một đoạn
  "hai model, hết hạn mức ngày thì đổi, tránh hai vai trùng model". Đây đúng là chỗ đã từng có lỗi thật (quy tắc #3).
- **Đổi hành vi có chủ đích:** `withRetry` không thử lại khi lỗi là hết hạn mức NGÀY — trước đây vẫn lùi
  2+4+8+16 giây rồi mới báo, phí ~30 giây mỗi lô. Có test canh cả hai loại 429 (theo ngày / theo phút).
- **CHƯA chạy thật ba script này** (môi trường phiên này không có `GEMINI_API_KEY`). Đã kiểm `node --check`
  và `npm run validate:content`. **Lần chạy pipeline tới, Huy để ý dòng log đầu tiên có đúng "Model sinh đề: … ·
  model kiểm định: …" không** — sai là biết ngay từ lô đầu, không mất hạn mức.

### CHƯA REFACTOR (cố ý, có lý do — để phiên sau làm tiếp)

1. **Pipeline: `parseArgs` + `path()` + `today`** lặp ở cả 4 script (`build-vocab/questions/listening/sets`).
   *Chưa làm vì* mỗi script có bộ cờ riêng (`--target`, `--part`, `--variant`, `--list`); gom phải thiết kế
   một bộ đọc cờ dùng chung. **Ước ~1 giờ, rủi ro thấp.** Nên làm trước tiên ở phiên sau.
2. **Pipeline: khối sinh âm thanh** (`EDGE_TTS`, `runLimited`, đếm created/existed/failed, thông báo lỗi edge-tts)
   lặp ở `build-listening` và `build-sets`, khoảng 25 dòng. *Chưa làm vì* hai bên lấy `clips` theo cách khác nhau.
   **Ước ~45 phút.**
3. **Pipeline: khối "báo cáo lô"** (`+N câu đạt · loại: … · trùng …`) và khối dựng `entry` (explanation/trap/verify)
   lặp ở `build-listening` và `build-questions`. **Ước ~30 phút.**
4. **UI: `listen-screen` và `quiz-screen` gần như cùng một màn** ("một câu · chấm ngay · giải thích · báo câu sai"),
   khác mỗi phần nghe. Gom được thành một bộ điều khiển chung nhưng **đây là refactor lớn nhất còn lại và rủi ro
   cao nhất** (hai màn đều có trạng thái riêng, khoá bàn phím, khay gạt từ). **Ước 2–3 giờ, nên làm riêng một phiên.**
5. **UI: phát âm thanh** (`playError`, `nowTurn`, thông báo lỗi phát) lặp ở `listen-screen` và `sets-screen`.
   Làm cùng lúc với mục 4 thì hợp lý hơn.
6. **Cố ý ĐỂ YÊN, không phải bỏ sót:**
   - `build-vocab.js` không dùng `model-pair`: nó xoay MỘT model (không cần cặp sinh/kiểm định) và có nhánh 401/403 riêng.
   - `pad()` ở `dashboard.js` (định dạng **ngày**) và `exam-time.js` (định dạng **khoảng thời gian**): trùng ký tự
     chứ không trùng kiến thức — gom lại là buộc hai thứ không liên quan vào nhau.
   - Các đoạn một dòng lặp đúng 2 lần (`byId`, `tierEntries`): đẻ hàm cho chúng còn rối hơn để nguyên.

### Quy tắc mới Huy đặt (đã vào CLAUDE.md)
- Trước khi tạo BẤT KỲ file nào: hỏi 3 câu — trùng chỗ khác không? đã có helper chưa? nhét vào module cũ được không?
- Tự đánh giá diff như người review trước khi commit; xong một giai đoạn thì commit + push.

## Phiên 2026-09-20 (tối) — Part 5 theo đề thật, chấm điểm, thi thử hai phần, UI hai cột — XONG, đã push
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
- **Menu bên trái (D43):** trên máy tính là cột cố định bên trái (Tổng quan · Từ vựng · Bài thi · Sao lưu),
  trên iPhone vẫn là thanh đáy như cũ. Tra từ gộp vào Từ vựng; Sao lưu/đồng bộ lên menu.
- **Đã xem bằng ảnh chụp trình duyệt thật** (Chromium 1440×900 và 390×844): Part 5, Part 6, Part 7, thi thử,
  màn chính — bố cục hai cột và menu đúng ý. Bắt được hai lỗi nhờ nhìn: nhãn câu Part 6 in thừa "Blank [1]",
  và nội dung quá hẹp trên màn rộng.
- **Mục Bài thi hiện điểm ước lượng của bài thi gần nhất** (không phải mở lại bài thi mới thấy).
- **736 test pass** (thêm: part5, score, ui-quiz, phases/numbering trong exam).

### CẦN HUY CHỐT — việc thứ 6 Huy nhắc (API đánh giá điểm mạnh/yếu)
Huy nói "sau cập nhật thêm mục nữa là chạy api đánh giá điểm mạnh điểm yếu, những điểm cần luyện và cách luyện".
Việc này **đụng ràng buộc #2** (không gọi AI lúc app chạy) nên tôi CHƯA làm, đã ghi thành **M20 trong PLAN.md**
với ba đường đi. Tóm tắt để Huy chọn:
1. **Không cần AI** — app tự tính từ nhật ký (yếu dạng nào, nhịp chậm chỗ nào) rồi khớp bảng lời khuyên viết sẵn.
   Offline, miễn phí, làm được ngay. *Claude đề xuất đường này trước.*
2. **AI trong pipeline** — xuất dữ liệu → chạy trên máy Huy → dán bản nhận xét vào app. Giữ ràng buộc, lời văn hay hơn.
3. **Gọi API lúc chạy** — phải sửa ràng buộc #2, cần proxy giữ khoá, và hạn mức miễn phí theo ngày sẽ có lúc lỗi.

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

> **Phiên sau chạy LOCAL trên máy Huy** (Huy quyết 2026-09-20), không chạy trên cloud nữa.
> Chạy local mở ra ba thứ phiên cloud KHÔNG làm được, nên tận dụng ngay:
> 1. có `.env` → **chạy được pipeline** (phiên cloud không có `GEMINI_API_KEY`);
> 2. mở được link thật (cloud bị proxy chặn `*.workers.dev`) → tự kiểm bản deploy;
> 3. mở được trình duyệt thật → nhìn bố cục bằng mắt, không phải chỉ chụp ảnh headless.

### 1. VIỆC ĐẦU TIÊN của phiên sau: dọn nốt refactor

Đợt soát 2026-09-20 đã gom xong lớp giao diện và luật luân phiên model. Còn lại 3 mục, xếp theo
**giá trị chia cho rủi ro** — làm từ trên xuống, mỗi mục một commit riêng.

**1A. Gom `parseArgs` + `path()` + `today` của 4 script pipeline** *(~1 giờ, rủi ro THẤP — làm trước)*
- Lặp ở: `pipeline/build-vocab.js`, `build-questions.js`, `build-listening.js`, `build-sets.js`.
- Ba dòng giống hệt nhau ở cả bốn file:
  `const path = (relative) => new URL(relative, ROOT).pathname;`
  `const today = new Date().toISOString().slice(0, 10);`
  và hàm đọc cờ `return index === -1 ? fallback : Number.parseInt(argv[index + 1], 10);`
- **Cái khó (đọc trước khi làm):** mỗi script có bộ cờ RIÊNG — `--target`, `--batch`, `--part`,
  `--variant`, `--list`, `--generate`. Nên helper phải là "đọc một cờ" chứ không phải "đọc hết cờ":
  vd `flag(argv, '--target', 200)` và `hasFlag(argv, '--generate')`, còn việc ghép thành object
  thì để từng script tự làm. Gom thành một `parseArgs` chung cho cả bốn là SAI hướng.
- Đặt ở đâu: thêm vào `pipeline/lib/` — cân nhắc gộp chung file với `path()` vì cùng là tiện ích chạy CLI.
- Kiểm tra: `node --check` từng file + `npm test` + chạy thử một lệnh có cờ thật (local có `.env`).

**1B. Gom khối sinh âm thanh của `build-listening.js` và `build-sets.js`** *(~45 phút, rủi ro TRUNG BÌNH)*
- Khoảng 25 dòng giống nhau: `EDGE_TTS`, kiểm tra đã cài edge-tts chưa, `runLimited(clips, 4, …)`,
  ba biến đếm `created/existed/failed`, dòng log tiến độ mỗi 40 đoạn, và luật
  **"có đoạn lỗi thì KHÔNG ghi file nội dung"** (luật này quan trọng, đừng làm rơi lúc gom).
- **Cái khó:** hai bên lấy danh sách `clips` theo cách khác nhau (Part 2 từ `assembleEntry`,
  các bộ từ `assembleSet`). Helper nên nhận thẳng mảng `clips` đã dựng sẵn, không tự đi dựng.
- Kiểm tra: chỉ chạy thật được ở local (cần `pipeline/.venv/bin/edge-tts`).

**1C. Gộp hai màn `listen-screen.js` và `quiz-screen.js`** *(~2–3 giờ, rủi ro CAO — nên làm RIÊNG một phiên)*
- Hai màn gần như cùng một thứ: "một câu · chấm ngay · giải thích · nút báo câu sai · lượt có bộ đếm",
  khác mỗi phần nghe và số phương án (3 với Part 2, 4 với Part 5).
- Đã giống nhau tới mức chép tay cả tên hàm: `answer()`, `report()`, `next()`, `roundQueue()`.
- **Vì sao rủi ro cao:** mỗi màn giữ trạng thái riêng ở mức module (`picked`, `locked`, `doneThisRound`,
  `heard`, `nowKey`), có khoá bàn phím riêng, và Part 5 còn có khay gạt từ + lượt theo mặt cắt đề thật (D39).
  Gộp ẩu là vỡ cả hai. **Điều kiện an toàn:** `tests/ui-listen.test.js` (18 test) và `tests/ui-quiz.test.js`
  (9 test) phải xanh nguyên vẹn, KHÔNG được sửa test cho vừa code mới.
- Gợi ý hướng: tách phần "vòng lặp một lượt câu hỏi" thành một bộ điều khiển chung nhận cấu hình
  (số phương án, có phần nghe hay không, cách dựng lượt), còn phần vẽ giữ riêng từng màn.

**Đã cố ý KHÔNG gom — đừng làm lại cho mất công:**
- `build-vocab.js` không dùng `model-pair`: nó xoay MỘT model (không cần cặp sinh/kiểm định) và có nhánh 401/403 riêng.
- `pad()` ở `dashboard.js` định dạng **ngày**, ở `exam-time.js` định dạng **khoảng thời gian** — trùng ký tự
  chứ không trùng kiến thức.
- Đoạn một dòng lặp đúng 2 lần (`byId`, `tierEntries`): đẻ hàm cho chúng còn rối hơn để nguyên.

### 2. Việc của Huy trên máy thật (chưa ai kiểm, tôi không kiểm hộ được)
- **Đối chiếu số hiệu bản build** ở cuối màn chính trước khi kết luận bất cứ lỗi nào.
- Mac: menu trái có hiện không; Part 5 và Part 7 có đúng hai cột không; thi thử "Riêng Part 6"
  trọn một vòng → nộp → xem **điểm ước lượng** có hợp lý không.
- iPhone: thanh tab đáy + một cột còn nguyên không (CSS điều hướng vừa đổi, đây là chỗ dễ vỡ nhất).
- **Nghe thử thật Part 2/3/4 trên iPhone** — test dùng bộ phát GIẢ nên lỗi âm thanh không thể lộ ra bằng test.
- M5: đăng nhập + "Đồng bộ ngay" trên cả hai máy (càng học nhiều trước khi bật thì dữ liệu càng lệch).
- Part 5 nay mặc định **30 câu/lượt** (đúng đề thật) thay vì 15 — thấy dài thì đổi ở chip "Mỗi lượt".

### 3. Lần chạy pipeline tới — kiểm giúp một dòng
Ba script (`build:questions`, `build:listening`, `build:sets`) vừa đổi sang `lib/model-pair.js` nhưng
**chưa chạy thật lần nào** (phiên cloud không có khoá API). Dòng log đầu phải có dạng
`Model sinh đề: … · model kiểm định: …`. Sai thì lộ ngay từ lô đầu, chưa tốn hạn mức.

### 4. Sau refactor thì tới (theo thứ tự tôi đề xuất)
1. **M16 — cứu bài thi đang làm dở**: hiện thoát giữa chừng là mất sạch; đề đủ dài 2 tiếng nên đây là rủi ro thật.
2. **Đa dạng đề thi**: Part 3/4/6 mới đủ ĐÚNG MỘT đề (13/10/4 bộ) → thi lần hai gặp lại y hệt.
   `npm run build:sets -- --part N --target M`, chạy các Part **nối tiếp**, không song song (chung hạn mức AI).
3. **M20 — nhận xét điểm mạnh/yếu** (D44): *nên hoãn tới khi Huy đã học thật vài tuần* — nó đọc nhật ký
   làm bài, mà ít dữ liệu thì nhận xét chỉ ra câu chung chung. Phần đo đạc làm trước, AI viết lời khuyên sau.
4. M10 còn dở (bảng/biểu Part 3, đánh dấu câu chứa đáp án trong transcript) — **PLAN.md đang đánh dấu `[x]`
   nhưng thực tế chưa xong; Huy xác nhận giúp là tính xong hay để mở.** M11 (dictation) chưa làm.
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
