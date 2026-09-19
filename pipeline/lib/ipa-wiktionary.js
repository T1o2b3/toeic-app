/**
 * Lấy phiên âm IPA từ Wiktionary (D11 đã duyệt nguồn này). Thay cho dictionaryapi.dev vốn hay
 * chết (timeout cả 4/4 lần thử ngày 2026-09-19, chỉ lấy được 35/1243 từ).
 *
 * Khác dictionaryapi.dev ở chỗ tra THEO LÔ: một request hỏi được 20 trang, nên 2400 từ chỉ
 * cần ~120 request thay vì 2400. Đọc wikitext của mục "English" rồi lấy mẫu {{IPA|en|/.../|a=US}}.
 *
 * IPA chỉ là dữ kiện phát âm, không phải văn bản của Wiktionary; vẫn ghi nguồn ở DECISIONS.md/README.
 */

const ENDPOINT = 'https://en.wiktionary.org/w/api.php';

/**
 * Wikimedia yêu cầu User-Agent nhận diện được; không có thì có thể bị chặn.
 * PHẢI là ASCII: header HTTP không nhận ký tự ngoài Latin-1, `fetch` ném TypeError trước khi gửi
 * và lỗi đó bị nuốt thành "lỗi tạm thời" (đã xảy ra: cả 2400 từ báo lỗi mà mạng vẫn tốt).
 */
export const USER_AGENT = 'toeic-app-personal/0.1 (personal content pipeline, run manually)';

const US_ACCENT = /\b(US|GA|GenAm)\b/;

/**
 * Cắt riêng mục tiếng Anh: trang Wiktionary chứa nhiều ngôn ngữ, "IPA" của tiếng khác
 * (vd tiếng Pháp) sẽ sai. Mục con `===Pronunciation===` bắt đầu bằng `\n===` nên chỉ dừng ở
 * tiêu đề CẤP 2 (`\n==X`, không phải `\n===`).
 * @param {string} wikitext
 * @returns {string} rỗng nếu trang không có mục English
 */
export function englishSection(wikitext) {
  const start = wikitext.indexOf('==English==');
  if (start === -1) return '';
  const body = wikitext.slice(start + '==English=='.length);
  return body.split(/\n==[^=]/)[0];
}

/**
 * Chọn phiên âm tốt nhất trong wikitext của một trang.
 * Ưu tiên: mẫu gắn giọng Mỹ (a=US / GA / GenAm) → mẫu không gắn giọng (dùng chung mọi giọng)
 * → mẫu đầu tiên còn lại. Chỉ lấy phiên âm đầu tiên trong mẫu (dạng /…/), bỏ biến thể phụ.
 *
 * @param {string} wikitext
 * @returns {string|null} vd "/əˈmɛnd/"; null nếu không có
 */
export function pickIpaFromWikitext(wikitext) {
  const candidates = [];
  for (const match of englishSection(String(wikitext ?? '')).matchAll(/\{\{IPA\|en\|([^}]*)\}\}/g)) {
    const params = match[1].split('|').map((p) => p.trim());
    const ipa = params.find((p) => /^\/.+\/$/.test(p));
    if (!ipa) continue;
    const accent = params.find((p) => p.startsWith('a='))?.slice(2) ?? '';
    candidates.push({ ipa, accent });
  }
  const best = candidates.find((c) => US_ACCENT.test(c.accent))
    ?? candidates.find((c) => c.accent === '')
    ?? candidates[0];
  return best?.ipa ?? null;
}

const sleepMs = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Số giây chờ theo header Retry-After (mặc định 5s, tối đa 60s để không treo pipeline). */
function retryDelayMs(response) {
  const seconds = Number.parseInt(response.headers?.get?.('retry-after') ?? '', 10);
  return Math.min(Number.isFinite(seconds) ? seconds : 5, 60) * 1000;
}

