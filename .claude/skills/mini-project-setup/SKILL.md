---
name: mini-project-setup
description: Khởi tạo, tổ chức và quản lý mini project web (HTML/CSS/JavaScript) theo cấu trúc nhiều file, có test, git và kế hoạch theo milestone. Dùng skill này bất cứ khi nào được yêu cầu tạo một tool, app nhỏ, game, trang trực quan hóa/mô phỏng (vd: K-map, Gray code, thuật toán), dashboard nhỏ, hoặc bất kỳ trang web tương tác nào — kể cả khi người dùng chỉ nói "tạo file html có chức năng...". Cũng dùng khi cần tái cấu trúc (refactor) một file quá dài thành project có tổ chức, hoặc khi thêm tính năng vào project đã tạo theo skill này.
---

# Mini project setup

Mục tiêu: mọi mini project đều dễ đọc, dễ sửa, dễ test — không dồn toàn bộ code vào một file dài.

## Nguyên tắc cốt lõi

1. **Mỗi file một trách nhiệm.** Mục tiêu dưới ~300 dòng/file. Vượt quá thì tách tiếp.
2. **Tách logic khỏi giao diện.**
   - `src/logic/`: hàm thuần (nhận input, trả output), không đụng `document`, `window`, DOM. Test được bằng Node.
   - `src/ui/`: đọc/ghi DOM, gắn sự kiện, gọi hàm từ `logic/`.
   - `logic/` **không bao giờ** import từ `ui/`.
3. **Không viết code trước khi có kế hoạch được duyệt.**
4. **Không sang milestone mới khi test đang fail.**
5. **Commit nhỏ, thường xuyên**, mỗi commit một thay đổi có ý nghĩa.

Ngoại lệ: nếu người dùng nói rõ cần **một file duy nhất** (để gửi nhanh, nhúng vào nơi khác), hãy hỏi lại một lần xem họ muốn "project nhiều file rồi build ra một file" hay "chỉ một file thật sự". Với lựa chọn đầu, vẫn làm theo skill này và dùng `vite-plugin-singlefile` ở bước build (xem `references/structure.md`).

## Quy trình tạo project mới

### Bước 1 — Làm rõ yêu cầu và viết PLAN.md
- Đọc yêu cầu, liệt kê tính năng. Nếu có điểm mơ hồ quan trọng (đối tượng dùng, thiết bị, ngôn ngữ giao diện), hỏi ngắn gọn.
- Tạo `PLAN.md` từ `assets/templates/PLAN.md`:
  - Mục tiêu 2–3 câu, phạm vi (làm gì / **không** làm gì).
  - Cấu trúc thư mục dự kiến (tên file + trách nhiệm một dòng).
  - Milestone: mỗi milestone nhỏ, **kiểm chứng được** (có tiêu chí "xong khi..."). Milestone 1 luôn là khung project chạy được + 1 test mẫu pass.
- **Dừng lại, trình bày PLAN.md cho người dùng duyệt.** Chỉ tiếp tục khi được đồng ý.

### Bước 2 — Khởi tạo khung
```bash
npm create vite@latest <ten-project> -- --template vanilla
cd <ten-project>
npm install
npm install -D vitest
```
- Thêm vào `package.json` → `scripts`: `"test": "vitest run"`, `"test:watch": "vitest"`.
- Xóa file mẫu của Vite (counter.js, logo...), tạo cấu trúc theo `references/structure.md`.
- Tạo `README.md`, `CLAUDE.md` từ `assets/templates/`, và `.gitignore` từ `assets/templates/gitignore` (điền thông tin thật, xóa phần giữ chỗ `<...>`).
- Viết 1 test mẫu cho 1 hàm logic đơn giản (tham khảo `assets/templates/example.test.js`), chạy `npm test` pass.
- `git init`, commit: `chore: initial project setup`.

### Bước 3 — Làm từng milestone
Với mỗi milestone, lặp theo thứ tự:
1. Viết/ sửa hàm trong `src/logic/` kèm JSDoc ngắn.
2. Viết test trong `tests/` (case bình thường + case biên).
3. `npm test` → sửa đến khi pass.
4. Nối vào `src/ui/`.
5. Chạy script kiểm tra độ dài file của skill này (`scripts/check_file_sizes.sh`, nằm trong thư mục skill, vd `bash ~/.claude/skills/mini-project-setup/scripts/check_file_sizes.sh .`) — nếu có file > 300 dòng, tách trước khi commit.
6. Commit theo `references/git-conventions.md`.
7. Đánh dấu `[x]` milestone trong PLAN.md, báo người dùng ngắn gọn: đã làm gì, cách thử (`npm run dev`), milestone tiếp theo.

Nếu phát hiện kế hoạch sai hoặc thiếu giữa chừng: cập nhật PLAN.md và báo người dùng, không âm thầm đổi hướng.

### Bước 4 — Kết thúc
- Cập nhật README (tính năng, cách chạy, cách test, cấu trúc).
- Cập nhật CLAUDE.md nếu có quy ước mới.
- Nếu cần bản chia sẻ: `npm run build` → thư mục `dist/`.

## Thêm tính năng vào project có sẵn
1. Đọc `CLAUDE.md` và `PLAN.md` trước.
2. Thêm milestone mới vào PLAN.md, trình bày cho người dùng.
3. Làm theo Bước 3. Giữ đúng cấu trúc và quy ước hiện có.

## Tái cấu trúc một file dài có sẵn
Đọc và làm theo `references/refactor.md`.

## Tài liệu đi kèm
- `references/structure.md` — cấu trúc thư mục chuẩn, cách chia module, quy ước đặt tên, cách build một file.
- `references/git-conventions.md` — quy ước commit, khi nào commit.
- `references/refactor.md` — quy trình tách file dài an toàn.
- `assets/templates/` — PLAN.md, README.md, CLAUDE.md, .gitignore, test mẫu.
- `scripts/check_file_sizes.sh` — liệt kê file vượt ngưỡng số dòng.
