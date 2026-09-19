/**
 * Đọc các danh sách từ của newgeneralservicelist.com (CSV tải sẵn về pipeline/data/).
 * Hàm thuần: nhận nội dung CSV dạng chuỗi, trả về mảng từ. Không đọc file ở đây
 * để test được mà không cần đụng ổ đĩa.
 * Nguồn & giấy phép: xem DECISIONS.md D18 và D30 (đều CC BY-SA 4.0).
 */

/** Ghi công bắt buộc kèm mọi deck sinh từ danh sách này. */
export const TSL_ATTRIBUTION = Object.freeze({
  source: 'TOEIC Service List (TSL) 1.2',
  authors: 'Browne, C. & Culligan, B. (2013)',
  license: 'CC BY-SA 4.0',
  url: 'https://www.newgeneralservicelist.com/toeic-service-list',
});

/** Danh sách tầng trên: tiếng Anh thương mại, đúng tầm Part 5 hỏi ở mức 900+ (D30). */
export const BSL_ATTRIBUTION = Object.freeze({
  source: 'Business Service List (BSL) 1.20',
  authors: 'Browne, C. & Culligan, B. (2016)',
  license: 'CC BY-SA 4.0',
  url: 'https://www.newgeneralservicelist.com/business-service-list',
});

/**
 * Những dòng trong BSL thực ra là TIỀN TỐ chứ không phải từ (`non-profit` bị tách thành `non`).
 * Học chúng như từ đơn thì vô nghĩa. Danh sách ngắn và cố định nên liệt kê tay, không đoán theo
 * độ dài — `lag`, `vow`, `oust` cũng ngắn nhưng là từ thật.
 */
export const NOT_WORDS = Object.freeze(['non', 'anti', 'pre', 'sub', 'semi', 'neo', 'mid', 'ex']);

/** Hai danh sách đang dùng. Thêm danh sách mới thì khai báo ở đây, không sửa build-vocab.js. */
export const WORDLISTS = Object.freeze({
  tsl: {
    deck: 'toeic-tsl',
    idPrefix: 'tsl',
    csv: 'pipeline/data/TSL_12_stats.csv',
    rankColumn: 'TSL Rank',
    output: 'public/content/vocab-toeic-tsl.json',
    aiCache: 'pipeline/.cache/vocab-ai.json',
    ipaCache: 'pipeline/.cache/ipa.json',
    attribution: TSL_ATTRIBUTION,
    excludeFrom: null,
  },
  bsl: {
    deck: 'toeic-bsl',
    idPrefix: 'bsl',
    csv: 'pipeline/data/BSL_120_stats.csv',
    rankColumn: 'BSL Rank',
    output: 'public/content/vocab-toeic-bsl.json',
    // Cache riêng: chạy chung một file với TSL thì hai lần chạy song song đè lên nhau.
    aiCache: 'pipeline/.cache/vocab-ai-bsl.json',
    ipaCache: 'pipeline/.cache/ipa-bsl.json',
    attribution: BSL_ATTRIBUTION,
    // Từ nào đã có trong TSL thì bỏ, tránh học trùng và tránh tốn hạn mức AI.
    excludeFrom: 'tsl',
  },
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
 * Phân tích CSV thống kê của newgeneralservicelist.com thành danh sách từ kèm thứ hạng.
 * Cột dùng đến: `Word` và cột rank (tên khác nhau giữa các danh sách). Cột thống kê khác bỏ qua.
 * Dòng thiếu từ, rank không phải số, hoặc là tiền tố (xem NOT_WORDS) sẽ bị bỏ, không hỏng cả lô.
 * @param {string} csv - toàn bộ nội dung file
 * @param {{rankColumn?: string}} [options]
 * @returns {Array<{word: string, rank: number}>} sắp xếp tăng dần theo rank
 */
export function parseTslCsv(csv, { rankColumn = 'TSL Rank' } = {}) {
  // File BSL/NAWL tải về có BOM ở đầu; không bỏ thì tên cột đầu tiên không khớp.
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) return [];

  const header = splitRow(lines[0]);
  const wordIndex = header.indexOf('Word');
  const rankIndex = header.indexOf(rankColumn);
  if (wordIndex === -1 || rankIndex === -1) {
    throw new Error(`CSV thiếu cột "Word" hoặc "${rankColumn}" — có đúng file stats không?`);
  }
  const skip = new Set(NOT_WORDS);

  const words = [];
  for (const line of lines.slice(1)) {
    const cells = splitRow(line);
    const word = cells[wordIndex]?.toLowerCase();
    const rank = Number.parseInt(cells[rankIndex], 10);
    if (!word || !Number.isInteger(rank)) continue;
    if (skip.has(word)) continue;
    words.push({ word, rank });
  }
  return words.sort((a, b) => a.rank - b.rank);
}

/**
 * Sinh id vĩnh viễn cho một từ theo thứ hạng (D16: id không bao giờ đổi).
 * Tiền tố tách id của hai danh sách ra: `tsl-0007` và `bsl-0007` là hai từ khác nhau.
 * @param {number} rank
 * @param {string} [prefix]
 * @returns {string} vd rank 7 -> "tsl-0007"
 */
export function makeVocabId(rank, prefix = 'tsl') {
  if (!Number.isInteger(rank) || rank < 1 || rank > 9999) {
    throw new Error(`rank không hợp lệ: ${rank}`);
  }
  if (!/^[a-z]{2,5}$/.test(prefix)) throw new Error(`tiền tố id không hợp lệ: ${prefix}`);
  return `${prefix}-${String(rank).padStart(4, '0')}`;
}
