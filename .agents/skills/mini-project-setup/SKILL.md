---
name: mini-project-setup
description: Khởi tạo, tổ chức và quản lý mini project web (HTML/CSS/JavaScript) theo cấu trúc nhiều file, có test, git và kế hoạch theo milestone. Dùng skill này bất cứ khi nào được yêu cầu tạo một tool, app nhỏ, game, dashboard, hoặc bất kỳ trang web tương tác nào. Cũng dùng khi cần tái cấu trúc (refactor) một file quá dài thành project có tổ chức, hoặc khi thêm tính năng vào project đã tạo theo skill này.
---

# Mini project setup (Modernized)

Mục tiêu: mọi mini project đều dễ đọc, dễ sửa, dễ test — không dồn toàn bộ code vào một file dài. Ưu tiên sự đơn giản, tránh over-engineering.

## Nguyên tắc cốt lõi

1. **Mỗi file một trách nhiệm.** 
   - Mục tiêu: khoảng 400 dòng/file.
   - Trần cứng: 450 dòng. Vượt quá mức này bắt buộc phải tách file.
2. **Tách logic khỏi giao diện.**
   - `src/logic/`: hàm thuần (pure functions), không đụng DOM. Test được bằng Node.
   - `src/ui/`: đọc/ghi DOM, gắn sự kiện, gọi hàm từ `logic/`.
   - `logic/` không bao giờ import từ `ui/`.
3. **Không viết code trước khi có kế hoạch được duyệt.**
4. **Không sang milestone mới khi test đang fail.**
5. **Commit nhỏ, thường xuyên**, mỗi commit một thay đổi có ý nghĩa.

## Quy trình phát triển bền vững (Sustainablity)

Để tránh phình to codebase vô ích, trước khi tạo BẤT KỲ file hoặc hàm helper nào, phải tự hỏi:
1. Nội dung này có bị trùng chỗ khác không?
2. Đã có helper sẵn chưa?
3. Có thể nhét vào module đang có thay vì đẻ file mới không? (DRY)

**Quy tắc gom hàm:** Hàm chỉ gọi đúng một chỗ thì viết thẳng tại chỗ. Thấy hai nơi làm cùng một việc thì gom lại thành helper dùng chung.

## Quy trình tạo project mới

### Bước 1 — Làm rõ yêu cầu và viết PLAN.md
- Đọc yêu cầu, liệt kê tính năng. Hỏi ngắn gọn nếu có điểm mơ hồ.
- Tạo `PLAN.md`: mục tiêu, phạm vi, cấu trúc thư mục dự kiến và các Milestone nhỏ có tiêu chí "xong khi...".
- **Dừng lại, trình bày PLAN.md cho người dùng duyệt.**

### Bước 2 — Khởi tạo khung
```bash
npm create vite@latest <ten-project> -- --template vanilla
cd <ten-project>
npm install
npm install -D vitest
```
- Cấu hình `package.json` scripts: `"test": "vitest run"`.
- Tạo cấu trúc thư mục: `src/logic/`, `src/ui/`, `tests/`, `scripts/`.
- Tạo `README.md`, `AGENTS.md` (quy tắc làm việc), và `.gitignore`.
- Viết 1 test mẫu $\rightarrow$ chạy `npm test` pass.
- `git init`, commit: `chore: initial project setup`.

### Bước 3 — Làm từng milestone
Với mỗi milestone, lặp theo thứ tự:
1. Viết logic trong `src/logic/` kèm JSDoc.
2. Viết test trong `tests/` (case bình thường + case biên).
3. `npm test` $\rightarrow$ sửa đến khi pass.
4. Nối vào `src/ui/`.
5. Kiểm tra độ dài file: `bash scripts/check_file_sizes.sh .` (script nằm trong repo).
6. Kiểm tra tiến trình nền: `bash scripts/check_processes.sh`.
7. Commit theo chuẩn: `type: mô tả ngắn` (type $\in$ feat, fix, test, docs, chore, refactor, content).
8. Đánh dấu `[x]` trong PLAN.md, báo người dùng.

## Tái cấu trúc và Bảo trì
- Khi một file tiến gần mốc 400 dòng $\rightarrow$ thực hiện refactor tách file.
- Luôn rà soát xem có hàm nào lặp lại $\ge 2$ nơi để gom về helper.
- Khi thay đổi lớn, sử dụng Graphify để phân tích tác động trước khi code.

## Tài liệu đi kèm
- `assets/templates/` — Mẫu PLAN.md, README.md, AGENTS.md.
- `scripts/check_file_sizes.sh` — Liệt kê file vượt ngưỡng 450 dòng.
- `scripts/check_processes.sh` — Tìm và tắt các server/process chạy ngầm không cần thiết.
