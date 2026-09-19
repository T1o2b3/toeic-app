/**
 * Lấy phiên âm IPA từ Free Dictionary API (miễn phí, không cần key).
 * D11: AI chỉ dùng dự phòng, nên ở đây không có thì trả về null và để trống.
 */

const DICT_ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en';

/**
 * Lấy chuỗi IPA đầu tiên tìm được trong kết quả API.
 * Tách riêng để test được mà không gọi mạng.
 * @param {unknown} data - JSON do API trả về
 * @returns {string|null}
 */
export function pickIpa(data) {
  if (!Array.isArray(data)) return null;
  for (const entry of data) {
    if (typeof entry?.phonetic === 'string' && entry.phonetic.trim()) {
      return entry.phonetic.trim();
    }
    for (const phonetic of entry?.phonetics ?? []) {
      if (typeof phonetic?.text === 'string' && phonetic.text.trim()) {
        return phonetic.text.trim();
      }
    }
  }
  return null;
}

/**
 * Tra IPA của một từ. Phân biệt ba kết quả để pipeline biết có nên tra lại không:
 * - chuỗi IPA: tìm thấy
 * - `null`: từ điển có từ này nhưng không có IPA (404 hoặc mục không kèm phiên âm) → khỏi tra lại
 * - `undefined`: lỗi tạm thời (mất mạng, 5xx, 522 do máy chủ từ điển quá tải) → nên tra lại lần sau
 *
 * Không bao giờ ném lỗi: IPA là phần tuỳ chọn, không đáng để dừng cả pipeline.
 * @param {string} word
 * @param {{fetchImpl?: typeof fetch, timeoutMs?: number}} [options]
 * @returns {Promise<string|null|undefined>}
 */
export async function fetchIpa(word, { fetchImpl = fetch, timeoutMs = 8000 } = {}) {
  try {
    // Máy chủ từ điển miễn phí hay treo; không có timeout thì cả pipeline đứng theo.
    const response = await fetchImpl(`${DICT_ENDPOINT}/${encodeURIComponent(word)}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404) return null;
    if (!response.ok) return undefined;
    return pickIpa(await response.json());
  } catch {
    return undefined;
  }
}

/**
 * Tra IPA cho nhiều từ cùng lúc. Tra tuần tự 1200 từ qua một API chập chờn mất hàng giờ,
 * nên chạy song song một số luồng có giới hạn (đủ nhanh, không ép máy chủ miễn phí quá tay).
 * @param {string[]} words
 * @param {object} [options]
 * @param {number} [options.concurrency] - số luồng song song, mặc định 8
 * @param {(done: number, total: number) => void} [options.onProgress] - gọi sau mỗi từ
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<Map<string, string|null|undefined>>} từ -> IPA / null / undefined
 */
export async function fetchIpaMany(words, { concurrency = 8, onProgress, fetchImpl = fetch } = {}) {
  const results = new Map();
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < words.length) {
      const word = words[next];
      next += 1;
      results.set(word, await fetchIpa(word, { fetchImpl }));
      done += 1;
      onProgress?.(done, words.length);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, words.length) }, worker));
  return results;
}
