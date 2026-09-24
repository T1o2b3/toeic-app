/**
 * Tiện ích cho các script chạy bằng dòng lệnh trong `pipeline/`: tìm gốc project, ngày hôm nay, đọc cờ.
 *
 * Bốn script `build-*.js` đều chép tay đúng ba thứ này. Chúng không phải "logic sinh nội dung" mà là
 * chuyện vặt của việc chạy CLI — tách ra đây để mỗi script chỉ còn phần việc riêng của nó.
 *
 * CỐ Ý không gom thành một `parseArgs` chung: mỗi script có bộ cờ riêng (`--target`, `--part`,
 * `--variant`, `--list`, `--no-generate`) kèm giá trị mặc định riêng, có cái còn phụ thuộc cờ khác
 * (mặc định của `--target` ở build-sets đổi theo `--part`). Một hàm đọc HẾT cờ cho cả bốn sẽ phải biết
 * mọi cờ của mọi script — gom vào là buộc bốn thứ không liên quan vào nhau. Ở đây chỉ gom "đọc MỘT cờ".
 */

const ROOT = new URL('../../', import.meta.url);

/**
 * Đường dẫn tuyệt đối tính từ gốc project, để script chạy từ thư mục nào cũng đúng.
 * @param {string} relative - vd 'public/content/questions-part5.json'
 * @returns {string}
 */
export const projectPath = (relative) => new URL(relative, ROOT).pathname;

/** Thư mục public/ (có dấu / cuối) — nơi ghi nội dung và âm thanh mà app phục vụ. */
export const PUBLIC_DIR = projectPath('public/');

/**
 * Ngày hôm nay dạng `YYYY-MM-DD` (giờ UTC) — dùng cho `gen.date` / `gen.batch` của nội dung sinh ra.
 * Là HÀM chứ không phải hằng số: script chạy nhiều giờ (pipeline sinh cả nghìn mục) có thể vắt qua
 * nửa đêm, lúc đó mỗi lô nên mang đúng ngày của nó.
 * @returns {string}
 */
export const today = () => new Date().toISOString().slice(0, 10);

/**
 * Giá trị chữ đứng sau một cờ: `--list bsl` → `'bsl'`.
 * @param {string[]} argv
 * @param {string} flag
 * @param {string} [fallback] - trả về khi không có cờ
 * @returns {string|undefined}
 */
export function flagValue(argv, flag, fallback) {
  const index = argv.indexOf(flag);
  return index === -1 ? fallback : argv[index + 1];
}

/**
 * Giá trị số đứng sau một cờ: `--target 200` → `200`.
 * Không có cờ thì trả về `fallback` NGUYÊN VẸN, không ép về số — nhờ vậy `Infinity` (build-vocab)
 * hay `NaN` (build-sets dùng để phát hiện thiếu `--part`) vẫn giữ đúng ý nghĩa.
 * @param {string[]} argv
 * @param {string} flag
 * @param {number} fallback
 * @returns {number}
 */
export function flagNumber(argv, flag, fallback) {
  const index = argv.indexOf(flag);
  return index === -1 ? fallback : Number.parseInt(argv[index + 1], 10);
}

/**
 * Cờ bật/tắt, không có giá trị đi kèm: `--no-generate`.
 * @param {string[]} argv
 * @param {string} flag
 * @returns {boolean}
 */
export const hasFlag = (argv, flag) => argv.includes(flag);