/**
 * Tra một lô từ bằng MỘT request. Phân biệt ba kết quả như ipa.js (quy tắc số 4 trong CLAUDE.md):
 * - chuỗi IPA: tìm thấy
 * - `null`: trang không tồn tại hoặc không có IPA tiếng Anh → chắc chắn không có, khỏi tra lại
 * - `undefined`: lỗi tạm thời (mạng, 5xx, hết thời gian, từ không có trong phản hồi) → tra lại lần sau
 *
 * Bị giới hạn tốc độ (HTTP 429) hoặc máy chủ bận (503) thì chờ theo Retry-After rồi thử lại
 * tối đa `maxRetries` lần; hết lượt thử vẫn lỗi → undefined. Không bao giờ ném lỗi: IPA là phần tuỳ chọn.
 * @param {string[]} words
 * @param {{fetchImpl?: typeof fetch, timeoutMs?: number, maxRetries?: number, sleep?: (ms: number) => Promise<void>}} [options]
 * @returns {Promise<Map<string, string|null|undefined>>}
 */
export async function fetchIpaBatch(
  words,
  { fetchImpl = fetch, timeoutMs = 30000, maxRetries = 4, sleep = sleepMs } = {},
) {
  const results = new Map(words.map((word) => [word, undefined]));
  const params = new URLSearchParams({
    action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main',
    format: 'json', formatversion: '2', redirects: '1', titles: words.join('|'),
  });

  let data;
  for (let attempt = 0; ; attempt += 1) {
    try {
      const response = await fetchImpl(`${ENDPOINT}?${params}`, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if ((response.status === 429 || response.status === 503) && attempt < maxRetries) {
        await sleep(retryDelayMs(response));
        continue;
      }
      if (!response.ok) return results;
      data = await response.json();
      break;
    } catch {
      return results;
    }
  }

  const query = data?.query;
  if (!Array.isArray(query?.pages)) return results;

  // Tên yêu cầu có thể bị chuẩn hoá hoặc chuyển hướng: đi theo chuỗi from → to tới tên trang thật.
  const renamed = new Map();
  for (const item of [...(query.normalized ?? []), ...(query.redirects ?? [])]) renamed.set(item.from, item.to);
  const resolve = (word) => {
    let title = word;
    for (let hops = 0; renamed.has(title) && hops < 5; hops += 1) title = renamed.get(title);
    return title;
  };

  const byTitle = new Map(query.pages.map((page) => [page.title, page]));
  for (const word of words) {
    const page = byTitle.get(resolve(word));
    if (!page) continue; // không có trong phản hồi (vd bị cắt do phản hồi quá lớn): giữ undefined
    if (page.missing) results.set(word, null);
    else results.set(word, pickIpaFromWikitext(page.revisions?.[0]?.slots?.main?.content ?? ''));
  }
  return results;
}

/**
 * Tra IPA cho danh sách dài: chia lô, chạy vài lô song song có giới hạn (quy tắc số 2).
 * Mặc định CHỈ 1 luồng và nghỉ giữa các lô: Wikimedia chặn bằng HTTP 429 khi hai deck chạy
 * song song với 3 luồng mỗi deck (đã xảy ra). 120 lô x ~1,5s vẫn chỉ mất vài phút.
 * @param {string[]} words
 * @param {object} [options]
 * @param {number} [options.batchSize] - số từ mỗi request, mặc định 20
 * @param {number} [options.concurrency] - số request song song, mặc định 1
 * @param {number} [options.delayMs] - nghỉ giữa hai lô của cùng một luồng, mặc định 1000
 * @param {(ms: number) => Promise<void>} [options.sleep]
 * @param {(done: number, total: number) => void} [options.onProgress] - gọi sau mỗi lô
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<Map<string, string|null|undefined>>}
 */
export async function fetchIpaManyWiktionary(
  words,
  { batchSize = 20, concurrency = 1, delayMs = 1000, onProgress, fetchImpl = fetch, sleep = sleepMs } = {},
) {
  const batches = [];
  for (let i = 0; i < words.length; i += batchSize) batches.push(words.slice(i, i + batchSize));

  const results = new Map();
  let next = 0;
  let done = 0;

  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next];
      next += 1;
      for (const [word, ipa] of await fetchIpaBatch(batch, { fetchImpl, sleep })) results.set(word, ipa);
      done += batch.length;
      onProgress?.(done, words.length);
      if (next < batches.length) await sleep(delayMs);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, worker));
  return results;
}
