import { describe, it, expect, vi } from 'vitest';
import { createGeminiProvider, withRetry, isDailyQuotaError, DEFAULT_GEMINI_MODELS } from '../pipeline/lib/ai-provider.js';
import { pickIpa, fetchIpa, fetchIpaMany } from '../pipeline/lib/ipa.js';

/** Giả lập một Response tối thiểu để không cần gọi mạng thật. */
const fakeResponse = (body, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe('createGeminiProvider', () => {
  it('bắt buộc có API key', () => {
    expect(() => createGeminiProvider({ apiKey: '' })).toThrow(/GEMINI_API_KEY/);
  });

  it('gửi prompt kèm key trong header và lấy đúng phần text trả về', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      fakeResponse({ candidates: [{ content: { parts: [{ text: '[{"word":"a"}]' }] } }] }),
    );
    const provider = createGeminiProvider({ apiKey: 'k-123', fetchImpl });
    const text = await provider.generate('xin chào');

    expect(text).toBe('[{"word":"a"}]');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('gemini-3.5-flash:generateContent');
    expect(init.headers['x-goog-api-key']).toBe('k-123');
    expect(JSON.parse(init.body).contents[0].parts[0].text).toBe('xin chào');
  });

  it('giữ nguyên quotaId và retryDelay từ lỗi API (đừng cắt mất)', async () => {
    const body = {
      error: {
        code: 429,
        message: 'You exceeded your current quota...\n* Quota exceeded for metric: ...',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
            violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '20' }],
          },
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '27s' },
        ],
      },
    };
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse(body, { ok: false, status: 429 }));
    const provider = createGeminiProvider({ apiKey: 'k', fetchImpl });
    await expect(provider.generate('x')).rejects.toMatchObject({
      status: 429,
      quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
      quotaValue: '20',
      retryDelayMs: 27000,
    });
  });

  it('lỗi không phải JSON vẫn ném được, không làm sập pipeline', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false, status: 502, text: async () => '<html>Bad Gateway</html>',
    });
    const provider = createGeminiProvider({ apiKey: 'k', fetchImpl });
    await expect(provider.generate('x')).rejects.toMatchObject({ status: 502 });
  });

  it('request treo bị bỏ dở và quy về lỗi tạm thời để thử lại', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' }));
    const provider = createGeminiProvider({ apiKey: 'k', fetchImpl, timeoutMs: 10 });
    await expect(provider.generate('x')).rejects.toMatchObject({ status: 503 });
  });

  it('ném lỗi khi Gemini trả về rỗng', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse({ candidates: [] }));
    const provider = createGeminiProvider({ apiKey: 'k', fetchImpl });
    await expect(provider.generate('x')).rejects.toThrow(/rỗng/);
  });
});

describe('withRetry', () => {
  const wait = vi.fn().mockResolvedValue(undefined);

  it('trả kết quả ngay nếu lần đầu đã thành công', async () => {
    const task = vi.fn().mockResolvedValue('xong');
    expect(await withRetry(task, { wait })).toBe('xong');
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('nghe theo retryDelay do API đề nghị nếu nó dài hơn backoff', async () => {
    const waitFn = vi.fn().mockResolvedValue(undefined);
    const task = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('chậm lại'), { status: 429, retryDelayMs: 30000 }))
      .mockResolvedValue('xong');
    await withRetry(task, { wait: waitFn });
    expect(waitFn).toHaveBeenCalledWith(30000);
  });

  it('thử lại khi bị 429 rồi thành công', async () => {
    const task = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error('quota'), { status: 429 }))
      .mockResolvedValue('xong');
    expect(await withRetry(task, { wait })).toBe('xong');
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('không thử lại khi lỗi do mình (401)', async () => {
    const task = vi.fn().mockRejectedValue(Object.assign(new Error('sai key'), { status: 401 }));
    await expect(withRetry(task, { wait })).rejects.toThrow(/sai key/);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('bỏ cuộc sau khi hết số lần thử', async () => {
    const task = vi.fn().mockRejectedValue(Object.assign(new Error('sập'), { status: 500 }));
    await expect(withRetry(task, { retries: 2, wait })).rejects.toThrow(/sập/);
    expect(task).toHaveBeenCalledTimes(3);
  });
});

describe('IPA', () => {
  it('lấy phonetic ở cấp mục từ', () => {
    expect(pickIpa([{ phonetic: '/ˈklaɪənt/' }])).toBe('/ˈklaɪənt/');
  });

  it('lấy trong mảng phonetics khi cấp trên để trống', () => {
    expect(pickIpa([{ phonetics: [{ text: '' }, { text: '/test/' }] }])).toBe('/test/');
  });

  it('không có thì trả null', () => {
    expect(pickIpa([{ phonetics: [] }])).toBeNull();
    expect(pickIpa({ title: 'No Definitions Found' })).toBeNull();
  });

  it('lỗi mạng trả undefined để pipeline tra lại lần sau', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('mất mạng'));
    expect(await fetchIpa('client', { fetchImpl })).toBeUndefined();
  });

  it('522 (từ điển quá tải) trả undefined, KHÔNG phải null', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 522 });
    expect(await fetchIpa('sincerely', { fetchImpl })).toBeUndefined();
  });

  it('404 (từ điển không có từ này) trả null để khỏi tra lại', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    expect(await fetchIpa('e-book', { fetchImpl })).toBeNull();
  });

  it('200 nhưng mục không kèm phiên âm trả null', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => [{ phonetics: [] }],
    });
    expect(await fetchIpa('refund', { fetchImpl })).toBeNull();
  });
});

