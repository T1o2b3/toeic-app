/**
 * Đọc/ghi tuỳ chọn vào localStorage. Bọc try/catch vì trình duyệt có thể chặn
 * (chế độ riêng tư, hết dung lượng) — mất tuỳ chọn thì dùng mặc định, không được sập app.
 */
import {
  normalizeRoundSize, DEFAULT_ROUND_SIZE,
  normalizeShowMeaning, DEFAULT_SHOW_MEANING,
} from '../logic/prefs.js';

const ROUND_SIZE_KEY = 'toeic-app.quizRoundSize';

/**
 * Số câu mỗi lượt luyện.
 * @returns {number}
 */
export function getRoundSize() {
  try {
    return normalizeRoundSize(localStorage.getItem(ROUND_SIZE_KEY));
  } catch {
    return DEFAULT_ROUND_SIZE;
  }
}

/**
 * Đổi số câu mỗi lượt.
 * @param {number} size
 */
export function setRoundSize(size) {
  try {
    localStorage.setItem(ROUND_SIZE_KEY, String(normalizeRoundSize(size)));
  } catch {
    // Không lưu được thì thôi, lần sau dùng mặc định.
  }
}

const SHOW_MEANING_KEY = 'toeic-app.triageShowMeaning';

/**
 * Có hiện sẵn nghĩa ở màn phân loại không.
 * @returns {boolean}
 */
export function getShowMeaning() {
  try {
    return normalizeShowMeaning(localStorage.getItem(SHOW_MEANING_KEY));
  } catch {
    return DEFAULT_SHOW_MEANING;
  }
}

/**
 * Bật/tắt việc hiện sẵn nghĩa ở màn phân loại.
 * @param {boolean} show
 */
export function setShowMeaning(show) {
  try {
    localStorage.setItem(SHOW_MEANING_KEY, show ? '1' : '0');
  } catch {
    // Không lưu được thì thôi, lần sau dùng mặc định.
  }
}
