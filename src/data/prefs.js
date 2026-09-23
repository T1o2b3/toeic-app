/**
 * Đọc/ghi tuỳ chọn vào localStorage. Bọc try/catch vì trình duyệt có thể chặn
 * (chế độ riêng tư, hết dung lượng) — mất tuỳ chọn thì dùng mặc định, không được sập app.
 */
import {
  normalizeShowMeaning, DEFAULT_SHOW_MEANING,
  normalizeTier, DEFAULT_TIER,
} from '../logic/prefs.js';
import { normalizeSpeed, DEFAULT_SPEED } from '../logic/listen.js';

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

const TIER_KEY = 'toeic-app.vocabTier';

/**
 * Tầng từ vựng đang chọn để phân loại / ôn.
 * @param {string[]} allowed - TIER_ORDER, truyền vào để lớp data không phụ thuộc lớp logic tầng
 * @returns {string}
 */
export function getTier(allowed) {
  try {
    return normalizeTier(localStorage.getItem(TIER_KEY), allowed);
  } catch {
    return DEFAULT_TIER;
  }
}

/**
 * Đổi tầng từ vựng.
 * @param {string} tier
 * @param {string[]} allowed
 */
export function setTier(tier, allowed) {
  try {
    localStorage.setItem(TIER_KEY, normalizeTier(tier, allowed));
  } catch {
    // Không lưu được thì thôi, lần sau dùng mặc định.
  }
}

const LISTEN_SPEED_KEY = 'toeic-app.listenSpeed';

/**
 * Tốc độ phát của bài nghe.
 * @returns {number}
 */
export function getListenSpeed() {
  try {
    return normalizeSpeed(localStorage.getItem(LISTEN_SPEED_KEY));
  } catch {
    return DEFAULT_SPEED;
  }
}

/**
 * Đổi tốc độ phát.
 * @param {number} speed
 */
export function setListenSpeed(speed) {
  try {
    localStorage.setItem(LISTEN_SPEED_KEY, String(normalizeSpeed(speed)));
  } catch {
    // Không lưu được thì thôi, lần sau dùng mặc định.
  }
}
