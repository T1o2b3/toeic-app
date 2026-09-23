---
name: mini-project-setup
description: Khởi tạo, tổ chức và quản lý mini project web (HTML/CSS/JavaScript) theo cấu trúc nhiều file, có test, git và kế hoạch theo milestone. Dùng skill này bất cứ khi nào được yêu cầu tạo một tool, app nhỏ, game, trang trực quan hóa/mô phỏng (vd: K-map, Gray code, thuật toán), dashboard nhỏ, hoặc bất kỳ trang web tương tác nào — kể cả khi người dùng chỉ nói "tạo file html có chức năng...". Cũng dùng khi cần tái cấu trúc (refactor) một file quá dài thành project có tổ chức, hoặc khi thêm tính năng vào project đã tạo theo skill này.
---

# Mini project setup

Mục tiêu: mọi mini project đều dễ đọc, dễ sửa, dễ test — không dồn toàn bộ code vào một file dài.

## Nguyên tắc cốt lõi

1. **Mỗi file một trách nhiệm.** Mục tiêu ~400 dòng/file, trần cứng 450 (project toeic_app nới từ 300
   ngày 2026-09-20, xem D40). Mốc này để giữ "một file một việc", không phải để đếm dòng.
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
5. Chạy `bash scripts/check_file_sizes.sh .` (script nằm TRONG repo của project, không phải trong thư mục
   skill) — nếu có file vượt trần, tách trước khi commit.
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

## Plugin của Claude Code — chọn và tối ưu

**Plugin là gì:** một gói cài thêm vào Claude Code, mang theo skill (hướng dẫn chuyên môn), agent (trợ lý
con), hook (đoạn code tự chạy mỗi lần gửi prompt) hoặc MCP server (cầu nối tới dịch vụ ngoài). Khác với gói
npm: npm là thư viện cho *app chạy*, plugin là kiến thức/công cụ cho *Claude làm việc*. Đừng lẫn hai thứ —
`vite-plugin-pwa` trong PLAN.md là gói npm, không phải plugin Claude Code.

**Cái giá phải trả:** phần mô tả của mọi skill trong plugin được nạp vào **mọi phiên**, kể cả phiên không
dùng tới. Đó là "always-on token". Cài nhiều plugin = mỗi phiên tốn thêm vài nghìn token trước khi gõ chữ
đầu tiên, và Claude phải đọc lướt qua nhiều hướng dẫn không liên quan.

**Quy tắc tối ưu (làm theo, đừng cài bừa):**
1. **Đo trước khi giữ.** `claude plugin details <ten>@<marketplace>` in ra "Always-on" — số token cộng vào
   mỗi phiên. Trên ~1.000 token thì phải trả lời được "dùng vào việc gì trong project này".
2. **Ngân sách: tổng always-on của tất cả plugin nên dưới ~8.000 token.** Vượt thì `claude plugin disable
   <ten>` cái ít dùng nhất — tắt chứ không cần gỡ, khi cần bật lại bằng `enable`.
3. **Ưu tiên plugin chỉ có skill.** Plugin có `Hooks` chạy code ở mọi prompt, plugin có `MCP servers` mở
   kết nối ra ngoài — hai loại này mạnh nhưng nặng và khó gỡ rối hơn, chỉ cài khi thật cần.
4. **Một plugin một việc.** Đừng cài hai plugin cùng lo một chuyện (vd hai bộ code-review).
5. **Rà lại mỗi khi mở milestone mới:** `claude plugin list`, cái nào cả milestone trước không đụng tới thì tắt.

**Đang cài cho project này (tổng always-on ~8.000 token):**

| Plugin | Dùng để làm gì | Always-on |
|---|---|---|
| `agent-skills@addy-agent-skills` | 34 skill + 4 agent cho cả vòng đời: spec → build → review → ship. Nặng nhất, cũng rộng nhất. | ~3.600 |
| `cloudflare@claude-plugins-official` | App deploy lên Cloudflare Workers — skill Wrangler, Workers, web-perf. Kèm 1 MCP server. | ~1.000 |
| `ponytail@ponytail` | Ép chọn giải pháp đơn giản nhất chạy được (YAGNI). **Có 3 hook chạy ở mọi prompt.** | ~1.000 |
| `modern-web-guidance@claude-plugins-official` | Cập nhật best practice web hiện đại — hợp với người mới học web/PWA. | ~760 |
| `frontend-design@claude-plugins-official` | Làm giao diện có gu, tránh kiểu "AI generic". | ~80 |
| `serena@claude-plugins-official` | **MCP đọc code theo ký hiệu** (hàm, class) qua language server — tìm và sửa đúng chỗ mà không phải đọc cả file. Đây là cái giảm token nhiều nhất. Cần `uv` (đã cài bằng `brew install uv`). | MCP |
| `claude-md-management@claude-plugins-official` | Giữ CLAUDE.md khỏi lạc hậu, gom bài học mỗi phiên vào đó. | ~600 |

**Plugin có MCP server thì phải kiểm thêm hai thứ**, cài xong chưa chắc chạy:
1. **Lệnh nền có sẵn chưa.** Xem `.mcp.json` của plugin trong `~/.claude/plugins/cache/<marketplace>/<ten>/`.
   `serena` gọi `uvx` — máy không có `uv` thì MCP im lặng không khởi động. Đã `brew install uv`.
2. **Có cần đăng nhập không.** `cloudflare` cần OAuth: mở Claude Code ở terminal, gõ `/mcp`, cho phép.
   Chưa đăng nhập thì 14 skill vẫn dùng được, chỉ mất phần gọi thẳng API.

MCP server chỉ nạp lúc **mở phiên mới** — cài xong phải `/clear` hoặc mở phiên khác mới dùng được.

**Cài thêm:**
```bash
claude plugin marketplace add <owner>/<repo>   # thêm nguồn
claude plugin install <ten>@<marketplace>      # cài
```
Không phải repo GitHub nào cũng là marketplace — phải có file `.claude-plugin/marketplace.json`, không có
thì lệnh `add` báo "Marketplace file not found".

**Máy Huy chưa cấu hình SSH cho GitHub**, nên `install` từ marketplace ngoài có thể chết với
"Host key verification failed". Ép dùng HTTPS cho riêng lệnh đó (không đổi cấu hình git chung):
```bash
GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0='url.https://github.com/.insteadOf' GIT_CONFIG_VALUE_0='git@github.com:' claude plugin install <ten>@<marketplace>
```

## Tài liệu đi kèm
- `references/structure.md` — cấu trúc thư mục chuẩn, cách chia module, quy ước đặt tên, cách build một file.
- `references/git-conventions.md` — quy ước commit, khi nào commit.
- `references/refactor.md` — quy trình tách file dài an toàn.
- `assets/templates/` — PLAN.md, README.md, CLAUDE.md, .gitignore, test mẫu.
- `scripts/check_file_sizes.sh` — liệt kê file vượt ngưỡng số dòng.
