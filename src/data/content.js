/**
 * Tải nội dung đã sinh sẵn từ public/content/ (D10: không gọi AI lúc chạy app).
 * File nằm trong public/ nên được phục vụ ở đường dẫn /content/...
 */

/** Deck mặc định của MVP. Sau này thêm ngsl, daily, my-words (D04). */
export const DEFAULT_DECK = 'toeic-tsl';

/**
 * Tải một deck từ vựng.
 * @param {string} [deck]
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{deck: string, version: number, attribution: object, entries: object[]}>}
 */
export async function loadVocabDeck(deck = DEFAULT_DECK, fetchImpl = fetch) {
  const response = await fetchImpl(`/content/vocab-${deck}.json`);
  if (!response.ok) {
    throw new Error(`Không tải được deck "${deck}" (HTTP ${response.status})`);
  }
  const data = await response.json();
  if (!Array.isArray(data?.entries) || data.entries.length === 0) {
    throw new Error(`Deck "${deck}" rỗng hoặc sai định dạng`);
  }
  return data;
}

/**
 * Tải ngân hàng câu hỏi. Thiếu file thì trả về bộ rỗng thay vì ném lỗi —
 * app vẫn học từ vựng được khi chưa sinh xong câu hỏi.
 * @param {string} [set]
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{set: string, part: number, entries: object[]}>}
 */
export async function loadQuestionBank(set = 'part5', fetchImpl = fetch) {
  try {
    const response = await fetchImpl(`/content/questions-${set}.json`);
    if (!response.ok) return { set, part: 5, entries: [] };
    const data = await response.json();
    return Array.isArray(data?.entries) ? data : { set, part: 5, entries: [] };
  } catch {
    return { set, part: 5, entries: [] };
  }
}
