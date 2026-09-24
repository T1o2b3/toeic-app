/**
 * Cặp model "một sinh đề, một kiểm định" (D12) kèm luật LUÂN PHIÊN khi hết hạn mức ngày.
 *
 * Trước đây cả ba pipeline (Part 5, Part 2, các bộ Part 3/4/6/7) đều chép tay đúng đoạn này: đọc danh sách
 * model, giữ hai chỉ số, bắt lỗi hết hạn mức, nhảy sang model kế, tránh để hai vai trùng một model.
 * Ba bản chép tay nghĩa là sửa một chỗ thì hai chỗ kia lệch — mà đây đúng là chỗ đã từng có lỗi thật
 * (quy tắc bắt buộc #3: cắt ngắn thông báo lỗi làm mất trường `quotaId`, pipeline đập mãi vào model đã cạn).
 *
 * Hạn mức API là tài nguyên KHÔNG hoàn lại, nên luật ở đây phải đúng một lần cho cả ba.
 */
import { createGeminiProvider, withRetry, isDailyQuotaError, DEFAULT_GEMINI_MODELS } from './ai-provider.js';

/** Nhãn tiếng Việt của hai vai, dùng cho mọi dòng log của cả ba pipeline. */
const ROLES = Object.freeze({
  writer: { job: 'sinh đề', title: 'Sinh đề' },
  solver: { job: 'kiểm định', title: 'Kiểm định' },
});

/** Câu báo khi mọi model đã cạn hạn mức ngày. */
export const QUOTA_MESSAGE = '\nHết hạn mức của các model hôm nay. Chạy lại ngày mai để làm tiếp.';

/**
 * @param {object} [options]
 * @param {Record<string, string|undefined>} [options.env] - mặc định process.env (test truyền env giả)
 * @param {(config: object) => object} [options.makeProvider] - mặc định createGeminiProvider
 * @returns {{models: string[], exhausted: () => boolean, provider: (role: string) => object, rotate: (role: string) => void}}
 */
export function createModelPair({ env = process.env, makeProvider = createGeminiProvider } = {}) {
  const models = (env.GEMINI_MODELS ?? DEFAULT_GEMINI_MODELS.join(','))
    .split(',').map((m) => m.trim()).filter(Boolean);
  if (models.length < 2) throw new Error('Cần ít nhất 2 model: một để sinh, một để kiểm định (D12)');

  const at = { writer: 0, solver: 1 };
  const other = (role) => (role === 'writer' ? 'solver' : 'writer');

  return {
    models,
    /** Hết model để dùng: dừng hẳn, chạy lại ngày mai (quy tắc #6 — tiến độ đã lưu trong cache). */
    exhausted: () => at.writer >= models.length || at.solver >= models.length,
    provider(role) {
      return makeProvider({ apiKey: env.GEMINI_API_KEY, model: models[at[role]] });
    },
    /** Đổi model của một vai, nhảy qua model mà vai kia đang dùng (hai vai phải khác model — D12). */
    rotate(role) {
      at[role] += 1;
      if (at[role] === at[other(role)]) at[role] += 1;
    },
  };
}

/**
 * Chạy MỘT lượt gọi AI và phân loại kết quả, để vòng lặp của pipeline chỉ việc đọc `status`.
 *
 * `status`:
 *   - `'ok'`    → dùng `value`;
 *   - `'quota'` → model này cạn hạn mức NGÀY (hoặc đã bị gỡ — 404), đã tự đổi model, lô này làm lại;
 *   - `'error'` → lỗi khác (mạng, JSON hỏng); mỗi pipeline tự quyết dừng hay bỏ lô.
 *
 * @param {object} config
 * @param {ReturnType<typeof createModelPair>} config.pair
 * @param {string} config.role - 'writer' | 'solver'
 * @param {object} config.provider - lấy từ pair.provider(role); truyền vào để bên gọi còn đọc được .model
 * @param {() => Promise<string>} config.run
 * @param {(text: string) => any} [config.parse] - biến chữ AI trả về thành dữ liệu; lỗi parse tính là 'error'
 * @param {object} [config.retry] - tuỳ chọn cho withRetry (test tiêm `wait` để khỏi chờ thật)
 * @param {object} [config.log] - console giả khi test
 * @returns {Promise<{status: string, value?: any, error?: Error}>}
 */
export async function aiStep({ pair, role, provider, run, parse = (text) => text, retry, log = console }) {
  const label = ROLES[role];
  try {
    return { status: 'ok', value: parse(await withRetry(run, retry)) };
  } catch (error) {
    // Model bị Google gỡ khỏi API (404 — đã xảy ra với gemini-2.5-flash, D19) cũng đổi model như hết hạn mức:
    // một cái tên cũ trong danh sách không được làm đứng cả lần chạy tự động (D71).
    const gone = error?.status === 404;
    if (gone || isDailyQuotaError(error)) {
      log.log(`${provider.model} ${gone ? 'không còn trên API (404)' : 'hết hạn mức ngày'} → đổi model ${label.job}`);
      pair.rotate(role);
      return { status: 'quota', error };
    }
    // Cắt log cho gọn thì được, nhưng KHÔNG dựa vào chuỗi đã cắt để phân loại lỗi (quy tắc bắt buộc #3):
    // việc phân loại đã xong ở isDailyQuotaError phía trên, đọc đúng trường trong JSON lỗi.
    log.error(`${label.title} lỗi: ${error.message.slice(0, 160)}`);
    return { status: 'error', error };
  }
}

/**
 * "2 quá dễ, 1 lệch đáp án" — lý do loại của một lô, cho dòng log của cả ba pipeline.
 * @param {Array<{reason: string}>} rejected
 * @param {string} [none] - chữ khi không loại gì
 * @returns {string}
 */
export function rejectionSummary(rejected, none = 'không loại câu nào') {
  const why = {};
  for (const item of rejected) why[item.reason] = (why[item.reason] ?? 0) + 1;
  return Object.entries(why).map(([reason, count]) => `${count} ${reason}`).join(', ') || none;
}
