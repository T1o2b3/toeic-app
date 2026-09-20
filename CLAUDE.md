# CLAUDE.md — Quy tắc làm việc cho project TOEIC app

Claude Code tự đọc file này ở đầu mọi phiên. Mọi quy tắc ở đây là bắt buộc.

## Bối cảnh
- Chủ project: Huy, sinh viên ngành Phần mềm, **mới bắt đầu với web dev/PWA**. Trả lời bằng **tiếng Việt**.
- Mục tiêu: app ôn TOEIC Listening & Reading (850 → 950) dùng trên 2 máy Mac + iPhone, sau này mở rộng sang từ vựng đời thường.
- Nhịp học dự kiến: 1–2 giờ/tuần, dài hạn 6–12 tháng → app ưu tiên phiên học ngắn, nhịp ôn nhẹ.
- Tài liệu gốc: `PLAN.md` (milestone), `DECISIONS.md` (quyết định + lý do), `PROGRESS.md` (trạng thái bàn giao giữa các phiên).

## Giao thức phiên làm việc (quan trọng nhất)
**Đầu phiên:**
1. Đọc `PROGRESS.md` → biết đang ở milestone nào, bước tiếp theo là gì.
2. Chạy `git status` và `git log --oneline -5` để đối chiếu với PROGRESS.md.
3. Tóm tắt cho Huy trong 3–5 dòng: đang ở đâu, hôm nay làm gì, ước tính bao lâu.

**Sau MỖI bước con hoàn thành (không đợi hết milestone):**
1. `npm test` phải pass (nếu đã có test).
2. Cập nhật `PROGRESS.md`: việc vừa xong, bước tiếp theo cụ thể đến mức phiên mới làm tiếp được ngay, vướng mắc nếu có.
3. Commit (quy ước ở dưới).

**Khi context sắp đầy hoặc phiên dài:** chủ động dừng, cập nhật `PROGRESS.md`, commit, rồi báo Huy: "Đã lưu trạng thái, hãy gõ `/clear` rồi bắt đầu phiên mới." Không cố làm tiếp khi context gần cạn.

**Hết milestone:** đánh dấu `[x]` trong `PLAN.md`, ghi thời gian thực tế so với ước tính vào PROGRESS.md, báo Huy cách tự kiểm tra.

## Chế độ dạy học
- Trước khi dùng một khái niệm mới (git, npm, module, service worker, RLS, deploy…), giải thích ngắn gọn: nó là gì, giải quyết vấn đề gì, tại sao chọn nó. Tối đa ~10 dòng, có ví dụ.
- Ở các bước học quan trọng (git commit đầu tiên, deploy, tạo bảng Supabase, bật RLS), **hướng dẫn Huy tự gõ lệnh/tự thao tác** thay vì làm hộ.
- Không giả định Huy biết thuật ngữ. Nếu dùng thuật ngữ tiếng Anh, giải thích lần đầu.

## Quy trình code
- Tuân theo skill `.claude/skills/mini-project-setup/SKILL.md` (logic tách UI, test trước khi nối UI, commit nhỏ).
  - **Độ dài file: khoảng 400 dòng, trần cứng 450** (Huy nới từ 300 ngày 2026-09-20 — xem D40). Mốc này để giữ
    "một file một việc", không phải để đếm dòng: file 420 dòng làm đúng một việc thì cứ để yên.
  - Kiểm tra độ dài file: `bash scripts/check_file_sizes.sh .` (script nằm trong repo, không dùng đường dẫn trong skill).
  - Kiểm tra tiến trình nền còn sót: `bash scripts/check_processes.sh`.
  - Thư mục `assets/templates` mà skill nhắc tới không tồn tại; các file PLAN/README/CLAUDE đã được tạo sẵn.
- **Hàm sinh ra phải dùng được ở NHIỀU nơi** (Huy, 2026-09-20). Đừng đẻ một đống hàm phụ chỉ để rút ngắn một file:
  hàm chỉ gọi đúng một chỗ thì viết thẳng tại chỗ. Thấy hai nơi làm cùng một việc thì gom lại ngay, kể cả đang làm dở
  việc khác — vừa làm vừa refactor. Các khối giao diện dùng chung nằm ở `src/ui/blocks.js`.
