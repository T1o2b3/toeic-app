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
 * @param {string} [options.model] - mặc định gemini-2.0-flash (free tier)
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {{name: string, model: string, generate: (prompt: string) => Promise<string>}}
 */
export function createGeminiProvider({ apiKey, model = 'gemini-2.0-flash', fetchImpl = fetch }) {
  if (!apiKey) {
    throw new Error('Thiếu GEMINI_API_KEY trong .env — xem .env.example');
  }

  return {
    name: 'gemini',
    model,
    async generate(prompt) {
      const response = await fetchImpl(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
        }),
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        const error = new Error(`Gemini trả về HTTP ${response.status}: ${detail.slice(0, 300)}`);
        error.status = response.status;
        throw error;
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
      const retriable = status === undefined || status === 429 || status >= 500;
      if (!retriable || attempt === retries) break;
      await wait(baseDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}
