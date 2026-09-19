/**
 * Bốn mức "biết từ này đến đâu" khi phân loại, thay cho hai nút biết / chưa biết.
 *
 * Vì sao cần 4 mức: "đã biết" gộp chung hai thứ rất khác nhau — từ đọc hiểu được trong câu,
 * và từ tự viết ra được. Với mục tiêu 850 → 950 thì phần lớn từ nằm ở khoảng giữa đó,
 * gộp lại thành một nút làm mất đúng thông tin cần để xếp lịch ôn.
 *
 * Hàm thuần, không đụng DOM.
 */

/** Giá trị lưu trong nhật ký sự kiện — ĐÃ PHÁT HÀNH, không được đổi tên (D16). */
export const LEVELS = Object.freeze({
  UNKNOWN: 'unknown',    // không biết hoàn toàn
  CONTEXT: 'context',    // có gặp qua, đoán được nghĩa trong ngữ cảnh
  SPELLING: 'spelling',  // hiểu nghĩa, nhưng không nhớ chính tả / không tự dùng được
  FLUENT: 'fluent',      // dùng thành thạo
});

/** Từ yếu nhất đến vững nhất. Thứ tự này quyết định từ nào được học trước. */
export const LEVEL_ORDER = Object.freeze([
  LEVELS.UNKNOWN, LEVELS.CONTEXT, LEVELS.SPELLING, LEVELS.FLUENT,
]);

/** Nhãn hiện trên nút và trong thống kê. */
export const LEVEL_INFO = Object.freeze({
  [LEVELS.UNKNOWN]:  { label: 'Không biết',    hint: 'chưa gặp bao giờ',                key: '1' },
  [LEVELS.CONTEXT]:  { label: 'Đoán được',     hint: 'gặp rồi, đoán nghĩa theo ngữ cảnh', key: '2' },
  [LEVELS.SPELLING]: { label: 'Quên chính tả', hint: 'hiểu nghĩa nhưng không tự viết ra được', key: '3' },
  [LEVELS.FLUENT]:   { label: 'Thành thạo',    hint: 'tự dùng được — bỏ qua từ này',    key: '4' },
});

/**
 * Mức này còn phải đưa vào hàng đợi học không?
 * @param {string} level
 * @returns {boolean}
 */
export function needsStudy(level) {
  return level !== LEVELS.FLUENT;
}

/**
 * Thứ tự học: chưa biết gì thì học trước, đã có nền thì học sau.
 * @param {string} level
 * @returns {number} số càng nhỏ càng được học trước
 */
export function studyPriority(level) {
  const index = LEVEL_ORDER.indexOf(level);
  return index === -1 ? 0 : index;
}

/**
 * Đọc mức ra từ payload của sự kiện `vocab.triaged`.
 *
 * Nhật ký là append-only (ràng buộc #5): mọi sự kiện Huy đã ghi bằng bản app cũ chỉ có
 * `{known: true|false}`, và chúng phải đọc đúng MÃI MÃI. Không được viết script sửa nhật ký cũ.
 *   known: true  -> đã bỏ qua từ đó  -> fluent
 *   known: false -> đưa vào học      -> unknown
 *
 * @param {object} payload
 * @returns {string} một giá trị trong LEVELS
 */
export function levelFromPayload(payload) {
  const level = payload?.level;
  if (LEVEL_ORDER.includes(level)) return level;
  return payload?.known === true ? LEVELS.FLUENT : LEVELS.UNKNOWN;
}

/**
 * Chiều ngược lại: dựng payload cho sự kiện mới.
 *
 * Ghi KÈM `known` là cố ý, không thừa: máy khác (iPhone) có thể còn đang chạy bản app cũ
 * lấy từ bộ nhớ đệm service worker. Bản cũ không hiểu `level`, nhưng đọc `known` thì vẫn
 * xếp từ đúng chỗ. Đồng bộ hai chiều nên sự kiện phải hiểu được ở cả hai bản.
 *
 * @param {string} wordId
 * @param {string} level
 * @returns {{wordId: string, level: string, known: boolean}}
 */
export function payloadForLevel(wordId, level) {
  const safe = LEVEL_ORDER.includes(level) ? level : LEVELS.UNKNOWN;
  return { wordId, level: safe, known: safe === LEVELS.FLUENT };
}

/**
 * Đếm số từ theo từng mức — để Huy thấy hồ sơ từ vựng của mình.
 * @param {Map<string, object>} states
 * @returns {Record<string, number>} luôn đủ 4 khoá, kể cả khi bằng 0
 */
export function countByLevel(states) {
  const counts = Object.fromEntries(LEVEL_ORDER.map((level) => [level, 0]));
  for (const state of states.values()) {
    if (!state.triaged) continue;
    if (counts[state.level] === undefined) continue;
    counts[state.level] += 1;
  }
  return counts;
}