- **Trước khi tạo BẤT KỲ file nào, tự hỏi ba câu** (Huy, 2026-09-20): nội dung này có bị trùng chỗ khác không?
  đã có helper sẵn chưa? có nhét được vào module đang có thay vì đẻ file mới không? (DRY)
- **Tự đánh giá code trước khi commit** (Huy, 2026-09-20): đọc lại diff như người review — helper mới có thật sự
  dùng ở ≥ 2 nơi không, có import thừa không, hành vi người dùng thấy có đổi ngoài ý muốn không. Rồi mới commit/push.
- Code và tên biến bằng tiếng Anh; tài liệu `.md` bằng tiếng Việt.
- Commit theo dạng `type: mô tả ngắn` với type ∈ feat, fix, test, docs, chore, refactor, content.

## Quy tắc kỹ thuật bắt buộc (rút ra từ sự cố thật, ngày 2026-09-19)

Mỗi quy tắc dưới đây sinh ra từ một lỗi đã thực sự xảy ra trong project này. Không bỏ qua.

1. **Mọi lệnh gọi mạng phải có timeout.** `fetch` không timeout mặc định — một request treo làm đứng cả
   pipeline vô thời hạn (đã xảy ra: kết nối `ESTABLISHED`, không dữ liệu, đứng 3,5 phút, phải kill tay).
   Dùng `AbortSignal.timeout(ms)`. Gọi AI: 180s. Gọi API phụ (từ điển…): 8s.
2. **Lặp lệnh gọi mạng trên danh sách dài thì phải chạy song song có giới hạn.** Tra tuần tự 1200 từ mất
   hơn 7 tiếng; 8 luồng song song còn vài phút. Giới hạn số luồng để không ép máy chủ miễn phí.
3. **Không cắt ngắn thông báo lỗi mà logic dựa vào nội dung đó.** Đã cắt lỗi API ở 300 ký tự, mất đúng
   trường `quotaId`, khiến hàm phân biệt "hết hạn mức ngày" với "gửi quá nhanh" luôn sai → pipeline đập
   mãi vào model đã cạn. Hãy đọc JSON lỗi và lấy đúng trường cần, đừng so khớp chuỗi đã bị cắt.
4. **Cache phải phân biệt "không có" với "chưa lấy được".** Cache nhầm lỗi tạm thời thành "không có" là
   mất dữ liệu vĩnh viễn mà pipeline vẫn báo thành công. Quy ước: giá trị thật / `null` = chắc chắn không
   có / `undefined` = lỗi tạm thời, KHÔNG cache, lần sau lấy lại.
5. **Việc chạy dài phải ghi log ra file trực tiếp, không qua `| tail`.** `tail` giữ toàn bộ output tới khi
   tiến trình kết thúc → không theo dõi được tiến độ, không biết job đang treo. Dùng `> file.log 2>&1`.
6. **Việc chạy dài phải lưu tiến độ sau mỗi lô.** Dừng giữa chừng phải chạy lại tiếp đúng chỗ dở,
   không làm lại từ đầu (hạn mức API là tài nguyên không hoàn lại).

7. **Bộ đếm "còn lại" KHÔNG được lấy từ độ dài hàng đợi.** Lỗi này đã xảy ra ba lần ở ba màn khác
   nhau (Part 5 đứng yên ở 20, phân loại đứng yên ở 20, ôn thẻ đứng yên ở 10). Mọi hàng đợi trong
   app (`quizQueue`, `triageQueue`, `reviewQueue`) đều là **cửa sổ trượt**: chúng cắt lấy N mục từ
   một kho lớn hơn, nên làm xong một mục thì mục kế tiếp lấp ngay vào — `queue.length` không bao
   giờ giảm. Số việc còn lại phải tính từ **số việc đã làm** (đếm ngược khỏi hạn mức của lượt) hoặc
   từ một hàm đếm **không bị cắt** (`countUntriaged`, `reviewCounts`). Dùng `src/logic/round.js`;
   đừng viết lại phép tính này ở từng màn.
   *Nhận ra lỗi thế nào:* làm vài mục mà con số không nhúc nhích → gần như chắc chắn là lỗi này.

