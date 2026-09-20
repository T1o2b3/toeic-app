/**
 * Quy đổi SỐ CÂU ĐÚNG → điểm TOEIC 10–990 (D39). Hàm thuần, không đụng DOM.
 *
 * **Vì sao trước đây không làm (D36, D38) và vì sao giờ làm:** bảng quy đổi của ETS thay đổi theo từng đề
 * chuẩn hoá, và câu hỏi của app do AI ra nên độ khó chưa hiệu chuẩn — một con số điểm duy nhất là số bịa.
 * Huy yêu cầu có điểm để biết mình đang ở đâu so với mục tiêu 950, nên app quy đổi nhưng luôn hiện một
 * **KHOẢNG điểm** kèm chữ "ước lượng", không bao giờ hiện một con số trần trụi.
 *
 * Khoảng điểm gồm hai nguồn sai số cộng lại:
 *   1. *Bảng quy đổi*: mỗi mốc số câu đúng ứng với một khoảng điểm (đề dễ thì cùng số câu được ít điểm hơn).
 *      Bảng dưới đây là khoảng công bố trong tài liệu luyện thi chính thức của ETS.
 *   2. *Số câu ít*: làm 30 câu Part 5 rồi suy ra điểm phần Đọc 100 câu thì sai số lấy mẫu rất lớn.
 *      Tính bằng sai số chuẩn của tỉ lệ: `sqrt(p(1-p)/n)`, quy về thang 100 câu.
 *
 * Điểm TOEIC luôn là bội số của 5, nên mọi con số ra khỏi file này đều làm tròn về bội của 5.
 */

/** Mục tiêu của Huy (CLAUDE.md): 850 → 950. */
export const GOAL_SCORE = 950;

/** Số câu của mỗi kỹ năng trong đề THẬT (thang quy đổi luôn tính trên 100 câu). */
export const FULL_QUESTIONS = 100;

/** [số câu đúng từ, đến, điểm thấp nhất, điểm cao nhất] — bảng quy đổi phần Nghe. */
const LISTENING_TABLE = Object.freeze([
  [96, 100, 475, 495], [91, 95, 435, 495], [86, 90, 405, 470], [81, 85, 370, 450],
  [76, 80, 345, 420], [71, 75, 320, 390], [66, 70, 290, 360], [61, 65, 265, 335],
  [56, 60, 240, 310], [51, 55, 215, 280], [46, 50, 190, 255], [41, 45, 160, 230],
  [36, 40, 135, 205], [31, 35, 110, 180], [26, 30, 85, 155], [21, 25, 60, 125],
  [16, 20, 30, 95], [11, 15, 5, 70], [6, 10, 5, 40], [1, 5, 5, 15], [0, 0, 5, 5],
]);

/** Bảng quy đổi phần Đọc. Cùng số câu đúng, phần Đọc thường được ít điểm hơn phần Nghe. */
const READING_TABLE = Object.freeze([
  [96, 100, 460, 495], [91, 95, 425, 490], [86, 90, 395, 465], [81, 85, 370, 440],
  [76, 80, 335, 415], [71, 75, 310, 390], [66, 70, 280, 365], [61, 65, 250, 335],
  [56, 60, 220, 305], [51, 55, 195, 270], [46, 50, 165, 240], [41, 45, 140, 215],
  [36, 40, 115, 180], [31, 35, 95, 150], [26, 30, 75, 120], [21, 25, 60, 95],
  [16, 20, 45, 75], [11, 15, 30, 55], [6, 10, 10, 40], [1, 5, 5, 15], [0, 0, 5, 5],
]);

const TABLES = { listening: LISTENING_TABLE, reading: READING_TABLE };

/** Điểm từng phần chạy từ 5 tới 495. */
export const SECTION_MIN = 5;
export const SECTION_MAX = 495;

const round5 = (value) => Math.round(value / 5) * 5;
const clampSection = (value) => Math.min(SECTION_MAX, Math.max(SECTION_MIN, value));

/**
 * Khoảng điểm của bảng quy đổi cho một số câu đúng (thang 100 câu).
 * @param {number} raw
 * @param {string} skill - 'listening' | 'reading'
 * @returns {{low: number, high: number}}
 */
export function tableBand(raw, skill) {
  const table = TABLES[skill];
  if (!table) throw new Error(`Kỹ năng không hợp lệ: ${skill}`);
  const value = Math.min(100, Math.max(0, Math.round(raw)));
  const row = table.find(([from, to]) => value >= from && value <= to) ?? table[table.length - 1];
  return { low: row[2], high: row[3] };
}

