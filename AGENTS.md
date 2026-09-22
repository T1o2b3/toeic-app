# AGENTS.md — Quy tắc làm việc cho project TOEIC app

Codex tự đọc file này ở đầu mọi phiên. Mọi quy tắc ở đây là bắt buộc.

## Bối cảnh
- Chủ project: Huy, sinh viên ngành Phần mềm, **mới bắt đầu với web dev/PWA**. Trả lời bằng **tiếng Việt**.
- Mục tiêu: app ôn TOEIC Listening & Reading (850 → 950) dùng trên 2 máy Mac + iPhone, sau này mở rộng sang từ vựng đời thường.
- Nhịp học dự kiến: 1–2 giờ/tuần, dài hạn 6–12 tháng → app ưu tiên phiên học ngắn, nhịp ôn nhẹ.
- Tài liệu gốc: `PLAN.md` (milestone), `DECISIONS.md` (quyết định + lý do), `PROGRESS.md` (trạng thái bàn giao giữa các phiên).

## Giao thức phiên làm việc (quan trọng nhất)
**Đầu phiên:**
1. Đọc `PROGRESS.md` → biết đang ở milestone nào, bước tiếp theo là gì.
2. Chạy `git status` và `git log --oneline -5` để đối chiếu với PROGRESS.md.
   **Rồi `git fetch --prune` + `git branch -r --no-merged main`** (Huy, 2026-09-20: "thường xuyên kiểm tra
   branch và nếu không xung đột hãy merge khi có thể"). Nhánh nào merge sạch thì merge luôn, không để
   nhánh sống lâu. Có xung đột thì DỪNG, báo Huy chỗ đụng nhau chứ không tự chọn bên.
3. **Phân tích kiến trúc (nếu là refactor hoặc tính năng mới):** Sử dụng plugin **Graphify** để vẽ lại luồng dữ liệu và quan hệ file. Không code khi chưa hiểu rõ tác động lan truyền.
4. Tóm tắt cho Huy trong 3–5 dòng: đang ở đâu, hôm nay làm gì, ước tính bao lâu.

**Sau MỖI bước con hoàn thành (không đợi hết milestone):**
1. `npm test` phải pass (nếu đã có test).
2. Cập nhật `PROGRESS.md`: việc vừa xong, bước tiếp theo cụ thể đến mức phiên mới làm tiếp được ngay, vướng mắc nếu có.
3. Commit (quy ước ở dưới).

**Khi context sắp đầy hoặc phiên dài:** chủ động dừng, cập nhật `PROGRESS.md`, commit, rồi báo Huy: "Đã lưu trạng thái, hãy gõ `/clear` rồi bắt đầu phiên mới."

**Hết milestone:** đánh dấu `[x]` trong `PLAN.md`, ghi thời gian thực tế so với ước tính vào PROGRESS.md, báo Huy cách tự kiểm tra.

## Chế độ dạy học
- Trước khi dùng một khái niệm mới, giải thích ngắn gọn: nó là gì, giải quyết vấn đề gì, tại sao chọn nó. Tối đa ~10 dòng, có ví dụ.
- Ở các bước học quan trọng, **hướng dẫn Huy tự gõ lệnh/tự thao tác** thay vì làm hộ.
- Không giả định Huy biết thuật ngữ. Nếu dùng thuật ngữ tiếng Anh, giải thích lần đầu.

## Quy trình code
- **Tra cứu kỹ năng:** Luôn kiểm tra **Agent Skills** hiện có để xem có workflow hoặc template nào phù hợp trước khi tự viết logic mới.
- Tuân theo skill `.Codex/skills/mini-project-setup/SKILL.md` (logic tách UI, test trước khi nối UI, commit nhỏ).
  - **Độ dài file: khoảng 400 dòng, trần cứng 450** (D40). 
  - Kiểm tra độ dài file: `bash scripts/check_file_sizes.sh .`.
  - Kiểm tra tiến trình nền còn sót: `bash scripts/check_processes.sh`.
- **Hàm sinh ra phải dùng được ở NHIỀU nơi**: Hàm chỉ gọi đúng một chỗ thì viết thẳng tại chỗ. Thấy hai nơi làm cùng một việc thì gom lại ngay. Các khối giao diện dùng chung nằm ở `src/ui/blocks.js`.
- **Trước khi tạo BẤT KỲ file nào, tự hỏi ba câu**: nội dung này có bị trùng chỗ khác không? đã có helper sẵn chưa? có nhét được vào module đang có thay vì đẻ file mới không? (DRY)
- **Tự đánh giá code trước khi commit**: 
  1. Đọc diff như người review.
  2. **Chống Over-engineering**: Sử dụng plugin **Ponytail** (`ponytail-review`) để rà soát xem giải pháp có bị quá phức tạp/thừa thãi không. Ưu tiên giải pháp "lười" nhất nhưng vẫn chạy đúng.
  3. Kiểm tra import thừa, hành vi người dùng.
- Code và tên biến bằng tiếng Anh; tài liệu `.md` bằng tiếng Việt.
- Commit theo dạng `type: mô tả ngắn` với type ∈ feat, fix, test, docs, chore, refactor, content.

## Quy tắc kỹ thuật bắt buộc (rút ra từ sự cố thật)

1. **Mọi lệnh gọi mạng phải có timeout.** Dùng `AbortSignal.timeout(ms)`. AI: 180s. API phụ: 8s.
2. **Lặp lệnh gọi mạng trên danh sách dài thì phải chạy song song có giới hạn.**
3. **Không cắt ngắn thông báo lỗi mà logic dựa vào nội dung đó.** Đọc JSON lỗi và lấy đúng trường cần.
4. **Cache phải phân biệt "không có" với "chưa lấy được".** `null` = chắc chắn không có / `undefined` = lỗi tạm thời.
5. **Việc chạy dài phải ghi log ra file trực tiếp, không qua `| tail`.** Dùng `> file.log 2>&1`.
6. **Việc chạy dài phải lưu tiến độ sau mỗi lô.**
7. **Bộ đếm "còn lại" KHÔNG được lấy từ độ dài hàng đợi.** Dùng `src/logic/round.js`.
8. **Quản lý Model & Chi phí (Pipeline):** Sử dụng **OmniRoute** để điều phối model, theo dõi chi phí và cấu hình fallback khi model chính hết hạn mức (quota). Không hardcode model nếu có thể điều phối qua routing.

## Sau mỗi lần deploy

1. **Luôn tải lại trang trước khi kết luận lỗi.** Mac: `Cmd+Shift+R`. iPhone: đóng hẳn app rồi mở lại.
2. **Đối chiếu số hiệu bản build** ở cuối màn chính với lần build mới nhất.
3. Khi Huy báo "lỗi vẫn còn", việc ĐẦU TIÊN là kiểm tra bản đang chạy.

## Làm song song khi an toàn

- **An toàn**: pipeline nội dung chạy song song với viết code `src/` + test; cài npm; đọc/sửa tài liệu.
- **Không an toàn**: hai việc cùng ghi một file; chạy `npm test` khi đang sửa dở module; hai lần chạy pipeline cùng lúc.
- Khi có việc chạy nền, **luôn nói rõ nó đang chạy và đang ở bước nào** trong mỗi báo cáo.

## Checklist cuối MỖI bước con (làm đủ, không bỏ bước)

1. `npm test` pass.
2. `bash scripts/check_file_sizes.sh .` — không file nào > 450 dòng.
3. **`bash scripts/check_processes.sh` — tắt mọi tiến trình nền không còn cần**. Huy cho phép tự tắt, báo lại một dòng là đã tắt cái gì.
4. Cập nhật `PROGRESS.md`: vừa xong gì, bước tiếp theo cụ thể, vướng mắc.
5. Commit.

## Ràng buộc không được vi phạm (xem DECISIONS.md)
1. **100% miễn phí.** 
2. **Không gọi AI lúc app chạy.** AI chỉ dùng trong `pipeline/`.
3. **Bí mật:** API key chỉ ở `.env`. Không đưa `service_role` vào frontend.
4. **Supabase bắt buộc bật RLS** cho mọi bảng ngay khi tạo.
5. **Dữ liệu người dùng là nhật ký sự kiện append-only.**
6. **ID nội dung vĩnh viễn.** Đánh dấu `retired` thay vì sửa.
7. **Không đưa nguyên văn đề ETS vào prompt hay vào repo.**
8. **Giữ phạm vi.** Ý tưởng ngoài milestone → ghi vào "Backlog" trong PLAN.md.
9. **Không âm thầm đổi quyết định.** Muốn đổi → đề xuất với Huy, ghi vào DECISIONS.md.
