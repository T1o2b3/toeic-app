/**
 * Tải nội dung đã sinh sẵn từ public/content/ (D10: không gọi AI lúc chạy app).
 * File nằm trong public/ nên được phục vụ ở đường dẫn /content/...
 */

/** Deck nền, bắt buộc phải có. Thiếu nó thì app không chạy được. */
export const DEFAULT_DECK = 'toeic-tsl';

/**
 * Deck phụ: thiếu file thì BỎ QUA chứ không làm sập app.
 * `toeic-bsl` là tầng cao cấp (D30), sinh dần bằng pipeline nên có thể chưa tồn tại.
 * Sau này thêm ngsl, daily, my-words vào đây (D04).
 */
export const OPTIONAL_DECKS = Object.freeze(['toeic-bsl']);

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

/**
 * Tải toàn bộ deck từ vựng: deck nền (bắt buộc) + các deck phụ có mặt.
 *
 * Tách file theo deck và tải song song, không gộp thành một file khổng lồ —
 * deck nền đã 1,37 MB, thêm tầng cao cấp vào cùng file thì lần mở đầu quá nặng.
 *
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{primary: object, decks: object[], entries: object[]}>}
 */
export async function loadAllVocabDecks(fetchImpl = fetch) {
  const [primary, ...optional] = await Promise.all([
    loadVocabDeck(DEFAULT_DECK, fetchImpl),
    ...OPTIONAL_DECKS.map((name) => loadOptionalDeck(name, fetchImpl)),
  ]);

  const decks = [primary, ...optional.filter(Boolean)];
  return { primary, decks, entries: decks.flatMap((deck) => deck.entries) };
}

/**
 * Tải một deck phụ. Thiếu file hoặc file hỏng thì trả null — app vẫn học bằng deck nền.
 * @param {string} deck
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<object|null>}
 */
export async function loadOptionalDeck(deck, fetchImpl = fetch) {
  try {
    return await loadVocabDeck(deck, fetchImpl);
  } catch {
    return null;
  }
}

/**
 * Tải bộ câu nghe Part 2. Thiếu file thì trả bộ rỗng — app vẫn chạy được khi chưa sinh xong âm thanh.
 * Mỗi câu chỉ chứa ĐƯỜNG DẪN tới file MP3 (public/audio/); file âm thanh được tải khi phát, không phải lúc mở app.
 * @param {string} [set]
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{set: string, part: number, entries: object[]}>}
 */
export async function loadListeningBank(set = 'part2', fetchImpl = fetch) {
  const empty = { set, part: 2, entries: [] };
  try {
    const response = await fetchImpl(`/content/listening-${set}.json`);
    if (!response.ok) return empty;
    const data = await response.json();
    return Array.isArray(data?.entries) ? data : empty;
  } catch {
    return empty;
  }
}
