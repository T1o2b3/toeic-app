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
- Tuân theo skill `.claude/skills/mini-project-setup/SKILL.md` (logic tách UI, file < 300 dòng, test trước khi nối UI, commit nhỏ).
  - Kiểm tra độ dài file: `bash scripts/check_file_sizes.sh .` (script nằm trong repo, không dùng đường dẫn trong skill).
  - Thư mục `assets/templates` mà skill nhắc tới không tồn tại; các file PLAN/README/CLAUDE đã được tạo sẵn.
- Code và tên biến bằng tiếng Anh; tài liệu `.md` bằng tiếng Việt.
- Commit theo dạng `type: mô tả ngắn` với type ∈ feat, fix, test, docs, chore, refactor, content.

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
