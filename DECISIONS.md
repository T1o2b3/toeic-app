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

**D19. Giới hạn thật của Gemini free tier (đo ngày 2026-09-19) và cách sống chung.**
- Hạn mức tính theo **số request mỗi NGÀY, riêng cho từng model, từng project**
  (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`) — không tính theo số từ hay token.
- Model đầu bảng `gemini-3.8-flash` và `gemini-flash-latest`: **20 request/ngày**. `gemini-2.5-flash`
  và `gemini-2.5-flash-lite` đã bị gỡ khỏi v1beta (404). `gemini-3.5-flash` hạn mức cao hơn rõ rệt
  (chạy >15 request vẫn chưa cạn).
- Cách xử lý đã làm: (a) pipeline tự xoay vòng danh sách model khi cạn hạn mức ngày;
  (b) gộp 50 từ/request → 1250 từ chỉ tốn ~25 request; (c) cache theo từ nên chạy lại tiếp đúng chỗ dở;
  (d) bộ đọc JSON vớt được mục nguyên vẹn khi kết quả bị cắt → không mất trắng một request nào.
- **Không** tạo nhiều project Google để nhân hạn mức: lách giới hạn nhà cung cấp, rủi ro khoá tài khoản,
  trái tinh thần ràng buộc "miễn phí trong khuôn khổ họ cho".
- Dự phòng nếu Gemini siết tiếp: thêm provider OpenRouter (D14 đã chuẩn bị interface), hoặc chỉ sinh thẻ
  cho từ Huy đánh dấu "chưa biết" ở màn triage M3 thay vì cả 1250 từ.

## Kỹ thuật

**D20. Pipeline viết bằng Node.js** (cùng ngôn ngữ với app). TTS gọi CLI, không cần viết Python.

**D21. Frontend:** Vite + JavaScript thuần, hash router tự viết, tách `src/logic` (thuần, test được) và `src/ui`. Trade-off: không có framework → phải giữ kỷ luật cấu trúc.

**D22. PWA bằng vite-plugin-pwa** (tránh lỗi cache cũ khi deploy). Vẫn giải thích cơ chế service worker để học.

**D23. Dữ liệu người dùng = nhật ký sự kiện append-only.** Sự kiện `{id: uuid, deviceId, ts, type, payload}`, bất biến. Đồng bộ = trao đổi sự kiện còn thiếu → không xung đột. Trạng thái (lịch ôn, từ hay sai, thống kê) tính lại từ nhật ký. Cài đặt/tên deck dùng last-write-wins. Trade-off: tính lại mỗi lần mở app (không đáng kể với 1 người dùng).

**D24. Offline-first:** ghi vào IndexedDB trước, đồng bộ Supabase sau.

**D25. Supabase free:** chỉ lưu sự kiện + cài đặt. RLS bắt buộc. Đăng nhập **OTP 6 số qua email** (magic link mở nhầm Safari thay vì PWA trên iPhone). Free project tự tạm dừng sau 7 ngày không hoạt động → GitHub Actions ping định kỳ. Free không có backup tự động → nút xuất JSON + backup định kỳ.

**D25b. Giới hạn thật của Supabase free tier về email đăng nhập (đo từ tài liệu chính thức 2026-09-19).**
- **Chỉ 2 email/giờ** với bộ gửi mail sẵn có của Supabase (`Emails sent by Supabase Auth`, giới hạn theo
  project). Huy có 3 thiết bị → đăng nhập cả 3 trong một giờ sẽ bị chặn ở máy thứ ba.
  Cách sống chung: đăng nhập 2 máy trước, máy thứ ba sau 1 giờ. Đây là chi phí MỘT LẦN cho mỗi máy vì
  phiên đăng nhập được lưu lại và tự gia hạn (`persistSession`, `autoRefreshToken`).
- Mỗi người dùng chỉ xin mã mới được sau **60 giây**; mã hết hạn sau **1 giờ**.
- **Mặc định Supabase gửi magic link, KHÔNG gửi mã 6 số.** Phải sửa mẫu email "Magic Link" để chèn biến
  `{{ .Token }}` thì mới có mã. Không sửa thì màn đăng nhập của app vô dụng (D25 chọn OTP vì trên iPhone
  magic link mở Safari chứ không mở PWA).
- Nếu sau này 2 email/giờ thành vướng thật: gắn SMTP ngoài có free tier (Brevo, Resend). Chưa làm —
  chỉ thêm dịch vụ khi đã chạm giới hạn thật, không thêm phòng xa.

**D25c. Thay phần đăng nhập của D25: dùng email + mật khẩu, KHÔNG dùng OTP.** (Huy đồng ý 2026-09-19)
- **Lý do bắt buộc phải đổi:** Supabase không còn cho sửa mẫu email nếu chưa cấu hình SMTP riêng
  (dashboard hiện dòng "Set up custom SMTP to edit templates", ô Subject/Body bị khoá). Mẫu mặc định
  chỉ gửi magic link, không có biến `{{ .Token }}` → không lấy được mã 6 số.
  Mà magic link chính là thứ D25 muốn tránh: trên iPhone nó mở Safari, phiên đăng nhập nằm ở Safari
  còn PWA đã cài vẫn chưa đăng nhập.
- **Phương án đã cân nhắc và loại:** gắn SMTP ngoài (Brevo/Resend đều có free tier) để mở khoá việc sửa
  mẫu email. Loại vì phải thêm một dịch vụ bên thứ ba, thêm tài khoản phải quản và xác minh người gửi —
  chỉ để tự gửi mã cho chính mình. Không tương xứng với app cá nhân một người dùng (ràng buộc #8).
- **Hệ quả tốt kèm theo:** không gửi email lần nào → mất luôn giới hạn 2 email/giờ ghi ở D25b,
  đăng nhập cả 3 máy trong vài phút được.
- **Đánh đổi chấp nhận:** phải nhớ thêm một mật khẩu. Bảo vệ dữ liệu thật sự vẫn nằm ở RLS, không phụ
  thuộc cách đăng nhập. Cần tắt "Confirm email" trong Supabase để việc tạo tài khoản không phải chờ email.
- D25b vẫn giữ nguyên để biết vì sao đã từng chọn OTP; phần "đăng nhập OTP" của D25 coi như bị mục này thay.

**D26. Ôn từ bằng FSRS** (thư viện mã nguồn mở), bọc sau interface riêng. Nhờ D23, đổi thuật toán sau này chỉ cần tính lại.

**D27. Host: Cloudflare Pages** (repo private vẫn deploy miễn phí). Hash router nên không cần cấu hình server.

**D27b. Cập nhật D27 (không đổi bản chất):** Cloudflare đã gộp Pages vào **Workers & Pages**; project tạo mới chạy dưới dạng
Worker phục vụ file tĩnh, nên tên miền là `*.workers.dev` chứ không phải `*.pages.dev`.
Link thật: https://toeic-app.huybndc-451.workers.dev. Vẫn miễn phí, vẫn tự deploy mỗi lần push lên `main`, repo vẫn private.

**D28. Test:** Vitest cho `src/logic` và `pipeline` (schema, chấm điểm, FSRS wrapper, gộp sự kiện). Không test UI.

**D29. Phân loại từ vựng theo 4 mức thay vì hai nút biết / chưa biết.** (Huy đề xuất 2026-09-19)
- **Vấn đề:** "đã biết" gộp chung hai thứ rất khác nhau — từ đọc hiểu được trong câu, và từ tự
  viết/dùng ra được. Với mục tiêu 850 → 950 thì phần lớn từ nằm đúng ở khoảng giữa đó, nên gộp lại
  thành một nút làm mất chính thông tin cần để xếp lịch ôn. Màn phân loại lại không hiện nghĩa,
  nên việc tự chấm dựa vào cảm giác "quen mặt chữ" chứ không phải biết nghĩa thật.
- **Bốn mức:** `unknown` không biết hoàn toàn · `context` gặp rồi, đoán được nghĩa theo ngữ cảnh ·
  `spelling` hiểu nghĩa nhưng không tự viết ra được · `fluent` dùng thành thạo.
  Chỉ `fluent` mới bị loại khỏi hàng đợi học; ba mức còn lại đều học, nhưng `unknown` được học trước.
- **Tương thích ngược (ràng buộc #5):** nhật ký là append-only nên sự kiện cũ `{known}` phải đọc đúng
  mãi mãi (`known: true` → `fluent`, `known: false` → `unknown`). Sự kiện MỚI vẫn ghi kèm `known`
  để máy còn chạy bản app cũ trong bộ nhớ đệm service worker không xếp nhầm từ. Không sửa nhật ký cũ.
- **Hiện nghĩa khi phân loại:** mặc định BẬT, tắt được (lưu trong localStorage từng máy).

**D30. Thêm deck cao cấp BSL (chỉ BSL, KHÔNG lấy NAWL), cân đối theo đúng trình độ Part 5.** (Huy giao toàn quyền quyết định 2026-09-19)
- **Số liệu dẫn tới quyết định:** đo trên chính ngân hàng 200 câu Part 5 đã sinh, các phương án của
  câu `errorType: vocabulary` chỉ có **32% nằm trong deck TSL** hiện tại. Những từ đề đang hỏi —
  `amend`, `abolish`, `enforce`, `inadequate`, `thereby`, `erratic` — không có từ nào trong deck,
  trong khi deck lại dạy `mister`, `apple`, `jazz`, `balcony`.
- **Nguyên nhân:** TSL 1.2 là danh sách **bổ sung cho NGSL**, gồm 1250 từ đặc thù TOEIC ở tầng nền —
  đúng cho người 500–700 điểm. Kiểm chứng: `interview`, `raise`, `frequent`, `suspend`, `meanwhile`
  đều KHÔNG có trong TSL vì chúng thuộc NGSL. Tầng nền này Huy đã biết gần hết.
- **Quyết định:** thêm **BSL 1.20** (Business Service List, 1744 từ), lọc bỏ phần trùng TSL →
  **1169 từ mới** thuộc tầng trên (`equity`, `depreciation`, `hedge`, `amend`, `abolish`, `encompass`).
  Cùng nguồn newgeneralservicelist.com, cùng license CC BY-SA 4.0 đã duyệt ở D18 → không phát sinh
  ràng buộc mới. Phủ sóng từ vựng Part 5 tăng từ **32% lên 53%**; phần còn thiếu chủ yếu là từ NGSL
  (Huy đã biết ở mức 850) và dạng phái sinh (`inaccessible`, `reconfigure`).
- **ĐÃ LOẠI NAWL sau khi đo lại** (ban đầu định lấy, xem D30b): New Academic Word List là từ vựng
  HỌC THUẬT, phần lớn là khoa học — `electron`, `membrane`, `chemotherapy`, `capillary`, `consonant`,
  `archaeology`. TOEIC là tiếng Anh công sở. Đo cụ thể: NAWL chỉ thêm đúng **1 từ** vào phủ sóng
  Part 5 (53% → 56%) trong khi kéo theo 392 từ gần như không bao giờ gặp trong đề.
- **Kiểm chứng kèm theo:** TSL và NGSL **không giao nhau một từ nào** (0/1250) — xác nhận TSL đúng là
  danh sách bổ sung cho NGSL, nên không dùng NGSL để phân tầng trong TSL được.
- **Kèm theo:** gắn `level` (cơ bản / trung cấp / cao cấp) cho mọi từ để Huy bỏ qua tầng dễ ngay,
  không phải chờ pipeline sinh xong.
- **Phương án đã loại:** (a) chỉ phân tầng deck hiện có — không giải quyết gốc, 77% từ Part 5 vẫn
  không có để học; (b) để AI tự nghĩ ra danh sách từ cao cấp — không có tần suất kiểm chứng,
  dễ bịa từ hiếm vô dụng, trái tinh thần D18.
- **Chi phí:** 0 đồng. Tốn hạn mức AI free tier (~20 request/ngày/model, gộp 50 từ mỗi request)
  nên pipeline chạy nền nhiều ngày.

**D30b. Vì sao D30 bị sửa ngay trong ngày.** Bản đầu của D30 chọn "BSL + NAWL" khi mới chỉ đếm số từ
hai danh sách bổ sung được (1561 từ), CHƯA nhìn vào nội dung của NAWL. Đo lại theo đúng thứ cần đo —
phủ sóng từ vựng Part 5 — mới thấy NAWL đóng góp 1 từ. Ghi lại đây để lần sau đo giá trị thật
(phủ được bao nhiêu thứ đang cần) trước, đừng lấy số lượng làm bằng chứng.

**D31. Phân tầng từ vựng (cơ bản / trung cấp / cao cấp), suy ra lúc chạy chứ không ghi vào file nội dung.**
- **Vấn đề:** deck TSL xếp theo tần suất nên màn phân loại luôn bắt đầu từ từ phổ biến nhất —
  đúng 400 từ Huy đã biết hết. Phải lướt hết chúng mới chạm tới từ đáng học.
- **Cách chia:** TSL rank ≤ 400 = cơ bản · TSL rank > 400 = trung cấp · deck khác TSL (BSL) = cao cấp.
- **Suy ra từ `rank` + `deck` có sẵn trong mỗi mục, KHÔNG thêm trường vào file đã phát hành** (D16).
  Đổi ngưỡng sau này chỉ sửa `src/logic/deck-tiers.js`, không phải sinh lại deck, không đụng nhật ký.
- **Thành thật về giới hạn:** trong TSL, rank chỉ là proxy — `apple` và `culinary` cùng ở rank 620-630
  vì SFI bằng nhau (phần đuôi danh sách xếp theo alphabet trong các nhóm SFI trùng). Tầng chỉ quyết định
  THỨ TỰ gặp từ; việc tách "đã biết / chưa biết" vẫn do Huy tự chấm 4 mức (D29).
- **Mặc định KHÔNG lọc** (ràng buộc #9: không âm thầm đổi hành vi). Huy tự chọn tầng ở màn chính.

**D32. Xem lại từ đã phân loại, sửa mức, và ôn chủ động (Kho từ vựng + Ôn chủ động + lối thoát ở màn phân loại).**
- **Vấn đề Huy báo:** màn phân loại buộc chọn đúng 1 trong 4 mức, chấm xong là qua từ khác — không có
  cách nhìn lại từ đã chấm, không sửa được khi lỡ tay, và những từ chấm "thành thạo" bị loại hẳn khỏi hàng
  đợi nên không bao giờ hiện lại ở đâu để kiểm tra. Ngoài ra không có cách tự chủ động ôn ngoài lịch.
- **Chẩn đoán:** "1 trong 4" bản thân là thang chấm đúng (D29); cái thiếu là **lối thoát** và **chỗ nhìn lại**.
  Tự chấm hay sai theo hướng *tưởng mình biết* — và từ "thành thạo" là mức duy nhất không có cơ chế tự sửa.
- **Phương án đã cân nhắc:**
  (a) cho chọn nhiều mức cùng lúc / thêm nhãn — **loại**: mức là thang thứ tự, chọn nhiều thì vô nghĩa và
      làm chậm đúng màn cần lướt nhanh;
  (b) nhét thêm nút vào màn chính — **loại**: màn chính đã 9 nút;
  (c) thanh tab dưới đáy, tách app thành 4 khu — **hoãn**: tái cấu trúc cả điều hướng, ngoài phạm vi, để
      dành nếu số màn còn tăng;
  (d) **chọn:** sửa nhỏ màn phân loại + hai màn mới, mỗi màn một việc.
- **Đã làm:**
  1. **Màn phân loại:** thêm *Để sau* (ẩn tạm, không tính vào lượt, không ghi nhật ký) và *Từ trước*
     (lùi để chấm lại). Nhật ký append-only (ràng buộc #5) nên KHÔNG có "hoàn tác" thật: chấm lại là ghi
     thêm một sự kiện `vocab.triaged` mới, sự kiện sau thắng, sự kiện cũ còn nguyên. Không thêm loại sự
     kiện mới → bản app cũ trong cache vẫn đọc đúng.
  2. **Kho từ vựng** (`#/words`): lọc theo Tất cả / Chưa phân loại / 4 mức / Đánh dấu, tìm theo từ hoặc nghĩa
     (gõ không dấu vẫn ra), bấm một từ để xem đủ nội dung và đổi mức. Là nơi duy nhất thấy được từ "thành thạo".
     Không lọc theo tầng: kho là nơi xem toàn bộ, tầng chỉ quyết định thứ tự gặp từ khi học (D31).
  3. **Ôn chủ động** (`#/practice`): tự chọn nhóm (thành thạo / hay sai / đánh dấu / đang học), mỗi lượt 10 từ.
- **Quyết định then chốt — ôn chủ động KHÔNG đụng lịch FSRS.** Chấm sớm một thẻ chưa đến hạn làm thuật toán
  tính sai độ bền trí nhớ, và với nhịp 1–2 giờ/tuần (D03) không được để nó làm hàng đợi phình. Ngoại lệ duy
  nhất, và cũng là giá trị thật của màn này: **quên một từ đã chấm "thành thạo" → hạ xuống "đoán được"**
  (ghi `vocab.triaged` như bình thường) để từ đó vào lại hàng đợi học. Chọn "đoán được" thay vì "không biết"
  vì Huy từng biết từ đó: nó vào giữa thứ tự ưu tiên chứ không lên đầu.
- **Chỉ có 2 nút chấm (Vẫn nhớ / Quên rồi), không dùng 4 mức Quên/Khó/Tốt/Dễ:** vì kết quả không đưa vào
  FSRS nên 4 mức không có tác dụng gì; nút thừa chỉ làm chậm. Phím Space chỉ lật thẻ, KHÔNG chấm "nhớ"
  (khác màn ôn thẻ) — gõ nhầm thành "nhớ" là cách duy nhất làm hỏng kết quả tự kiểm tra.
- **Danh sách từ của lượt chốt một lần lúc bắt đầu** (không tính lại mỗi lần vẽ) vì hạ mức một từ làm nó rời
  nhóm "thành thạo" giữa chừng — cùng họ với lỗi cửa sổ trượt (quy tắc số 7).
- **Chưa làm (cố ý, ràng buộc #8):** ghi thống kê ôn chủ động vào nhật ký (cần loại sự kiện mới + sửa đồng
  bộ) — chưa có nhu cầu; sửa hàng loạt nhiều từ một lúc trong kho.

**D33. IPA lấy từ Wiktionary theo lô, thay dictionaryapi.dev (thực thi D11, không đổi nguồn đã duyệt).**
- **Vấn đề:** dictionaryapi.dev chập chờn rồi chết hẳn ngày 2026-09-19 (timeout 4/4 lần thử) — deck chỉ có
  35/1243 từ TSL có IPA, và tra tuần tự từng từ nên 2400 từ cũng không xong nổi.
- **Cách làm:** hỏi Wiktionary theo lô 20 trang/request (`pipeline/lib/ipa-wiktionary.js`), đọc mục English,
  lấy mẫu `{{IPA|en|/…/|a=US}}`. Ưu tiên giọng Mỹ (a=US/GA/GenAm) → mẫu không gắn giọng → mẫu đầu tiên.
- **Bài học từ hai lỗi lúc triển khai (đều đã có test canh):**
  1. `User-Agent` viết tiếng Việt có dấu → `fetch` ném TypeError *trước khi gửi*, lỗi bị nuốt thành "lỗi tạm
     thời" → 2400 từ báo lỗi dù mạng tốt. Fetch giả trong test không kiểm tra header nên lọt qua. Nay có test
     dùng chính `Headers` của Node.
  2. Chạy hai deck song song, mỗi deck 3 luồng → HTTP 429. Nay: 1 luồng, nghỉ 1s giữa lô, đọc `Retry-After`
     rồi thử lại (tối đa 4 lần), và **chạy các deck NỐI TIẾP**, không song song. Wikimedia là dịch vụ miễn phí
     dùng chung — không ép nó.
- **Ghi nguồn:** IPA là dữ kiện phát âm, không phải văn bản của Wiktionary; vẫn ghi nguồn ở đây cho rõ.
  Wiktionary: CC BY-SA 4.0. Nếu sau này đưa vào app chuỗi văn bản (nghĩa, ví dụ) lấy từ Wiktionary thì phải
  thêm attribution vào deck (D18).
- `pipeline/lib/ipa.js` (dictionaryapi.dev) không còn được gọi; giữ lại chưa xoá, dọn khi chắc chắn không quay lại.

**D34. Gạt từ lạ lúc làm Part 5 vào danh sách cần học (chạm hoặc kéo thả, không hiện nghĩa).**
- **Yêu cầu của Huy:** đang làm bài kiểm tra không phải từ vựng mà gặp từ chưa biết, muốn đánh dấu nó vào
  danh sách cần học NGAY, nhưng không xem nghĩa lúc đó (giữ mạch làm bài). Học từ vựng và học các môn khác
  vẫn tách riêng — đây chỉ là cầu nối một chiều từ bài luyện sang danh sách học.
- **Tương tác:** từng từ trong câu là một nút bấm/kéo được. **Mac:** kéo từ thả vào khay "Cần học".
  **iPhone:** chạm từ → khay hiện `＋ Cần học`. Cả hai gọi cùng một hàm. Vì sao không kéo thả thuần: HTML5
  drag-and-drop với chữ trên cảm ứng iOS không ổn định, còn tự viết bằng pointer events thì tốn công gấp
  nhiều lần mà chạm-rồi-bấm đã nhanh ngang kéo thả. Nếu Huy thấy thiếu, thêm pointer events sau.
- **Từ trong phương án A–D chỉ gạt được SAU khi trả lời:** trước đó việc đánh dấu từ nào là gợi ý ngầm cho
  đáp án. Sau khi trả lời thì hiện hàng chip `＋ từ` dưới phần giải thích.
- **Hai kiểu từ gạt được:**
  1. Đã có trong deck (khớp đúng, hoặc qua dạng gốc: raised→raise, rising→rise, stopped→stop): ghi
     `vocab.captured` + một `vocab.triaged` để vào hàng đợi học. Chưa phân loại → "không biết"; đang
     "thành thạo" → hạ xuống "đoán được"; đang học sẵn → không đổi gì (lịch FSRS giữ nguyên).
  2. Chưa có trong deck: chỉ ghi `vocab.captured`. **Không có nghĩa để làm thẻ** vì không gọi AI lúc chạy
     app (ràng buộc #2). Hiện ở Kho từ vựng › "Đã gạt" kèm số lần gặp và nút "Tra nghĩa ↗" (Wiktionary).
- **Nhật ký:** thêm loại sự kiện `vocab.captured {word, wordId?, questionId}`. Bản app cũ trong cache gặp loại
  sự kiện lạ thì bỏ qua (reducer có nhánh `default`), cột `type` của Supabase là text không ràng buộc nên đồng
  bộ không cần sửa. Sự kiện gạt KHÔNG tự đổi trạng thái học — chỉ `vocab.triaged` kèm theo mới đổi.
- **Tra lại theo deck HIỆN TẠI, không tin `wordId` lúc gạt:** từ gạt lúc deck chưa có, sau này pipeline sinh
  ra rồi thì tự chuyển sang "đã có thẻ" mà không cần sửa nhật ký.
- **Chỉ tách từ gồm chữ cái, dài từ 3 ký tự** (bỏ `to`, `of`, số, chỗ trống ----). Không gạt hai lần cùng
  một từ ở cùng một câu; cùng từ ở câu khác thì tính thêm một lần gặp (từ gặp nhiều là từ đáng học trước).
- **Chưa làm (cố ý, ràng buộc #8):** biến danh sách "chưa có trong deck" thành thẻ học — cần một bước pipeline
  đọc file xuất dữ liệu rồi sinh deck `my-words` (D04 đã chừa chỗ ở `OPTIONAL_DECKS`). Ghi vào Backlog.

**D35. Luyện nghe Part 2: pipeline âm thanh (M8) + màn luyện nghe (M9); chốt Q1 (âm thanh để chung repo).**
- **Vì sao Part 2 trước:** TOEIC Listening chiếm nửa bài thi mà app chưa có gì cho phần nghe. Part 2 (hỏi - đáp ngắn)
  là phần rẻ nhất để làm đúng: 4 đoạn ngắn mỗi câu, không cần bảng biểu, đủ để dựng toàn bộ đường ống âm thanh
  (sinh → lưu → phát → offline) mà Part 3–4 sẽ dùng lại.
- **Nguồn giọng:** `edge-tts` (giọng đọc của Edge, miễn phí, không key) — thoả ràng buộc #1. Là dịch vụ KHÔNG chính
  thức của Microsoft, có thể đổi/chặn bất cứ lúc nào. Cách giảm rủi ro: **file MP3 đã sinh được commit vào repo**,
  app KHÔNG phụ thuộc dịch vụ này lúc chạy (ràng buộc #2 tương tự AI); chỉ pipeline mới cần, chạy trên máy Huy.
  5 giọng xoay vòng (Mỹ nam/nữ, Anh nam/nữ, Úc nữ); người hỏi và người đáp luôn khác giọng.
- **Q1 chốt: âm thanh để CHUNG repo** (`public/audio/`, ~85 KB mỗi câu, tức ~6 MB cho 72 câu). Đổi sang bucket riêng
  (Cloudflare R2) khi repo quá ~100 MB hoặc khi thêm Part 3–4. Tên file = hash(giọng + lời) nên đổi lời hay giọng thì
  ra file mới, không đè file cũ (D16); pipeline tự xoá file mồ côi.
- **Giọng tổng hợp khác giọng người thật:** ít ngập ngừng, ít giọng vùng miền và nhiễu nền hơn đề thật. Luyện được
  kỹ năng nghe hiểu và bẫy âm/lặp từ, nhưng KHÔNG thay được việc nghe đề thật ở giai đoạn thi thử (M15).
- **Nội dung:** vẫn kiểm định 2 bước như Part 5 (D12) — model B tự giải không thấy đáp án, lệch hoặc "quá dễ" thì loại.
  Prompt (part2-v2) ép mỗi câu có bẫy gần âm/lặp từ, một câu đáp trả lời câu hỏi khác, và đáp án đúng tự nhiên/gián tiếp.
- **Bài học: xoay vị trí đáp án làm hỏng lời giải thích.** AI ra đề dồn đáp án vào B nên pipeline xoay chỗ các câu đáp
  cho chia đều A/B/C — nhưng lời giải thích AI viết còn nhắc chữ cái ("đáp án B", "câu A"), sau khi xoay thì SAI
  (lần chạy đầu: hiện ✔A mà giải thích nói B). Sửa ở gốc: prompt v2 cấm nhắc chữ cái, bộ lọc `mentionsChoiceLetter`
  loại bản thảo vi phạm, và bản v1 đã bỏ đi sinh lại. Không sửa bằng cách thay chữ cái trong văn bản (dễ sót).
- **Trải nghiệm làm bài:** chỉ thấy ba nút A/B/C, không có chữ (đúng bài thi). Nút chọn KHOÁ tới khi nghe hết một lượt
  (câu hỏi + 3 câu đáp). Tốc độ 0.75× / 1× / 1.25× (giữ cao độ). Trả lời xong mới hiện transcript, giải thích, và cho
  gạt từ lạ (D34). Lượt 10 câu (nghe mỏi nhanh hơn đọc). Kết quả ghi bằng cùng sự kiện `question.answered` nên thống kê
  lỗ hổng theo dạng câu dùng chung với Part 5; trường `errorType` giữ nguyên tên để tái dùng code.
- **Ràng buộc của iPhone quyết định thiết kế bộ phát** (`src/ui/audio-player.js`): (1) chỉ MỘT phần tử Audio cho cả
  chuỗi; (2) TẢI TRƯỚC mọi đoạn thành blob khi câu hiện ra, để chạm nút Nghe thì `audio.play()` gọi được đồng bộ — nếu
  phải `await fetch` trước, Safari coi là hết thao tác chạm và chặn; (3) phát từ blob thay vì URL nên tránh request
  Range (Safari đòi, cache offline không lưu được 206).
- **Offline:** âm thanh KHÔNG nhét vào precache (hàng MB, tải hết lúc cài app quá nặng); service worker dùng CacheFirst
  cho `/audio/`, lưu dần khi nghe. Câu chưa nghe lần nào thì offline chưa nghe được — chấp nhận, vì học từng lượt.
- **Chưa làm (ràng buộc #8):** Part 3–4 (hội thoại/bài nói, cần bảng biểu và nhiều giọng trong một đoạn), đọc trước câu
  hỏi có giờ (M10), dictation câu nghe sai (M11). Ghi âm thanh thuần từng phần nên đường ống này dùng lại được.

**D36. Tổ chức lại app: thanh tab (Tổng quan · Từ vựng · Bài thi · Tra từ), dashboard mới, màn Tra từ.**
- **Vì sao:** màn chính chứa lẫn mọi nút của từ vựng và bài thi (~12 nút) nên khó tìm, và không cho biết mình đang
  tiến bộ hay không. Nay: Tổng quan = "làm gì hôm nay + đang tiến tới đâu"; nút học nằm ở mục Từ vựng / Bài thi.
- **Thanh tab dưới đáy** (hợp iPhone/PWA), ẩn trong các phiên học (phân loại, ôn thẻ, luyện câu, nghe, ôn chủ động)
  vì các màn đó có hàng nút chấm dính đáy. Nằm ngoài #app nên vẽ lại màn không làm nó nháy. Nút "←" ở các màn học
  trỏ về đúng mục (Từ vựng / Bài thi) thay vì về màn chính.
- **Ba số đầu dashboard** (thay cho "việc trong 7 ngày / ngày có học / thẻ đến hạn" — Huy thấy vô nghĩa):
  1. *Học tuần này* — số phút ƯỚC TÍNH (số việc × thời gian trung bình; nhật ký không ghi giờ) so với mục tiêu
     90 phút/tuần (giữa 1–2 giờ/tuần), có thanh tiến độ;
  2. *Từ nhớ vững* — thẻ có lần ôn kế tiếp cách ≥ 21 ngày (ngưỡng thẻ trưởng thành của Anki): khó "tự khen" hơn mức
     "thành thạo" tự chấm; kèm chênh lệch so với tuần trước, tính lùi bằng cách dựng lại trạng thái từ nhật ký;
  3. *Đúng ở bài thi* — độ chính xác gộp Part 5 + nghe, 7 ngày, xu hướng so với tuần trước (mũi tên + chữ).
- **KHÔNG làm "dự đoán điểm" ở giai đoạn này** (Huy gợi ý): câu hỏi do AI ra đề nên độ khó không hiệu chuẩn theo đề
  thật, chưa có Part 3/4/6/7, chưa có bài thi thử đủ bộ. Một con số điểm bây giờ là số bịa có vẻ khoa học, dễ làm
  người học tin sai. Làm sau khi có bài thi thử đủ bộ (M15) và đủ dữ liệu để đối chiếu (PLAN.md, Backlog).
- **Biểu đồ** theo skill dataviz, chạy `validate_palette.js` (không đánh giá bằng mắt): cột xếp chồng 14 ngày dùng 3 màu
  đầu của bảng đã kiểm định (xanh/cam/ngọc) — đạt mọi cổng, riêng màu ngọc dưới 3:1 nên bù bằng chú thích chữ, số in
  trực tiếp và bảng "Xem dạng bảng"; thanh mức từ vựng dùng thang xanh có thứ tự và CHỈ vẽ các từ đã phân loại
  (deck ~2400 từ, gộp "chưa phân loại" vào thanh thì 4 mức còn lại chỉ còn vạch li ti — phát hiện khi chụp ảnh
  màn hình thật). Chưa có giao diện tối nên mới khai báo màu bản sáng.
- **Tra từ** (`#/lookup`): tìm cả từ chưa học, xếp hạng (đúng từ > dạng chia > bắt đầu bằng > chứa > nghĩa > cụm từ >
  ví dụ), hiểu dạng chia (raised → raise), tiếng Việt không cần gõ dấu; mở thẻ đầy đủ và cho thêm vào danh sách học;
  từ không có trong deck thì ghi lại (như D34) + link Wiktionary/Cambridge.
- **Sửa hành vi cũ lộ ra khi làm dashboard:** nút "15 phút hôm nay" dẫn tới màn ôn thẻ dù kế hoạch chỉ có Part 5 →
  nay đi thẳng tới Part 5; người mới chưa phân loại từ nào được mời phân loại trước.

**D37. Part 3, 4, 6, 7 dùng chung MỘT kiến trúc "bộ tài liệu + câu hỏi" (thay vì bốn bộ code riêng).**
- **Vì sao gộp:** cả bốn đều là "một tài liệu (hội thoại / bài nói / đoạn văn) + 2–5 câu hỏi". Khác nhau chỉ ở tài liệu:
  nghe (có âm thanh) hay đọc (có đoạn văn) và cách ra đề. Một schema (`schemas/set.schema.json`), một pipeline
  (`pipeline/build-sets.js --part N`), một màn luyện (`#/sets?part=N`), một logic (`src/logic/sets.js`).
- **Mục tiêu:** đủ nội dung cho MỘT đề 194 câu (Part 2: 25 · Part 3: 13 bộ/39 · Part 4: 10 bộ/30 · Part 5: 30 · Part 6: 4 bộ/16 ·
  Part 7: 54 = đơn 29 + đôi 10 + ba 15). 194 = 200 trừ 6 câu Part 1 vì cần ảnh — không sinh được.
- **Kiểm định chặt hơn Part 5:** model B tự giải TẤT CẢ câu của bộ; **lệch một câu là loại cả bộ** (giữ lại là giữ lỗi của tài liệu).
  Trong thực tế Part 6 bị loại ~50% ở lô đầu — chấp nhận, chất lượng quan trọng hơn số lượng.
- **Bài học từ Part 2 (D35) áp dụng ngay từ đầu:** prompt cấm nhắc chữ cái A–D trong giải thích, bộ lọc `mentionsChoiceLetter`
  loại bản thảo vi phạm, phương án không được tham chiếu nhau ("cả A và B", "all of the above") — vì pipeline **xoay vị trí
  đáp án** cho chia đều A/B/C/D (thực đo: 16/15/15/15).
- **Âm thanh Part 3/4:** mỗi lượt nói một file MP3; giọng theo giới tính người nói (Man/Woman), hai người cùng giới khác
  giọng, xoay Mỹ/Anh/Úc/Canada. Dùng bộ giọng RIÊNG cho Part 3/4 — không đổi `VOICES` của Part 2 (đổi là đổi giọng cả 72 câu
  đã phát hành). Thư mục `public/audio/` dùng chung nên **dọn file mồ côi phải xét mọi phần nghe** (`pipeline/lib/audio-files.js`);
  bản cũ chỉ biết Part 2 và suýt xoá âm thanh Part 3/4.
- **Trải nghiệm:** bộ nghe cho xem câu hỏi TRƯỚC khi nghe (đề thật in câu hỏi trong tập đề), chữ hội thoại chỉ hiện sau khi
  trả lời hết; bộ đọc hiện đoạn văn ngay. Mỗi câu chấm + giải thích ngay (chế độ luyện); từng từ gạt được (D34).
- **Lỗi thật bắt được nhờ test:** đổi Part ngay trong màn luyện (sửa địa chỉ) làm lượt của Part cũ dính sang Part mới.
- **Thống kê theo KỸ NĂNG:** Nghe = Part 2+3+4, Đọc = Part 5+6+7 (id câu có tiền tố l2-/p3-/p4-/p5-/p6-/p7-). Dashboard đổi
  từ "Part 5 / Nghe Part 2" sang "Đọc / Nghe" để không bỏ sót phần mới.

**D38. Thi thử đủ bộ (M15): tính giờ, không xem đáp án, chấm SỐ CÂU ĐÚNG, không quy đổi điểm.**
- **Chế độ:** đề đủ (~194 câu, Nghe 45 + Đọc 75 phút), chỉ Nghe, chỉ Đọc, hoặc riêng từng Part (giờ tính theo tỉ lệ số câu,
  **chặn ở giờ đề thật** — Part 7 có thể vượt 1 câu vì bộ 2 câu, đã có test).
- **Dựng đề ngẫu nhiên** từ các ngân hàng (xáo Fisher–Yates, không thiên lệch), Part 7 chia đơn/đôi/ba đúng như đề thật, thiếu
  dạng nào thì dồn sang bộ đơn. Ngân hàng chưa đủ thì vẫn làm được và **nói rõ thiếu bao nhiêu câu so với đề thật**.
- **Không quy đổi ra điểm 10–990** (nhắc lại D36): bảng quy đổi đổi theo từng đề chuẩn hoá, và câu hỏi do AI ra nên độ khó
  không hiệu chuẩn. Kết quả hiện số câu đúng theo từng Part / kỹ năng, thời gian dùng, và xem lại từng câu sai kèm giải thích.
- **Ghi nhật ký MỘT lần khi nộp:** mỗi câu đã trả lời một `question.answered` (thêm `mode: 'exam'`) + một `exam.finished` tóm tắt,
  gói trong một lượt `importEvents` (194 lần `record` sẽ vẽ lại màn 194 lần). Câu làm trong thi thử vào thống kê bình thường
  nên câu sai sẽ quay lại ở luyện tập.
- **Chưa làm (M16):** làm dở rồi tiếp trên máy khác — hiện thoát giữa chừng là mất bài. Nút chuyển đơn vị, danh sách câu và
  đồng hồ đã có; còn thiếu lưu tiến độ giữa chừng. Đề thật chỉ phát âm thanh một lần; app cho nghe lại (ghi rõ trên nút) vì
  bấm nhầm/không phát được trên iPhone sẽ làm hỏng cả bài.

**D39. Part 5 dựng lại theo đề thật, và CÓ quy đổi điểm 10–990 (đảo lại D36 + D38).**
- **Huy yêu cầu ngày 2026-09-20.** D36 và D38 đã chốt "không quy đổi điểm"; đây là lần đổi có chủ đích, ghi lại
  theo ràng buộc #9. Lý do đổi hợp lệ: điều kiện mà D36 đặt ra ("làm sau khi có bài thi thử đủ bộ M15") nay đã đủ,
  và Huy cần biết mình đang cách mục tiêu 950 bao xa — "155/194 câu đúng" không trả lời được câu đó.
- **Cách giữ cho con số không thành số bịa:** luôn hiện một KHOẢNG kèm chữ "ước lượng", không bao giờ một con số trần.
  Khoảng gồm hai nguồn sai số: (1) bảng quy đổi của ETS vốn cho sẵn một khoảng cho mỗi mốc số câu đúng;
  (2) sai số lấy mẫu `sqrt(p(1-p)/n)` quy về thang 100 câu — làm 30 câu Part 5 rồi suy ra điểm phần Đọc thì
  khoảng rộng hẳn ra, và màn kết quả nói thẳng điều đó. Chỉ làm một kỹ năng thì KHÔNG bịa điểm kỹ năng kia
  và không có điểm tổng.
- **Đường cong điểm phải ĐƠN ĐIỆU TĂNG.** Bản đầu nội suy giữa hai đầu của mỗi mốc, cho ra 95 câu đúng = 495
  nhưng 96 câu = 475 — càng đúng nhiều càng ít điểm. Sửa bằng cách nội suy giữa TÂM các mốc, neo hai đầu ở 5 và 495.
  Có test quét cả 0–100 câu cho cả hai kỹ năng.
- **Part 5 theo mặt cắt đề thật:** đề thật chia xấp xỉ đều ba nhóm — từ loại / từ vựng / ngữ pháp, mỗi nhóm ~10/30 câu.
  Ngân hàng của app có 12 dạng số lượng gần bằng nhau, nên lấy ngẫu nhiên thì ~2/3 lượt rơi vào nhóm ngữ pháp.
  `composeRound` lấy theo hạn mức từng nhóm, trải đều các dạng trong nhóm, rồi xáo. Lượt mặc định 30 câu,
  đánh số 101–130, nhịp mục tiêu 20 giây/câu (để còn 65 phút cho Part 6 và 7). Dùng cho cả màn luyện lẫn đề thi.
- **Loại kiến thức bị GIẤU cho tới khi trả lời xong.** Trước đây thanh trên hiện "vocabulary", "relative-clause"
  ngay lúc đang làm — biết trước dạng câu là mất một nửa bài tập.
- **Thi thử chạy hai đồng hồ riêng:** Nghe 45 phút, hết giờ (hoặc bấm xác nhận) mới sang Đọc 75 phút, và KHÔNG
  quay lại phần trước — đúng như đề thật. Trước đó app gộp 194 câu vào một đồng hồ 120 phút và cho đi lại tự do.
- **Số hiệu câu là số thật của đề** (Part 2 = 7–31, Part 5 = 101–130, Part 7 = 147–200), tính lại từ đầu mỗi phần
  nên phần trước thiếu câu cũng không làm lệch số hiệu phần sau.
- **Lỗi nội dung tìm ra nhờ việc này:** câu `p5-0079` KHÔNG có chỗ trống (đáp án "irritated" nằm sẵn trong câu) —
  không ai làm được. Đã `retired` (ràng buộc #6: không sửa, chỉ đánh dấu) kèm `retiredReason`, và thêm hai lớp chặn:
  pipeline loại bản thảo thiếu chỗ trống ngay lúc sinh, `validate:content` chặn câu `active` thiếu chỗ trống.

**D40. Nới hạn mức độ dài file: 300 → khoảng 400, trần 450.**
- **Huy yêu cầu ngày 2026-09-20:** mốc 300 đang thành gánh nặng — phải cắt file giữa chừng chỉ vì đếm dòng.
- Mục đích thật của quy tắc là "một file một việc", không phải con số. File 420 dòng làm đúng một việc thì để yên;
  vượt 450 thì gần như chắc chắn đang làm nhiều việc. `scripts/check_file_sizes.sh` mặc định 450.

**D41. Bố cục hai cột trên màn rộng: tài liệu bên trái, câu hỏi bên phải.**
- **Huy yêu cầu ngày 2026-09-20.** App vốn thiết kế cho iPhone (một cột, rộng tối đa 34rem) nên trên Mac phải
  cuộn qua cuộn lại giữa đoạn văn và phương án — đúng thứ đề thật không bắt làm (đề in đoạn văn và câu hỏi cùng trang).
- Một hàm `splitPane(material, questions)` dùng cho MỌI màn làm bài (Part 5, các bộ Part 3/4/6/7, thi thử);
  CSS xếp dọc lại dưới ngưỡng hẹp nên iPhone không đổi gì.

**D42. Bộ nhiều câu chỉ chấm và giải thích khi đã trả lời HẾT bộ.**
- **Huy yêu cầu ngày 2026-09-20.** Trước đó mỗi câu chấm ngay. Với bộ nhiều câu dựa trên cùng một tài liệu,
  chấm ngay là LỘ BÀI: biết câu 1 sai và đáp án đúng là gì thì đoán được câu 2, 3 nói về đoạn nào.
- Chọn đáp án giờ chỉ tô lại và ĐỔI ĐƯỢC; trả lời câu cuối mới chấm cả bộ, hiện giải thích, rồi ghi nhật ký
  MỘT lượt cho cả bộ (ghi từng câu sẽ vẽ lại màn nhiều lần — cùng lý do exam-screen gói sự kiện khi nộp).
- Part 5 và Part 2 vẫn chấm ngay: mỗi câu độc lập, chấm ngay không lộ gì cho câu sau.
- Thi thử không đổi: vốn đã không lộ gì cho tới khi nộp.

**D43. Điều hướng: cột bên trái trên máy tính, thanh dưới đáy trên điện thoại.**
- **Huy yêu cầu ngày 2026-09-20:** "kéo mục lục sang bên trái như một trang web thực thụ".
- Cùng MỘT `<nav>`, chỉ CSS đổi chỗ ở ngưỡng 62rem (≈992px): dưới ngưỡng giữ nguyên thanh đáy đã chọn ở D36
  (hợp ngón tay trên iPhone/PWA), trên ngưỡng thành cột cố định bên trái có tên app.
- **Bốn mục: Tổng quan · Từ vựng · Bài thi · Sao lưu.** Tra từ gộp vào Từ vựng (D36 để riêng một tab, nhưng
  nó là một việc của phần từ vựng chứ không ngang hàng), Sao lưu/đồng bộ lên menu thay vì nằm trong màn chính.
- Trong phiên học, thanh ĐÁY vẫn ẩn (vướng hàng nút chấm dính đáy) nhưng cột trái thì hiện — màn rộng không
  thiếu chỗ. Đánh dấu bằng lớp `in-session` thay cho thuộc tính `hidden` (hidden là ẩn ở MỌI khổ màn hình).
- Nội dung nới từ 34rem lên 44rem trên màn rộng, riêng màn làm bài (có `.split`) lên 66rem.

**D44. Bản nhận xét điểm mạnh/yếu chạy AI trong PIPELINE, không gọi API lúc app chạy (M20).**
- **Huy chốt ngày 2026-09-20**, sau khi Claude nêu ba đường (xem PLAN.md M20). Chọn đường 2 → **ràng buộc #2
  giữ nguyên**, không phải sửa gì: app vẫn chạy offline, không có khoá API trong frontend, không tốn hạn mức khi dùng.
- **Hình dung luồng:** Huy bấm "Xuất dữ liệu" (đã có) → chạy `npm run advise` trên máy → script đọc nhật ký,
  tự tính phần đo đạc (tỉ lệ đúng theo 12 dạng Part 5, theo kỹ năng, theo Part, nhịp làm bài, từ hay quên),
  đưa SỐ LIỆU cho AI viết lời khuyên → ghi ra một file → Huy nạp lại vào app để đọc trong màn Tổng quan.
- **Phần đo đạc viết trước và dùng chung**: nó là đầu vào của lời khuyên, và tự nó đã trả lời được "yếu chỗ nào".
  AI chỉ làm phần diễn đạt. Làm vậy thì kể cả hết hạn mức AI, app vẫn có bản nhận xét dạng số.
- **Không gửi nhật ký thô cho AI**: chỉ gửi bảng thống kê đã tổng hợp (không có gì riêng tư, nhẹ hơn nhiều).

**D45. Gạt từ lạ trong PHƯƠNG ÁN của Part 3/4/6/7: chạm thẳng vào từ, không dùng chip như Part 5.**
- **Huy báo ngày 2026-09-20** khi đang làm Part 6: "không có chức năng thêm từ vựng trong phần đáp án vào
  những từ vựng chưa biết/cần học". Đúng: D34 mới làm cho Part 5, màn bộ đề chỉ gạt được từ trong TÀI LIỆU.
- **Vì sao không bê nguyên chip của Part 5 sang:** phương án Part 5 hầu hết là MỘT từ (555/800), còn phương án
  Part 3/4/7 là cả câu. Đo trên nội dung thật: mỗi câu có **19–21 từ khác nhau** trong bốn phương án → một bộ
  5 câu sẽ ra cả trăm chip. Nên ở màn bộ đề thì chạm thẳng vào từ ngay trong phương án, y như chạm từ trong
  đoạn văn. Luật người dùng thấy vẫn là một: **"chạm vào từ mình không biết"**.
- **Chỉ gạt được SAU KHI chấm cả bộ** — giữ nguyên lý do của D34: trước đó đánh dấu từ nào là gợi ý ngầm cho đáp án.
- **Chi tiết kỹ thuật đáng nhớ:** phương án đã chấm phải vẽ bằng `<div>` chứ không phải `<button disabled>` —
  trình duyệt KHÔNG gửi sự kiện chạm cho phần tử con của một nút bị disabled, chạm vào từ bên trong sẽ không ăn.
  Vì vậy CSS đổi từ `button.option` sang `.option`. Phương án đã chấm nay để nguyên độ đậm (không mờ 45% như nút
  disabled) — giờ nó là chữ để ĐỌC và chạm, không còn là nút bấm.

**D46. Đồng hồ nhịp ở màn bộ đề: ĐO so với chuẩn, không đếm ngược, không khoá gì.**
- **Huy đề nghị ngày 2026-09-20:** "thêm bấm giờ / giờ tiêu chuẩn… không phải bấm giờ để kết thúc, mà để đo
  so với tiêu chuẩn để tăng tốc hoặc thêm thời gian làm bài hợp lý". Muốn đếm ngược thật thì đã có màn Thi thử.
- **Mốc chuẩn** (`src/logic/pace.js`, dùng chung với nhịp Part 5 đã có ở D39): phần Đọc có 75 phút cho 100 câu,
  chia Part 5 ~10 phút (20 giây/câu) · Part 6 ~8 phút (30 giây/câu) · Part 7 ~57 phút (60 giây/câu) — cộng lại
  vừa đúng 75 phút, nên chậm ở phần trước là ăn vào giờ của Part 7.
- **Phần Nghe đo khác:** nhịp do băng quyết định, đi nhanh hơn cũng không được. Thứ đo được là khoảng TRẢ LỜI
  sau khi băng dứt — đề thi trên máy tự chuyển câu sau khoảng **5 giây** (Huy tra từ hướng dẫn giao diện thi
  của IIG). Vì vậy với Part 3/4, đồng hồ chỉ bắt đầu chạy SAU KHI nghe xong.
- Đồng hồ mỗi giây chỉ sửa CHỮ của nó (như `exam-screen`), không vẽ lại cả màn — vẽ lại mỗi giây sẽ nhấp nháy
  và làm mất chỗ đang đọc.
- **Không ghi nhật ký** thời gian này: nhật ký là append-only và đang dùng cho thống kê, thêm sự kiện mỗi bộ chỉ
  để đo nhịp là làm nặng dữ liệu mà chưa có ai đọc tới. Khi nào M20 cần nhịp thì tính riêng.

**D47. Cứu bài thi làm dở bằng HẠT GIỐNG (seed), không lưu cả đề.** `buildExamForm` xáo ngẫu nhiên, nên
muốn dựng lại đúng đề cũ phải dựng lại đúng dãy số ngẫu nhiên cũ. Lưu `seed` (một số) vào `localStorage`
rồi dựng lại bằng `seededRandom(seed)` — gọn hơn nhiều so với lưu toàn bộ id câu hỏi, và tự động đúng cả
thứ tự lẫn cách chia bộ. Bản lưu cũ không có `seed` thì **bỏ đi** chứ không dựng bằng `Math.random`:
dựng sai ra đề khác mà vẫn báo "khôi phục thành công" là mất bài trong im lặng — tệ hơn mất bài ra mặt.
*(Sinh ra từ lỗi thật: bản M16 đầu tiên dựng lại bằng `Math.random`.)*

**D48. Thi thử KHÔNG tự động phát âm thanh.** Đề thật có phát tự động, nhưng app chạy ở nhà: Huy bấm bắt
đầu rồi mới đi lấy tai nghe. Cộng với luật "phát một lần, không nghe lại" (M21) thì tự phát = mất đoạn
nghe vĩnh viễn. Giữ "bấm Nghe thì mới phát". Muốn giống phòng thi thì phải kèm đếm ngược chuẩn bị — để
backlog, không làm lặng lẽ.

**D49. `el()` tự làm phẳng mảng con và bỏ qua `null/undefined/false`.** Viết `cond ? [a, b] : []` giữa danh
sách con là cách tự nhiên để chèn hai phần tử có điều kiện; không làm phẳng thì cả mảng bị `String()` và
người dùng đọc được chữ `[object HTMLDivElement]` trên màn hình (đã xảy ra ở màn kết quả thi). Chặn ở hàm
dựng DOM dùng chung thay vì sửa từng chỗ gọi.

**D50. Collocation tuyển chọn thủ công, học theo CỤM, có kèm dạng SAI.** Bản đầu lấy trường
`collocations` mà AI sinh cho từng từ trong deck: 6.882 cụm, nhưng 95% là tính từ+danh từ mô tả
(`textile industry`, `corporate campus`) — đó là từ vựng, không phải collocation. Thứ TOEIC thật sự hỏi
là cụm mà chọn sai động từ hoặc giới từ là sai cả câu.
- Bộ mới: **142 cụm tuyển thủ công**, 5 nhóm theo MẪU chứ không theo chủ đề (`Động từ + danh từ`,
  `Động từ + giới từ`, `Tính từ + giới từ`, `Danh từ + giới từ`, `Cụm cố định văn phòng`).
- Mỗi cụm có **dạng sai hay mắc** (`pay attention to` ✓ / `give attention to` ✗) — 140/142 cụm có.
  Ô tìm kiếm tra được cả dạng sai: gõ đúng cái mình đang viết sai thì ra ngay cụm đúng.
- **Tuyển tay chứ không sinh bằng AI**, cũng không lọc lại từ bộ 6.882: chất lượng ở đây là chọn ĐÚNG
  cụm hay gặp, việc mà đếm tần suất trên deck không làm được. Trường `collocations` của từng từ vẫn giữ
  nguyên làm ví dụ trong màn chi tiết từ — không xoá, không sửa (ràng buộc #6).
- File: `public/content/collocations.json`, tải như các bank khác, thiếu file thì màn tự báo chứ không sập.

**D51. Động lực học lại: TIẾN ĐỘ CỘNG DỒN, không phải chuỗi ngày.** Huy nhận ra UX quan trọng với
việc quay lại học (2026-09-23). Nhưng cách làm mặc định — streak, huy hiệu — đã bị RESEARCH.md xếp vào
mục "cố ý không lấy" từ đầu: nhịp học 1–2 giờ/tuần (D03) làm chuỗi ngày đứt gần như mỗi tuần, biến mỗi
lần mở app thành một lời nhắc vừa thất bại. Vậy mà màn chính vẫn đang hiện `Chuỗi N ngày` — thêm vào
lúc nào không rõ, trái với chính khảo sát của project.
- Thay `studyStreak` (ngày liên tiếp) bằng `activeWeeks` (**số tuần từng có học, chỉ tăng**). Nghỉ ba
  tuần quay lại vẫn thấy nguyên công sức cũ. Kèm dấu ✓ khi tuần này đã học — đủ để biết còn nợ hay chưa,
  không đủ để thành áp lực.
- Ba cột động lực còn lại, tất cả đều hợp nhịp tuần: (1) **màn "xong một lượt" dùng chung**
  (`sessionDone` ở `blocks.js`) trả lời "làm được bao nhiêu · đổi được cái gì · làm gì tiếp";
  (2) **màn chính đặt việc-cần-làm lên trên**, biểu đồ 14 ngày gập lại; (3) **không màn nào là ngõ cụt** —
  hết việc đến hạn thì vẫn có nút.
- **Không thêm** điểm, huy hiệu, bảng xếp hạng, thông báo đẩy. Ràng buộc #8 và RESEARCH.md vẫn đứng.

**D52. Nút "hôm nay" cho HAI lựa chọn, chọn theo chỗ đang yếu.** Trước đây nút trỏ cứng: có việc từ
vựng thì vào ôn thẻ, không thì vào Part 5 — bất kể đang hổng Part 7 hay chưa đụng Part 4 bao giờ.
- Bộ chấm ở `logic/suggest.js`, một **bảng điểm 0–100 tra được** (`NEED`) thay vì rải công thức: thẻ quá
  hạn tăng theo số lượng (3 thẻ = việc vặt, 25 thẻ = vượt mọi thứ, theo R6 + D03); phần **chưa làm câu
  nào** = 70 (lỗ hổng lớn nhất vì không biết mình yếu tới đâu); làm dưới 5 câu = 55 "chưa đủ kết luận";
  đủ số liệu thì càng sai càng cao. Mỗi gợi ý mang theo **lý do bằng chữ** để tin được mà bấm.
- **Hai lựa chọn, bắt buộc khác loại** (từ vựng / cụm từ / đọc / nghe). Một lựa chọn duy nhất mà không
  hợp hoàn cảnh là mất cả phiên: đang ngồi chỗ ồn thì không luyện nghe được.
- `logic/today.js` bị **xoá** — `planToday`/`planTarget` không còn ai dùng.
- Bộ chấm dùng lại ở màn Bài thi để đánh dấu "← cần nhất", nên gộp nhóm không làm mất dấu chỗ bắt đầu.

**D53. Cụm từ là THẺ HỌC, dùng chung bộ máy từ vựng — học mới thì tách, ôn lại thì chung.** *(Phần "học mới thì tách" đã đổi ở D65: phân loại mặc định trộn cả cụm; chế độ chỉ-cụm vẫn còn.)*
Bản D50 mới chỉ là danh sách tra cứu. Nay cụm từ vào hẳn vòng học.
- **Không dựng hệ thống song song.** `reduceVocabState` chỉ khoá theo `wordId`, mọi hàm hàng đợi đều nhận
  `entries` từ ngoài, nên chỉ cần `collocationEntries()` cho cụm một hình dạng giống mục deck là được
  FSRS, 4 mức, đánh dấu, nhật ký append-only miễn phí. Id `col-xxxx` không đụng `tsl-`/`bsl-`.
- **Học mới TÁCH** (`#/triage?kind=colloc`): nhìn `apply` đoán nghĩa là một việc, nhớ `apply FOR chứ
  không phải apply TO` là việc khác. Màn đổi chữ theo chế độ ("Bạn dùng được CỤM này tới mức nào?").
- **Ôn lại CHUNG một hàng đợi**: lịch FSRS tính theo từng thẻ nên trộn không làm sai lịch, mà tách ra thì
  cụm từ sẽ bị bỏ quên.
- Mặt sau thẻ cụm đặt **dạng sai vào chỗ dễ thấy** — thứ cần nhớ không phải nghĩa mà là "đừng viết
  thành do a decision".
- Thống kê từ vựng (`vocabProgress`, `countByLevel`) vẫn chỉ đếm deck, không cộng cụm vào.

**D54. Mục Từ vựng và Bài thi gộp theo nhóm.** Trước đây mỗi mục là một nút full-width hai dòng, 7–8 nút
xếp dọc. Nay `navGroup()` ở `blocks.js`: Từ vựng = **Học** / **Tra cứu & xem lại**; Bài thi = **Luyện phần
Đọc** / **Luyện phần Nghe** (gộp theo KỸ NĂNG, vì lúc chọn Huy cân nhắc "giờ có đeo tai nghe được không",
không phải số thứ tự Part). Hai cột từ 30rem trở lên; việc chính chiếm cả hàng. Bảng lỗ hổng gập vào.

**D55. Tự đồng bộ, nút "Đồng bộ ngay" giữ lại để thử tay.** (Huy đồng ý 2026-09-23: "nếu tự động đồng bộ
thì càng tốt".) M5 chọn nút bấm tay làm phương án LÙI; mục tiêu gốc là tự động. Bấm tay thì dễ quên, mà quên
là hai máy lệch nhau → ôn trùng thẻ, lịch FSRS sai.
- **Khi nào chạy:** lúc mở app · lúc quay lại hoặc rời app (`visibilitychange` — trên iPhone, rời app thường
  là lần cuối JS còn được chạy) · lúc có mạng lại (`online`) · **15 giây sau sự kiện cuối** (đang học liên tục
  thì dời hẹn, không gọi mạng mỗi thẻ).
- **Im lặng khi lỗi:** chưa đăng nhập (kiểm bằng `getSession`, không gọi mạng) hay mất mạng thì bỏ qua;
  màn Đồng bộ hiện lần chạy gần nhất + kết quả/lỗi để Huy biết nó có chạy thật.
- Sự kiện vừa KÉO VỀ không hẹn lần đồng bộ mới (không có gì để đẩy ngược lên).
- Không đồng bộ theo thời gian thực (Supabase Realtime): cần giữ kết nối mở, tốn pin iPhone, và Huy không
  dùng hai máy cùng lúc.
- Giới hạn đã biết: mỗi lần vẫn đọc lại cả bảng (~3 MB/lần ở 10k sự kiện, gói Free 5 GB/tháng). Chạm ngưỡng
  thì chuyển sang chỉ đọc dòng mới hơn lần trước.

**D56. Để MỞ đăng ký tài khoản — Huy chia sẻ link cho bạn bè.** (Huy chốt 2026-09-23.) Thay bước H của
checklist Supabase (tắt "Allow new users to sign up").
- **Dữ liệu vẫn an toàn:** RLS đã kiểm từ ngoài — tài khoản nào chỉ đọc/ghi được dòng của chính nó.
- **Rủi ro chấp nhận:** (1) mọi tài khoản dùng chung 500 MB gói Free; (2) "Confirm email" đang tắt nên đăng
  ký được bằng email bịa → có thể có tài khoản rác/bot.
- **Dấu hiệu phải đóng lại:** thấy tài khoản lạ trong Authentication → Users, hoặc Database size vượt ~250 MB.
  Cách xử lý theo thứ tự: bật lại Confirm email → thêm CAPTCHA Turnstile (miễn phí) → tắt đăng ký.

**D57. M18 chỉ làm phần ping, BỎ backup tự động hằng tuần.** (Huy đồng ý 2026-09-23.) Thay phần "backup định
kỳ" của D25. Dữ liệu đã có nhiều bản: IndexedDB trên từng máy + Supabase + nút "Xuất dữ liệu". Backup tự động
phải đưa lên GitHub secret key (bỏ qua MỌI RLS, lộ là lộ dữ liệu của cả bạn bè — D56) hoặc mật khẩu của Huy:
rủi ro lớn hơn lợi. Ping: `.github/workflows/keep-supabase-awake.yml`, 3 ngày/lần, chỉ dùng publishable key.

**D58. Bỏ bộ chọn "Part 5 mỗi lượt 10/20/30 câu" — lượt Part 5 cố định 30 câu.** (Huy yêu cầu 2026-09-23:
"không ăn nhập với các phần khác".) Không phần nào khác cho chọn cỡ lượt (Part 2 = 10 câu, Part 3/4/6/7 = 2–3
bộ, phân loại = 20 từ). 30 = đúng Part 5 của đề thật, nên lượt vẫn là một mặt cắt đề thật như D39. Kèm sửa
lệch: ô "Hôm nay" từng báo Part 5 là 20 câu trong khi lượt thật là 30 — nay mọi chỗ dùng `PART5_COUNT`.
Muốn luyện ít hơn thì thoát giữa lượt: câu đã làm vẫn được ghi.

**D59. Nâng giao diện lên mức "web chuyên nghiệp" bằng ĐÁNH BÓNG, không làm lại.** (Huy hỏi 2026-09-23 có nâng
được không hay trade-off quá cao; Huy giao Claude tự quyết việc tiếp theo.) Thứ làm app trông "làm tay" không phải bố
cục (đã ổn từ D51/D54) mà là chi tiết: icon bằng ký tự/emoji, không có chuyển động, nháy trắng khi mở ở nền tối,
không có icon khi thêm ra màn hình iPhone. Làm các thứ RẺ mà thấy rõ; giữ vanilla JS, không thêm thư viện.
- **Phần A (đã làm):** icon SVG tự vẽ (`icon()` ở `blocks.js`) · chuyển màn bằng View Transitions 180ms, có nhánh
  dự phòng, tắt khi bật giảm chuyển động, focus về tiêu đề màn mới · màn chờ lúc tải · đặt sáng/tối trong
  `index.html` trước lần vẽ đầu · `apple-touch-icon` + `theme-color` · viền focus chỉ khi dùng bàn phím.
- **Cố ý KHÔNG làm (trade-off cao):** font web riêng (SF trên máy Apple đã rất tốt với tiếng Việt; thêm font là thêm
  tải + phải cache offline) · viết lại bằng framework · thư viện animation · minh hoạ/hình ảnh trang trí.
- Hiệu ứng chỉ khi ĐỔI MÀN; vẽ lại trong cùng màn (lật thẻ, chấm câu) không có hiệu ứng — chỉ làm chậm tay.

**D60. Mọi chữ phân tích hiện cho người học phải là tiếng Việt; được dịch lời giải tại chỗ.** (Huy báo 2026-09-23:
"phần phân tích toàn tiếng Anh mình không hiểu".)
- **Tên dạng câu:** mã `errorType` (`word-form`, `wh-why`…) giữ nguyên trong dữ liệu và nhật ký; màn hình đọc
  `ERROR_TYPE_LABEL` ở `logic/quiz.js`. Test canh: dạng nào có trong nội dung mà thiếu tên Việt là đỏ.
- **Lời giải Part 7:** 10 bộ đầu (`p7-0001`–`p7-0010`, model flash-lite) có 40 lời giải/bẫy tiếng Anh → Claude dịch
  tại chỗ. **Làm rõ ràng buộc #6 "ID vĩnh viễn":** ràng buộc đó giữ câu HỎI (đề, phương án, đáp án) không đổi dưới
  cùng một id vì nhật ký trỏ vào id. Lời giải là chữ hiển thị kèm theo, sửa không làm sai lịch sử làm bài.
- **Chặn từ gốc:** `isVietnameseOrEmpty` (pipeline/lib/prompt-listening.js) — bộ sinh Part 2, Part 5, Part 3/4/6/7
  loại câu có lời giải không phải tiếng Việt. Test nội dung: mọi lời giải/bẫy trong `public/content` là tiếng Việt.
- Bỏ luôn chữ "deck" và mã bộ từ (`toeic-tsl + toeic-bsl`) khỏi màn hình → "bộ từ", "N từ TOEIC".

**D61. Nghe chép (M11): chép lại từng đoạn thuộc câu nghe từng sai, chấm theo từ.** (Claude tự chọn làm, 2026-09-23 — memory
`autonomy-next-steps`.)
- **Đoạn lấy từ đâu:** câu nghe TỪNG sai (kể cả đã làm lại đúng). Part 2 = câu hỏi + 3 câu đáp (câu đáp sai cũng là chỗ
  nghe nhầm). Part 3/4 = từng lượt lời, vì mỗi lượt là MỘT file âm thanh riêng — không cắt được nhỏ hơn. Lượt quá 30 từ
  thì bỏ (nhớ không nổi, thành bài trí nhớ) → bài nói Part 4 (một file ~100 từ) chưa chép được; muốn có thì pipeline
  phải tách file theo câu (Backlog).
- **Chấm:** dãy con chung dài nhất theo từ, bỏ qua hoa/thường và dấu câu; gạch nối = khoảng trắng. Chép đúng 100% (không
  thiếu, không thừa) thì đoạn đó không quay lại; chưa đúng thì quay lại ở lượt sau. "3" ≠ "three" (chưa làm bảng số).
- **Nhật ký:** sự kiện mới `dictation.checked {unitId, correct, total, perfect}`, id đoạn = id nội dung + vị trí
  (`l2-0001:A`, `p3-0001:2`). Tính vào thời gian học (45 giây/đoạn) và cột Nghe của biểu đồ hoạt động.
- **Tắt tự sửa chính tả** ở ô gõ (iPhone sửa hộ thì không còn biết mình nghe ra chữ gì). Kèm sửa ô nhập toàn app lên
  16px — dưới 16px iPhone tự phóng to trang khi chạm vào ô (ô Tìm từ cũng bị).

**D62. Pipeline sinh nội dung lấy file ĐÃ PHÁT HÀNH làm chuẩn, cache chỉ là nháp.** (Claude phát hiện 2026-09-23, trước
khi chạy thêm nội dung.)
- **Lỗi đã suýt xảy ra:** `build-questions/listening/sets` ghi file đầu ra CHỈ từ `pipeline/.cache/` và đánh id theo
  `cache.size() + 1`. Cache nằm trong .gitignore → máy Mac này (repo mới chép sang) không có. Chạy là id đánh lại từ 1,
  ghi đè 200 câu Part 5 bằng câu mới CÙNG id (nhật ký học trỏ nhầm câu — ràng buộc #6), và bước dọn âm thanh xoá MP3
  của câu cũ. Ở máy có cache thì vẫn mất chỗ sửa tay trên file phát hành (40 lời giải Part 7 dịch ở D60).
- **Sửa ở gốc, dùng chung 3 pipeline** (`pipeline/lib/cache.js`): `openWorkCache` nạp file phát hành vào cache trước
  (bản phát hành thắng); lúc ghi file, mục đã phát hành giữ NGUYÊN, không lắp ráp lại (không đổi chỗ đáp án/giọng);
  `nextId` = số lớn nhất + 1. File phát hành hỏng thì dừng, không coi như rỗng.
- **Đã kiểm:** chạy lại cả 6 file không sinh gì mới → giống từng byte, không MP3 nào bị xoá.
- Chưa áp cho `build-vocab` (khoá theo từ, id theo danh sách gốc nên không đánh lại id; nhưng chạy ở máy không có cache
  sẽ gọi lại AI cho ~2400 từ). Làm khi cần sinh lại từ vựng.

**D63. Chốt phạm vi: app đủ dùng — chỉ còn THÊM NỘI DUNG và M21.** (Huy, 2026-09-23: "app làm đến đây cũng là ổn ổn
rồi. Ngoài thêm nội dung ra thì còn lại cũng không cần thiết lắm… trải nghiệm giống thi thật hơn cũng oke đấy".)
- **Bỏ M16** (làm dở máy này, tiếp máy khác): Huy luôn làm trọn một đề hoặc trọn các part đã chọn trong một lần ngồi.
  Làm dở trên CÙNG máy thì đã có (localStorage).
- **Chỉ làm khi Huy yêu cầu:** M10 phần phụ (bảng/biểu Part 3, đánh dấu câu chứa đáp án), M14, M17, M19, M20.
- **Làm tiếp:** nội dung (ưu tiên phần luyện nhiều: Part 5, Part 2, rồi các bộ) và phần còn lại của M21.

**D64. Cân bằng chữ cái đáp án Part 5 — chỉ cho câu CHƯA phát hành.** (Claude phát hiện 2026-09-23 khi đọc thử câu mới.)
- **Lỗi có sẵn:** 200 câu Part 5 đã phát hành có đáp án A = 134, B = 46, C = 15, D = 5 (AI ra đề dồn đáp án vào A;
  câu mới sinh hôm nay 19/19 là A). Part 2 và các bộ thì đã cân bằng từ trước, riêng Part 5 thì chưa.
  Hậu quả: học được mẹo "phân vân thì chọn A", điểm thi thử bị thổi lên.
- **Sửa:** `balanceAnswers` (`pipeline/lib/prompt-question.js`) lúc ghi file: mỗi câu mới nhận chữ cái đang ÍT nhất trong
  cả ngân hàng (dùng lại `moveOptionTo` của bộ đề) → các lần chạy sau tự kéo lệch cũ về dần. Câu có lời giải nhắc chữ
  cái thì không đổi chỗ.
- **Câu cũ giữ nguyên** (ràng buộc #6: nhật ký có ghi chữ cái đã chọn). Hết lệch hẳn nhờ xáo lúc HIỆN — xem D65.

**D65. Xáo trộn mỗi lần hiện: phương án câu hỏi, và thứ tự từ vựng (trộn mọi tầng + cụm từ).** (Huy, 2026-09-24: "nếu có
thể xáo trộn mọi lần thì tốt nhất… khi học từ vựng thì mỗi lần từ vựng sẽ được xáo trộn ngẫu nhiên… trộn đều tất cả
độ khó, cụm từ".)
- **Phương án** (Part 2, 5 luyện; bộ Part 3/4/6/7; thi thử): xáo MỘT lần khi câu/bộ hiện ra, giữ nguyên khi màn vẽ lại
  (`onceShuffled`), câu quay lại ở lượt sau thì xáo lần nữa. Part 2 đổi chỗ câu đáp CÙNG file âm thanh. Thi thử xáo
  bằng chính bộ số có hạt giống, SAU khi đã rút đủ đề → khôi phục bài dở ra đúng thứ tự đã thấy.
- **Nhật ký ghi chữ cái GỐC** (`originalLetter`) → lịch sử cũ và mới đọc như nhau; nội dung trong `public/content`
  không đổi (ràng buộc #6).
- Câu có lời giải nhắc chữ cái ("Phương án B…") thì KHÔNG xáo (13 câu Part 5). App giữ bản sao `mentionsChoiceLetter`
  của pipeline, test canh hai bản không lệch.
- **Từ vựng:** phân loại mặc định trộn từ (tầng đang chọn) + mọi cụm từ; ôn tập trộn từ mới xen giữa thẻ đến hạn. Thứ
  tự theo hash(hạt giống, id) (`seededOrder`): cố định trong một lượt (chấm xong một từ thì từ khác không nhảy chỗ),
  lượt mới hạt mới. Thẻ đến hạn vẫn được giữ trước khi chạm trần 40 thẻ/lượt. Bỏ thứ tự "từ phổ biến trước" và "từ
  chưa biết trước từ đoán được". Chọn tầng vẫn giữ (Huy ở 850 bỏ tầng Cơ bản); chọn "Tất cả" là trộn đều mọi tầng.
- Test giao diện cũ chọn đáp án theo chữ cái (Part 2 trước khi trả lời không có chữ để chọn theo nội dung) nên
  `bootApp` cố định `Math.random ≈ 1` (Fisher–Yates giữ nguyên thứ tự); `tests/ui-shuffle.test.js` chạy ngẫu nhiên thật.
- *Sửa ở D66:* xáo chung một chỗ thì cụm từ chỉ ~6% (142/2.500) → gần như không gặp. Nay trộn ĐỀU theo nhóm.

**D66. Ôn từ vựng bằng TRẮC NGHIỆM, lịch tính bằng NGÀY, trộn ĐỀU theo nhóm.** (Huy, 2026-09-24: "không ai lại ôn lại
sau 1-5-10 phút… thay vì chỉ là cho chọn nhớ hay quên thì bỏ hẳn format này đi, mà thay vào đó là chọn đáp án";
"vẫn chưa thấy xuất hiện cụm từ trong phần ôn tập".)
- **Lịch:** ts-fsrs `enable_short_term: false` — bỏ các bước học 1–10 phút. Thẻ mới: sai → 1 ngày, đúng → 3 ngày; đúng
  liên tiếp → 14 → 57 → 196 ngày. Lịch cũ tự tính lại từ nhật ký (D23), không mất gì.
- **Trắc nghiệm thay tự chấm** ở Ôn tập VÀ Ôn chủ động (`logic/vocab-choice.js`, khối `renderChoiceCard`):
  từ → chọn nghĩa tiếng Việt ngắn trong 4; cụm → xem nghĩa, chọn ĐÚNG cụm, luôn có dạng sai hay mắc trong lựa chọn
  (thứ cần nhớ của cụm là dạng, không phải nghĩa) + câu ví dụ che chỗ cụm. Chọn xong mới hiện giải thích.
  Đúng = "Tốt", sai = "Quên" (Ôn chủ động: sai một từ "thành thạo" thì hạ mức, như D32).
- **Không cần AI sinh thêm:** trường `vi` sẵn có đã là bản dịch ngắn (trung vị 25 ký tự). Chỉ bỏ phần trong ngoặc vì
  có chỗ lộ đáp án ("phúc lợi phụ (fringe benefits)"). Phương án nhiễu: nghĩa của từ CÙNG từ loại, cùng bộ và hạng
  tần suất gần (30 ứng viên gần nhất), loại nghĩa trùng/đồng nghĩa để không có hai đáp án cùng đúng.
  Giới hạn đã biết: nhiễu chọn theo từ loại + độ khó, không theo NGHĨA gần — muốn nhiễu khó hơn thì phải AI sinh.
- **Trộn đều theo nhóm** (`interleaveEvenly`): phân loại lấy mục thứ k của mỗi nhóm (Cơ bản / Trung cấp / Cao cấp /
  Cụm từ) vào "hàng" k, thứ tự trong hàng ngẫu nhiên → một lượt 20 thẻ có ~5 cụm. Cụm vào Ôn tập SAU khi đã phân loại
  (như mọi thẻ); vì thế Ôn tập trước đây không có cụm nào — Huy chưa từng phân loại cụm.
- Bảng tiến độ ở Tổng quan vẫn đếm TỪ trên thang "/ N từ" (không tính cụm).

**D67. Thi thử: phần Nghe chạy như BĂNG đề thật; đề in hướng dẫn + dòng giới thiệu bộ; ẩn menu khi thi.** (Huy,
2026-09-24: "phần làm đề thi đủ vẫn chưa giống đề thi thật, vẫn chưa tự động phát audio".)
- **Kiểm trước:** chạy thật trên Chromium — bấm "Đề đủ" thì 0 lần phát; câu đầu tiên phải tự bấm "▶ Nghe", tự bấm
  "Tiếp →" thì câu sau cũng không phát. Bản M21 cũ chỉ tự chạy SAU khi đã bấm nghe câu đầu và không bấm gì khác.
- **Băng tự chạy:** cú bấm chọn đề là thao tác chạm duy nhất → `unlock()` phát một tiếng lặng 10 ms ngay trong cú
  bấm để mở khoá phần tử Audio (iPhone), rồi băng tự chạy: đầu mỗi Part chờ 10 giây như lúc băng đọc hướng dẫn (đủ lướt
  trước câu hỏi Part 3/4, có ▶ để nghe ngay) → phát → khoảng trả lời (mốc cũ ở `pace.js`: 5 giây/câu) → câu sau.
  Hết câu cuối phần Nghe thì TỰ sang phần Đọc (chế độ chỉ Nghe thì tự nộp) — như đề thật hết băng là chuyển.
- **Phần Nghe không có Trước/Tiếp:** phím ←/→ không tác dụng, danh sách câu chỉ để xem; vẫn chọn/đổi đáp án câu đang
  hiện. Bỏ hộp "sang phần Đọc?" (không còn đường tự chuyển phần). Tốc độ trong thi thử luôn 1× (tốc độ chậm của màn
  luyện nghe trước đây mang sang cả phòng thi).
- **Không bao giờ kẹt:** băng đứng mà không còn gì để phát (lỗi phát, tải lại trang sau khi đã nghe) thì hiện nút
  "Tiếp tục →"; chưa nghe thì nút ▶ mở lại. Cú bấm nào cũng mở khoá âm thanh lại.
- **Chữ in trên đề** (`logic/exam-directions.js`): khối "Part N · Directions" đầu mỗi Part và dòng "Questions 147–148
  refer to the following e-mail." trên mỗi bộ, bằng tiếng Anh như đề thật. Lời hướng dẫn app TỰ VIẾT LẠI ý, không
  chép nguyên văn ETS (ràng buộc #7). Loại văn bản suy từ nhãn tự do của nội dung (`genreOf`), không nhận ra thì "text".
- **Ẩn cột menu trong lúc thi** (lớp `exam-focus` trên body): như phòng thi toàn màn hình, và bấm nhầm menu là
  rời màn = bỏ luôn bài đang làm.
- **Sửa kèm — tải lại trang là mất bài:** D63 ghi "làm dở cùng máy thì đã có" nhưng thực tế CHƯA BAO GIỜ chạy: lúc mở
  app router coi màn đầu là "đổi màn" và gọi `resetExam()` — hàm này xoá bản lưu trước khi màn thi kịp khôi phục. Nay
  lần vẽ đầu tiên không dọn gì (`app.js`). Test mới tái hiện lỗi (đỏ trên code cũ).
- **Còn khác đề thật:** (1) băng thật ĐỌC câu hỏi Part 3/4 và cho 8 giây mỗi câu → đã làm ở D69. (2) Part 1 (6 câu tả
  tranh) vẫn không có — cần ảnh chụp thật, không có nguồn miễn phí hợp lệ; giữ nguyên 194/200 như D38.

**D68. Thêm `wrangler.jsonc` vào repo: khai báo thư mục `dist` cho mọi lần deploy.** (Claude tự quyết 2026-09-24 —
Huy giao toàn quyền quyết định.) PR đầu tiên của repo lộ ra: Cloudflare deploy nhánh phụ bằng lệnh mặc định
`wrangler versions upload`, mà repo không có file cấu hình nào → lỗi ngay "Missing entry-point … or to assets
directory" (đã tái hiện bằng wrangler 4.137). Nhánh chính vẫn chạy được, chắc nhờ lệnh deploy trong dashboard có
khai báo thư mục. Chọn đưa cấu hình vào repo thay vì sửa dashboard: làm được mà không cần Huy vào dashboard, được kiểm
bằng chính bản xem trước của nhánh phụ trước khi tới nhánh chính, và cấu hình nằm trong git. Chỉ có tên Worker
(`toeic-app`, khớp tên trên Cloudflare), ngày tương thích và `assets.directory` — app là trang tĩnh, không có mã Worker,
điều hướng bằng hash nên không cần trang 404 kiểu SPA.

**D69. Băng thi thử ĐỌC lời dẫn như đề thật: hướng dẫn đầu Part, câu giới thiệu bộ, từng câu hỏi Part 3/4 + 8 giây.**
(Claude tự quyết 2026-09-24 — Huy giao toàn quyền quyết định.) Lý do: đề thật đọc to từng câu hỏi Part 3/4 rồi cho
8 giây, tức ~36 giây sau mỗi hội thoại — đó cũng là lúc người thi đọc trước câu hỏi bộ sau, chiến thuật cốt lõi của
TOEIC. Bản D67 chỉ cho 5 giây × 3 = 15 giây: gắt hơn đề thật và tập sai nhịp.
- **Giọng đọc sinh sẵn** bằng edge-tts (`npm run build:narration`, KHÔNG cần Gemini) → `public/content/narration.json`
  = {lời: MP3}, một giọng dẫn `en-US-GuyNeural`. Lời lấy từ `logic/exam-directions.js` — đúng hàm app dùng để tra, nên
  khoá luôn khớp. Câu giới thiệu bộ phụ thuộc số hiệu (bộ nào rơi vào vị trí nào đổi theo từng đề) nên sinh cho MỌI vị
  trí bộ 3 câu: Part 3 32–70 (hai biến thể 2/3 người nói), Part 4 71–100. Hiện 111 lời (~2–3 MB).
- **Băng:** [hướng dẫn nếu đầu Part] → [giới thiệu bộ] → phần nghe → mỗi câu hỏi: 0,9 giây + lời đọc + 8 giây. Đã đọc
  đủ câu hỏi thì hết băng sang câu sau ngay (khoảng trả lời đã nằm trong băng). Có giọng đọc hướng dẫn thì bỏ đếm ngược
  10 giây. Part 2 giữ 5 giây sau câu đáp C (băng thật cũng vậy).
- **Không có hoặc thiếu giọng đọc thì băng chạy như D67** — thiếu dù một câu hỏi của bộ thì bộ đó không đọc câu hỏi nào
  (đọc nửa chừng còn lạ hơn không đọc). Máy cloud không sinh được (proxy chặn máy chủ giọng đọc) — chạy trên Mac.
- **Phần Nghe: hết giờ không cắt ngang băng đang chạy.** Băng có lời dẫn của riêng Part 3 dài ~19,5 phút, vượt giờ
  tính theo tỉ lệ số câu (18,7 phút); đề thật cũng không có đồng hồ riêng cho phần Nghe — hết băng là hết.
- **`narration` vào danh sách file âm thanh của bộ dọn MP3 mồ côi** — quên là lần chạy pipeline Part 2 kế tiếp xoá sạch.
- Dọn kèm: bỏ code "highlight đoạn đang phát" trong thi thử — không có CSS nào, `optionList` cũng bỏ qua tham số đó,
  mà mỗi đoạn vẫn vẽ lại cả màn.

**D70. Pipeline nội dung TỰ CHẠY mỗi ngày trên GitHub Actions — không cần bật Mac hay mở Claude Code.** (Huy hỏi
2026-09-24: "có thể cấu hình cho pipeline tự chạy mỗi lần gemini api có sẵn mà không cần dùng claude code không?")
- **Cách chạy:** `.github/workflows/auto-content.yml`, 08:37 UTC mỗi ngày (sau giờ Gemini đặt lại hạn mức: 0 giờ giờ Thái
  Bình Dương = 07:00/08:00 UTC) + nút chạy tay. Gọi `scripts/auto-content.sh`: Part 5 → Part 2 → Part 3 → Part 4 → Part 7
  đôi/ba → Part 6 → Part 7 đơn → giọng đọc lời dẫn. Mục tiêu là TỔNG số mục (đủ thì bước đó không tốn request); hạn mức
  dùng chung nên thứ tự chính là ưu tiên (D63). Tối đa 40 phút sinh / ngày.
- **Cổng chất lượng trước khi vào main:** `validate:content` + `npm test` phải qua mới commit; không qua thì không commit,
  job đỏ, GitHub gửi email. Tiến độ dở (`pipeline/.cache`) giữ giữa các lần bằng actions/cache — D62 đã làm pipeline
  nạp bản phát hành trước nên máy mới tinh cũng không đánh lại id.
- **Báo lỗi:** hết hạn mức KHÔNG phải lỗi (pipeline tự dừng, ghi file). Một bước lỗi lẻ → cảnh báo. MỌI bước đều lỗi (sai
  key, key hết hạn) → job đỏ. Giọng đọc lỗi → chỉ cảnh báo, không chặn commit nội dung khác.
- **Chi phí 0 đồng:** repo private có 2.000 phút Actions/tháng; job ≤ ~50 phút/ngày (hết hạn mức sớm thì dừng sớm). Hết phút
  thì GitHub chặn chứ không tính tiền khi chưa gắn thẻ. **Key Gemini phải thuộc project KHÔNG bật thanh toán** — bật thì không
  còn "hết hạn mức" để tự dừng.
- **Đổi ràng buộc #2** (CLAUDE.md): trước "AI chỉ dùng trong pipeline chạy trên máy Huy" → nay "trên máy Huy hoặc GitHub
  Actions". Tinh thần giữ nguyên: không gọi AI lúc app chạy; key chỉ nằm trong secret của repo, không vào frontend.
- **Hệ quả:** KHÔNG chạy pipeline Gemini trên Mac song song nữa — hai nơi cùng cấp id mới (p5-0257…) cho hai câu khác nhau.
  Muốn chạy tay thì `git pull` trước và đừng chạy vào giờ job đang chạy.

## Câu hỏi còn mở
- ~~Q1 (Giai đoạn 2): audio để chung repo hay repo/bucket riêng?~~ → **Đã giải quyết, xem D35** (chung repo, xét lại khi ~100 MB).
- ~~Q2 (trước M2): xác nhận license của TSL 1.2 và NGSL.~~ → **Đã giải quyết, xem D18.**
