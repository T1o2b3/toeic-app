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
 * Tra IPA của một từ. Không tìm thấy hoặc lỗi mạng đều trả về null —
 * IPA là phần tuỳ chọn, không đáng để dừng cả pipeline.
 * @param {string} word
 * @param {{fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<string|null>}
 */
export async function fetchIpa(word, { fetchImpl = fetch } = {}) {
  try {
    const response = await fetchImpl(`${DICT_ENDPOINT}/${encodeURIComponent(word)}`);
    if (!response.ok) return null;
    return pickIpa(await response.json());
  } catch {
    return null;
  }
}