## Sau mỗi lần deploy

1. **Luôn tải lại trang trước khi kết luận lỗi còn hay hết.** Service worker phục vụ bản đã lưu
   trong máy; app tự tải lại khi phát hiện bản mới (`src/data/sw-update.js`), nhưng lần đầu sau khi
   deploy vẫn có thể thấy bản cũ. Trên Mac: `Cmd+Shift+R`. Trên iPhone: đóng hẳn app (vuốt lên) rồi mở lại.
2. **Đối chiếu số hiệu bản build** ở cuối màn chính (`bản 2026-09-19 12:19`) với lần build mới nhất.
   Khác nhau nghĩa là đang xem bản cũ, không phải lỗi chưa sửa.
3. Khi Huy báo "lỗi vẫn còn", việc ĐẦU TIÊN phải làm là kiểm tra bản đang chạy —
   đã mất thời gian vì bỏ qua bước này một lần.

## Làm song song khi an toàn

Việc nào chạy song song được mà không ảnh hưởng tiến độ và chất lượng của nhau thì làm cùng lúc,
không xếp hàng chờ.

- **An toàn**: pipeline nội dung (tiến trình riêng, chỉ ghi `pipeline/.cache/`) chạy song song với
  viết code `src/` + test; cài thêm gói npm; đọc tài liệu; sửa tài liệu `.md`.
- **Không an toàn — phải chờ**: hai việc cùng ghi một file (vd pipeline ghi `public/content/*.json`
  trong khi mình sửa chính file đó); chạy `npm test` khi đang sửa dở nửa chừng một module;
  hai lần chạy pipeline cùng lúc (cùng ghi một file cache, đè lên nhau).
- Khi có việc chạy nền, **luôn nói rõ nó đang chạy và đang ở bước nào** trong mỗi lần báo cáo.

## Checklist cuối MỖI bước con (làm đủ, không bỏ bước)

1. `npm test` pass.
2. `bash scripts/check_file_sizes.sh .` — không file nào > 450 dòng (D40).
3. **`bash scripts/check_processes.sh` — tắt mọi tiến trình nền không còn cần** (máy chủ dev bật để xem
   thử rồi quên tắt là lỗi đã xảy ra; nó chạy tới khi bị tắt, không tự dừng).
4. Cập nhật `PROGRESS.md`: vừa xong gì, bước tiếp theo cụ thể, vướng mắc.
5. Commit.

Riêng việc chạy dài (pipeline nhiều phút trở lên) thì được phép còn sống qua bước con — nhưng phải nói rõ
với Huy là nó đang chạy và đang ở đâu, không để Huy tự phát hiện.

## Ràng buộc không được vi phạm (xem DECISIONS.md)
1. **100% miễn phí.** Không thêm dịch vụ trả phí. Nếu một thứ có free tier, ghi rõ giới hạn vào DECISIONS.md.
2. **Không gọi AI lúc app chạy.** AI chỉ dùng trong `pipeline/` chạy trên máy Huy.
3. **Bí mật:** API key chỉ ở `.env` (đã có trong .gitignore). Không bao giờ đưa `service_role` key của Supabase vào frontend.
4. **Supabase bắt buộc bật RLS** cho mọi bảng ngay khi tạo.
5. **Dữ liệu người dùng là nhật ký sự kiện append-only.** Không update/delete sự kiện.
6. **ID nội dung vĩnh viễn.** Không sửa câu hỏi/từ đã phát hành; đánh dấu `retired` và tạo mục mới.
7. **Không đưa nguyên văn đề ETS vào prompt hay vào repo.**
8. **Giữ phạm vi.** Ý tưởng ngoài milestone hiện tại → ghi vào mục "Backlog" trong PLAN.md, không làm.
9. **Không âm thầm đổi quyết định.** Muốn đổi → đề xuất với Huy, được đồng ý thì ghi vào DECISIONS.md.