/**
 * Điểm ĐẠI DIỆN cho một số câu đúng: nội suy giữa tâm của các mốc trong bảng.
 *
 * Không lấy thẳng hai đầu khoảng của mốc: làm vậy thì 95 câu đúng (đầu trên của mốc 91–95) ra 495
 * còn 96 câu (đầu dưới của mốc 96–100) chỉ ra 475 — càng đúng nhiều càng ít điểm, vô lý.
 * Nội suy theo tâm thì đường cong luôn tăng.
 *
 * @param {number} raw - số câu đúng trên thang 100
 * @param {string} skill
 * @returns {number} bội số của 5
 */
export function sectionScore(raw, skill) {
  const table = TABLES[skill];
  if (!table) throw new Error(`Kỹ năng không hợp lệ: ${skill}`);
  const anchors = [
    // Hai đầu neo vào giá trị thật: đúng hết thì kịch trần 495, sai hết thì sàn 5.
    { raw: 100, score: table[0][3] },
    { raw: 0, score: table[table.length - 1][2] },
    ...table.map(([from, to, low, high]) => ({ raw: (from + to) / 2, score: (low + high) / 2 })),
  ]
    .filter((a, i, list) => list.findIndex((b) => b.raw === a.raw) === i)
    .sort((a, b) => a.raw - b.raw);

  const value = Math.min(100, Math.max(0, raw));
  if (value <= anchors[0].raw) return round5(clampSection(anchors[0].score));
  const last = anchors[anchors.length - 1];
  if (value >= last.raw) return round5(clampSection(last.score));

  const at = anchors.findIndex((a) => a.raw > value);
  const before = anchors[at - 1];
  const after = anchors[at];
  const ratio = (value - before.raw) / (after.raw - before.raw);
  return round5(clampSection(before.score + ratio * (after.score - before.score)));
}

/**
 * Sai số lấy mẫu khi suy từ `total` câu ra thang 100 câu (đơn vị: câu trên thang 100).
 * Làm càng ít câu thì khoảng càng rộng — 30 câu Part 5 không đủ để nói chắc điểm phần Đọc.
 * @param {number} correct
 * @param {number} total
 * @returns {number}
 */
export function samplingSpread(correct, total) {
  if (total <= 0) return 50;
  const p = Math.min(1, Math.max(0, correct / total));
  return 100 * Math.sqrt((p * (1 - p)) / total);
}

/**
 * Ước lượng điểm một kỹ năng.
 * @param {{correct: number, total: number}} result
 * @param {string} skill - 'listening' | 'reading'
 * @returns {{skill: string, correct: number, total: number, raw: number, point: number, low: number, high: number, projected: boolean}}
 */
export function estimateSection({ correct, total }, skill) {
  const safeTotal = Math.max(0, total);
  const safeCorrect = Math.min(Math.max(0, correct), safeTotal);
  const raw = safeTotal === 0 ? 0 : (safeCorrect / safeTotal) * FULL_QUESTIONS;
  const spread = samplingSpread(safeCorrect, safeTotal);
  return {
    skill,
    correct: safeCorrect,
    total: safeTotal,
    raw: Math.round(raw),
    point: sectionScore(raw, skill),
    low: round5(clampSection(tableBand(raw - spread, skill).low)),
    high: round5(clampSection(tableBand(raw + spread, skill).high)),
    projected: safeTotal < FULL_QUESTIONS,
  };
}

/**
 * Ước lượng điểm cho một bài thi đã chấm.
 *
 * Bài thi thiếu một kỹ năng (chỉ Đọc, riêng Part 5…) thì KHÔNG bịa điểm cho kỹ năng kia: trả về
 * `complete: false` và chỉ có điểm của kỹ năng đã làm. Tổng 10–990 chỉ có khi làm cả hai phần.
 *
 * @param {{bySkill: Record<string, {correct: number, total: number}>}} score - kết quả của scoreExam
 * @returns {{sections: Array<object>, complete: boolean, total: {point: number, low: number, high: number}|null, goalGap: number|null}}
 */
export function estimateScore(score) {
  const sections = ['listening', 'reading']
    .filter((skill) => (score?.bySkill?.[skill]?.total ?? 0) > 0)
    .map((skill) => estimateSection(score.bySkill[skill], skill));

  const complete = sections.length === 2;
  const sum = (key) => sections.reduce((n, section) => n + section[key], 0);
  const total = complete
    ? { point: sum('point'), low: sum('low'), high: sum('high') }
    : null;
  return {
    sections,
    complete,
    total,
    goalGap: total ? GOAL_SCORE - total.point : null,
  };
}

/** "395–445" — cách viết một khoảng điểm. */
export const formatBand = ({ low, high }) => (low === high ? `${low}` : `${low}–${high}`);
