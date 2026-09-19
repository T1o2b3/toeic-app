import { describe, it, expect, vi } from 'vitest';
import { createGeminiProvider, withRetry } from '../pipeline/lib/ai-provider.js';
import { pickIpa, fetchIpa } from '../pipeline/lib/ipa.js';

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
    expect(url).toContain('gemini-3.8-flash:generateContent');
    expect(init.headers['x-goog-api-key']).toBe('k-123');
    expect(JSON.parse(init.body).contents[0].parts[0].text).toBe('xin chào');
  });

  it('ném lỗi kèm mã HTTP khi API từ chối', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(fakeResponse({ error: 'quota' }, { ok: false, status: 429 }));
    const provider = createGeminiProvider({ apiKey: 'k', fetchImpl });
    await expect(provider.generate('x')).rejects.toMatchObject({ status: 429 });
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
