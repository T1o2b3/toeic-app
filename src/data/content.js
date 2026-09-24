/**
 * Tải nội dung đã sinh sẵn từ public/content/ (D10: không gọi AI lúc chạy app).
 * File nằm trong public/ nên được phục vụ ở đường dẫn /content/...
 */

/** Deck nền, bắt buộc phải có. Thiếu nó thì app không chạy được. */
const DEFAULT_DECK = 'toeic-tsl';

/**
 * Deck phụ: thiếu file thì BỎ QUA chứ không làm sập app.
 * `toeic-bsl` là tầng cao cấp (D30), sinh dần bằng pipeline nên có thể chưa tồn tại.
 * Sau này thêm ngsl, daily, my-words vào đây (D04).
 */
const OPTIONAL_DECKS = Object.freeze(['toeic-bsl']);

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
 * Tải một file nội dung KHÔNG bắt buộc: thiếu file, lỗi mạng hay sai định dạng thì trả `empty` thay vì ném lỗi —
 * app vẫn chạy được khi phần đó chưa sinh xong. Năm loại nội dung dưới đây dùng chung khuôn này.
 * @template T
 * @param {string} path
 * @param {(data: any) => T|undefined} pick - lấy phần cần dùng; trả undefined nếu sai định dạng
 * @param {T} empty
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<T>}
 */
async function loadOptional(path, pick, empty, fetchImpl) {
  try {
    const response = await fetchImpl(path);
    if (!response.ok) return empty;
    return pick(await response.json()) ?? empty;
  } catch {
    return empty;
  }
}

/** Cả file nếu có mảng `entries`. */
const withEntries = (data) => (Array.isArray(data?.entries) ? data : undefined);
/** Chỉ mảng `entries`. */
const entriesOf = (data) => (Array.isArray(data?.entries) ? data.entries : undefined);

/**
 * Tải ngân hàng câu hỏi. Thiếu file thì trả về bộ rỗng — app vẫn học từ vựng được khi chưa sinh xong câu hỏi.
 * @param {string} [set]
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{set: string, part: number, entries: object[]}>}
 */
export function loadQuestionBank(set = 'part5', fetchImpl = fetch) {
  return loadOptional(`/content/questions-${set}.json`, withEntries, { set, part: 5, entries: [] }, fetchImpl);
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
async function loadOptionalDeck(deck, fetchImpl = fetch) {
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
export function loadListeningBank(set = 'part2', fetchImpl = fetch) {
  return loadOptional(`/content/listening-${set}.json`, withEntries, { set, part: 2, entries: [] }, fetchImpl);
}

/**
 * Tải một ngân hàng bộ tài liệu + câu hỏi (Part 3, 4, 6, 7). Thiếu file thì trả mảng rỗng — app vẫn chạy
 * được khi phần đó chưa sinh xong. Âm thanh (Part 3/4) chỉ là đường dẫn, tải khi phát.
 * @param {number} part
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<object[]>}
 */
export function loadSetBank(part, fetchImpl = fetch) {
  return loadOptional(`/content/sets-part${part}.json`, entriesOf, [], fetchImpl);
}

/**
 * Tải bộ collocation tuyển chọn (D50b). Thiếu file thì trả danh sách rỗng —
 * màn Collocations tự báo "chưa có nội dung", phần còn lại của app vẫn chạy.
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<object[]>}
 */
export function loadCollocationBank(fetchImpl = fetch) {
  return loadOptional('/content/collocations.json', entriesOf, [], fetchImpl);
}

/**
 * Tải giọng đọc lời dẫn của băng thi thử (D69): lời → đường dẫn MP3. Thiếu file thì trả `{}` — băng vẫn chạy,
 * chỉ không đọc hướng dẫn / câu hỏi (chờ bằng đếm ngược như trước).
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<Record<string, string>>}
 */
export function loadNarration(fetchImpl = fetch) {
  return loadOptional('/content/narration.json', (data) => (data?.clips && typeof data.clips === 'object' ? data.clips : undefined), {}, fetchImpl);
}