describe('isDailyQuotaError', () => {
  it('nhận ra hết hạn mức NGÀY qua quotaId, không phụ thuộc chuỗi thông báo', () => {
    const error = Object.assign(new Error('bất kỳ chữ gì'), {
      status: 429, quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
    });
    expect(isDailyQuotaError(error)).toBe(true);
  });

  it('429 theo PHÚT không bị nhầm thành hết hạn mức ngày', () => {
    const error = Object.assign(new Error('rate limit'), {
      status: 429, quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier',
    });
    expect(isDailyQuotaError(error)).toBe(false);
  });

  it('không có quotaId thì đọc tạm từ thông báo', () => {
    expect(isDailyQuotaError(Object.assign(new Error('quota per day exceeded'), { status: 429 }))).toBe(true);
  });

  it('lỗi khác không phải 429 thì không tính', () => {
    expect(isDailyQuotaError(Object.assign(new Error('x'), { status: 503 }))).toBe(false);
    expect(isDailyQuotaError(undefined)).toBe(false);
  });

  it('danh sách model mặc định không rỗng', () => {
    expect(DEFAULT_GEMINI_MODELS.length).toBeGreaterThan(1);
  });
});

describe('fetchIpaMany', () => {
  const makeFetch = (map) => vi.fn(async (url) => {
    const word = decodeURIComponent(url.split('/').pop());
    const value = map[word];
    if (value === 'treo') throw new Error('timeout');
    if (value === undefined) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => [{ phonetic: value }] };
  });

  it('tra được nhiều từ và giữ đúng kết quả từng từ', async () => {
    const fetchImpl = makeFetch({ client: '/klaɪənt/', invoice: '/ɪnvɔɪs/' });
    const results = await fetchIpaMany(['client', 'invoice', 'khongco'], { fetchImpl, concurrency: 2 });
    expect(results.get('client')).toBe('/klaɪənt/');
    expect(results.get('invoice')).toBe('/ɪnvɔɪs/');
    expect(results.get('khongco')).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('một từ lỗi không kéo theo các từ khác', async () => {
    const fetchImpl = makeFetch({ client: '/klaɪənt/', invoice: 'treo' });
    const results = await fetchIpaMany(['client', 'invoice'], { fetchImpl });
    expect(results.get('client')).toBe('/klaɪənt/');
    expect(results.get('invoice')).toBeUndefined();
  });

  it('không chạy quá số luồng cho phép cùng lúc', async () => {
    let running = 0;
    let peak = 0;
    const fetchImpl = vi.fn(async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running -= 1;
      return { ok: true, status: 200, json: async () => [{ phonetic: '/x/' }] };
    });
    await fetchIpaMany(['a', 'b', 'c', 'd', 'e', 'f'], { fetchImpl, concurrency: 3 });
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('báo tiến độ theo từng từ đã xong', async () => {
    const onProgress = vi.fn();
    await fetchIpaMany(['a', 'b'], { fetchImpl: makeFetch({ a: '/a/', b: '/b/' }), onProgress });
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith(2, 2);
  });

  it('danh sách rỗng không gọi mạng lần nào', async () => {
    const fetchImpl = vi.fn();
    expect((await fetchIpaMany([], { fetchImpl })).size).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
