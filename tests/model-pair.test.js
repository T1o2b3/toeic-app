import { describe, it, expect, vi } from 'vitest';
import { createModelPair, aiStep, QUOTA_MESSAGE } from '../pipeline/lib/model-pair.js';
import { DEFAULT_GEMINI_MODELS } from '../pipeline/lib/ai-provider.js';

const env = (models) => ({ GEMINI_API_KEY: 'k', ...(models ? { GEMINI_MODELS: models } : {}) });
const makeProvider = ({ model }) => ({ model, generate: async () => 'x' });
const pairOf = (models) => createModelPair({ env: env(models), makeProvider });

/** Lỗi hết hạn mức NGÀY đúng dạng ai-provider dựng ra (quy tắc #3: phân loại theo TRƯỜNG, không theo chuỗi). */
const quotaError = () => Object.assign(new Error('hết hạn mức'), {
  status: 429, quotaId: 'GenerateRequestsPerDayPerProjectPerModel',
});
const noWait = { retries: 0 };
const silent = { log: () => {}, error: () => {} };

describe('createModelPair', () => {
  it('mặc định lấy danh sách model chuẩn, vai sinh đề và kiểm định KHÁC model (D12)', () => {
    const pair = createModelPair({ env: env(), makeProvider });
    expect(pair.models).toEqual([...DEFAULT_GEMINI_MODELS]);
    expect(pair.provider('writer').model).not.toBe(pair.provider('solver').model);
  });

  it('chỉ có một model thì báo lỗi ngay, không chạy rồi mới hỏng', () => {
    expect(() => pairOf('chỉ-một')).toThrow(/ít nhất 2 model/);
  });

  it('đổi model của một vai thì NHẢY QUA model vai kia đang dùng', () => {
    const pair = pairOf('a,b,c,d');
    expect([pair.provider('writer').model, pair.provider('solver').model]).toEqual(['a', 'b']);
    pair.rotate('writer');                       // a cạn → c (không lấy b vì solver đang dùng)
    expect(pair.provider('writer').model).toBe('c');
    pair.rotate('solver');                       // b cạn → nhảy qua c → d
    expect(pair.provider('solver').model).toBe('d');
  });

  it('cạn hết model thì báo exhausted để pipeline dừng và chạy lại ngày mai', () => {
    const pair = pairOf('a,b');
    expect(pair.exhausted()).toBe(false);
    pair.rotate('writer');                       // writer 0 → 2 (nhảy qua 1)
    expect(pair.exhausted()).toBe(true);
    expect(QUOTA_MESSAGE).toContain('ngày mai');
  });

  it('khoá API lấy từ env truyền vào, không đọc lén process.env', () => {
    const seen = [];
    createModelPair({ env: { GEMINI_API_KEY: 'bí-mật', GEMINI_MODELS: 'a,b' }, makeProvider: (c) => { seen.push(c); return { model: c.model }; } })
      .provider('writer');
    expect(seen[0]).toEqual({ apiKey: 'bí-mật', model: 'a' });
  });
});

describe('aiStep', () => {
  const step = (pair, role, run, extra = {}) =>
    aiStep({ pair, role, provider: pair.provider(role), run, log: silent, retry: noWait, ...extra });

  it('chạy được thì trả status ok kèm giá trị đã parse', async () => {
    const pair = pairOf('a,b');
    const result = await step(pair, 'writer', async () => '{"n":1}', { parse: JSON.parse });
    expect(result).toEqual({ status: 'ok', value: { n: 1 } });
  });

  it('hết hạn mức ngày: trả quota VÀ đã tự đổi model, không cần bên gọi nhớ đổi', async () => {
    const pair = pairOf('a,b,c');
    const result = await step(pair, 'writer', async () => { throw quotaError(); });
    expect(result.status).toBe('quota');
    expect(pair.provider('writer').model).toBe('c');
  });

  it('lỗi khác (JSON hỏng) KHÔNG làm đổi model — đổi là phí một model còn hạn mức', async () => {
    const pair = pairOf('a,b,c');
    const result = await step(pair, 'writer', async () => 'không phải JSON', { parse: JSON.parse });
    expect(result.status).toBe('error');
    expect(pair.provider('writer').model).toBe('a');
  });

  it('ghi log đúng vai bằng tiếng Việt', async () => {
    const pair = pairOf('a,b');
    const log = { log: vi.fn(), error: vi.fn() };
    await aiStep({ pair, role: 'solver', provider: pair.provider('solver'), run: async () => { throw quotaError(); }, log, retry: noWait });
    expect(log.log.mock.calls[0][0]).toBe('b hết hạn mức ngày → đổi model kiểm định');

    const pair2 = pairOf('a,b');
    const log2 = { log: vi.fn(), error: vi.fn() };
    await aiStep({ pair: pair2, role: 'writer', provider: pair2.provider('writer'), run: async () => { throw new Error('mạng hỏng'); }, log: log2, retry: noWait });
    expect(log2.error.mock.calls[0][0]).toContain('Sinh đề lỗi: mạng hỏng');
  });
});
