/**
 * Đọc danh sách TOEIC Service List 1.2 (file CSV tải từ newgeneralservicelist.com).
 * Hàm thuần: nhận nội dung CSV dạng chuỗi, trả về mảng từ. Không đọc file ở đây
 * để test được mà không cần đụng ổ đĩa.
 * Nguồn & giấy phép: xem DECISIONS.md D18 (CC BY-SA 4.0).
 */

/** Ghi công bắt buộc kèm mọi deck sinh từ danh sách này. */
export const TSL_ATTRIBUTION = Object.freeze({
  source: 'TOEIC Service List (TSL) 1.2',
  authors: 'Browne, C. & Culligan, B. (2013)',
  license: 'CC BY-SA 4.0',
  url: 'https://www.newgeneralservicelist.com/toeic-service-list',
});

/**
 * Tách một dòng CSV đơn giản (không có dấu phẩy trong ô, đúng với file TSL).
 * @param {string} line
 * @returns {string[]}
 */
function splitRow(line) {
  return line.split(',').map((cell) => cell.trim());
}

/**
 * Phân tích CSV "TSL 1.2 with basic statistics" thành danh sách từ kèm thứ hạng.
 * Cột dùng đến: `Word`, `TSL Rank`. Các cột thống kê khác bỏ qua.
 * Dòng thiếu từ hoặc rank không phải số sẽ bị bỏ, không làm hỏng cả lô.
 * @param {string} csv - toàn bộ nội dung file
 * @returns {Array<{word: string, rank: number}>} sắp xếp tăng dần theo rank
 */
export function parseTslCsv(csv) {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const header = splitRow(lines[0]);
  const wordIndex = header.indexOf('Word');
  const rankIndex = header.indexOf('TSL Rank');
  if (wordIndex === -1 || rankIndex === -1) {
    throw new Error('CSV thiếu cột "Word" hoặc "TSL Rank" — có phải file TSL 1.2 stats không?');
  }

  const words = [];
  for (const line of lines.slice(1)) {
    const cells = splitRow(line);
    const word = cells[wordIndex]?.toLowerCase();
    const rank = Number.parseInt(cells[rankIndex], 10);
    if (!word || !Number.isInteger(rank)) continue;
    words.push({ word, rank });
  }
  return words.sort((a, b) => a.rank - b.rank);
}

/**
 * Sinh id vĩnh viễn cho một từ theo thứ hạng (D16: id không bao giờ đổi).
 * @param {number} rank
 * @returns {string} vd rank 7 -> "tsl-0007"
 */
export function makeVocabId(rank) {
  if (!Number.isInteger(rank) || rank < 1 || rank > 9999) {
    throw new Error(`rank không hợp lệ: ${rank}`);
  }
  return `tsl-${String(rank).padStart(4, '0')}`;
}
