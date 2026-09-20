/**
 * Lớp bọc nhà cung cấp AI (D14): Gemini là chính, đổi sang nhà khác chỉ cần
 * viết thêm một hàm tạo provider có cùng hình dạng { name, model, generate(prompt) }.
 * Mọi lệnh gọi mạng đi qua `fetchImpl` để test tiêm được hàm giả.
 */

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Chờ một khoảng thời gian.
 * @param {number} ms
 */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Tạo provider Gemini.
 * @param {object} options
 * @param {string} options.apiKey
 * @param {string} [options.model] - mặc định gemini-3.5-flash; xem DEFAULT_GEMINI_MODELS
 * @param {typeof fetch} [options.fetchImpl]
 * @param {number} [options.timeoutMs] - bỏ dở request treo quá lâu; mặc định 180 giây
 * @returns {{name: string, model: string, generate: (prompt: string) => Promise<string>}}
 */
export function createGeminiProvider({ apiKey, model = 'gemini-3.5-flash', fetchImpl = fetch, timeoutMs = 180_000 }) {
  if (!apiKey) {
    throw new Error('Thiếu GEMINI_API_KEY trong .env — xem .env.example');
  }

  return {
    name: 'gemini',
    model,
    async generate(prompt) {
      // Không có timeout thì một request treo sẽ làm đứng cả pipeline vô thời hạn.
      let response;
      try {
        response = await fetchImpl(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
        signal: AbortSignal.timeout(timeoutMs),
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
            // Lô lớn cần nhiều token đầu ra; thiếu trần này là kết quả bị cắt giữa chừng.
            maxOutputTokens: 32768,
          },
        }),
        });
      } catch (error) {
        // Treo/đứt mạng là lỗi tạm thời — để withRetry thử lại.
        throw Object.assign(new Error(`Gọi ${model} thất bại: ${error.message}`), { status: 503 });
      }

      if (!response.ok) {
        throw await readApiError(response, model);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
      if (!text) throw new Error('Gemini trả về kết quả rỗng');
      return text;
    },
  };
}

/**
 * Gọi lại khi lỗi tạm thời (hết hạn mức 429, lỗi máy chủ 5xx), lùi thời gian tăng dần.
 * Lỗi do mình (4xx khác) thì ném ngay, gọi lại cũng vô ích.
 * @template T
 * @param {() => Promise<T>} task
 * @param {object} [options]
 * @param {number} [options.retries] - số lần thử lại, mặc định 4
 * @param {number} [options.baseDelayMs] - mặc định 2000
 * @param {(ms: number) => Promise<void>} [options.wait] - tiêm được để test không phải chờ thật
 * @returns {Promise<T>}
 */
export async function withRetry(task, { retries = 4, baseDelayMs = 2000, wait = sleep } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      const status = error?.status;
      // Hết hạn mức NGÀY thì thử lại bao nhiêu lần cũng vẫn hỏng — trả về ngay để bên gọi đổi model.
      // (Trước đây vẫn lùi 2+4+8+16 giây rồi mới báo, phí gần 30 giây mỗi lô.)
      const retriable = !isDailyQuotaError(error) && (status === undefined || status === 429 || status >= 500);
      if (!retriable || attempt === retries) break;
      // API tự nói nên chờ bao lâu thì nghe theo, còn không thì lùi gấp đôi mỗi lần.
      const suggested = error?.retryDelayMs;
      const backoff = baseDelayMs * 2 ** attempt;
      await wait(Math.max(suggested ?? 0, backoff));
    }
  }
  throw lastError;
}

/**
 * Đọc lỗi API thành một Error mang đủ thông tin để quyết định: thử lại, đổi model, hay dừng.
 * Trước đây thông báo lỗi bị cắt ngắn làm mất `quotaId`, khiến pipeline không phân biệt được
 * "hết hạn mức ngày" với "gửi quá nhanh" — đập mãi vào model đã cạn.
 * @param {Response} response
 * @param {string} model
 * @returns {Promise<Error & {status: number, quotaId?: string, retryDelayMs?: number}>}
 */
async function readApiError(response, model) {
  const raw = await response.text().catch(() => '');
  let parsed;
  try {
    parsed = JSON.parse(raw)?.error;
  } catch {
    parsed = undefined;
  }

  const details = parsed?.details ?? [];
  const quota = details.find((d) => d['@type']?.includes('QuotaFailure'))?.violations?.[0];
  const retryInfo = details.find((d) => d['@type']?.includes('RetryInfo'))?.retryDelay;
  const seconds = typeof retryInfo === 'string' ? Number.parseFloat(retryInfo) : NaN;

  const summary = parsed?.message?.split('\n')[0] ?? raw.slice(0, 200);
  const error = new Error(`${model} trả về HTTP ${response.status}: ${summary}`);
  error.status = response.status;
  if (quota?.quotaId) error.quotaId = quota.quotaId;
  if (quota?.quotaValue) error.quotaValue = quota.quotaValue;
  if (Number.isFinite(seconds)) error.retryDelayMs = Math.ceil(seconds * 1000);
  return error;
}

/**
 * Model mặc định, thử theo thứ tự. Free tier tính hạn mức RIÊNG cho từng model
 * và rất nhỏ (20 request/ngày với model đầu bảng), nên hết model này thì chuyển model khác.
 * Đổi danh sách bằng biến môi trường GEMINI_MODELS (ngăn cách bằng dấu phẩy).
 */
export const DEFAULT_GEMINI_MODELS = Object.freeze([
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
]);

/**
 * Phân biệt "hết hạn mức NGÀY" (phải đợi sang ngày mới hoặc đổi model)
 * với "gửi quá nhanh" (chỉ cần chờ vài giây rồi thử lại).
 * @param {unknown} error
 * @returns {boolean}
 */
export function isDailyQuotaError(error) {
  if (error?.status !== 429) return false;
  if (error.quotaId) return /PerDay/i.test(error.quotaId);
  return /PerDay|per day/i.test(String(error.message ?? ''));
}
