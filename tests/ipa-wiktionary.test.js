import { describe, it, expect, vi } from 'vitest';
import {
  englishSection, pickIpaFromWikitext, fetchIpaBatch, fetchIpaManyWiktionary, USER_AGENT,
} from '../pipeline/lib/ipa-wiktionary.js';

// Trích từ wikitext thật của Wiktionary (2026-09-19), rút gọn.
const AMEND = `==English==\n\n===Pronunciation===\n* {{IPA|en|/əˈmɛnd/|a=UK,US}}\n\n===Verb===\n# to change\n`;
const SUPERVISOR = `==English==\n===Pronunciation===\n* {{a|UK}} {{IPA|en|/ˈsuːpəˌvaɪzə(ɹ)/|a=UK}}\n* {{a|US}} {{IPA|en|/ˈsupɚˌvaɪzɚ/|a=US}}\n===Noun===\n`;
const DEADLINE = `==English==\n===Pronunciation===\n* {{IPA|en|/ˈdɛdˌlaɪn/}}\n===Noun===\n`;
const ABOLISH = `==English==\n===Pronunciation===\n* {{IPA|en|/əˈbɒl.ɪʃ/|a=UK}}\n* {{IPA|en|/əˈbɑl.ɪʃ/|/əˈbɑl.əʃ/|a=GA}}\n`;
const FRENCH_ONLY = `==French==\n===Pronunciation===\n* {{IPA|fr|/ɛ̃.vwas/}}\n`;
const MIXED = `==French==\n* {{IPA|fr|/a.mɛ̃/}}\n\n==English==\n===Pronunciation===\n* {{IPA|en|/əˈmɛnd/}}\n\n==Spanish==\n* {{IPA|es|/a.men/}}\n`;

describe('englishSection', () => {
  it('không dừng ở tiêu đề con ===Pronunciation===', () => {
    expect(englishSection(AMEND)).toContain('{{IPA|en|/əˈmɛnd/');
  });

  it('dừng ở ngôn ngữ kế tiếp và bỏ ngôn ngữ đứng trước', () => {
    const section = englishSection(MIXED);
    expect(section).toContain('/əˈmɛnd/');
    expect(section).not.toContain('/a.mɛ̃/');
    expect(section).not.toContain('/a.men/');
  });

  it('trang không có mục English cho chuỗi rỗng', () => {
    expect(englishSection(FRENCH_ONLY)).toBe('');
  });
});

describe('pickIpaFromWikitext', () => {
  it('lấy phiên âm trong mẫu IPA', () => {
    expect(pickIpaFromWikitext(AMEND)).toBe('/əˈmɛnd/');
  });

  it('ưu tiên giọng Mỹ dù giọng Anh đứng trước', () => {
    expect(pickIpaFromWikitext(SUPERVISOR)).toBe('/ˈsupɚˌvaɪzɚ/');
  });

  it('nhận GA như giọng Mỹ và chỉ lấy phiên âm đầu tiên trong mẫu', () => {
    expect(pickIpaFromWikitext(ABOLISH)).toBe('/əˈbɑl.ɪʃ/');
  });

  it('mẫu không gắn giọng (dùng chung) được ưu tiên hơn giọng Anh', () => {
    const text = `==English==\n{{IPA|en|/uk/|a=UK}}\n{{IPA|en|/all/}}\n`;
    expect(pickIpaFromWikitext(text)).toBe('/all/');
  });

  it('không có giọng Mỹ, không có mẫu chung → lấy mẫu đầu', () => {
    const text = `==English==\n{{IPA|en|/uk/|a=UK}}\n{{IPA|en|/au/|a=AU}}\n`;
    expect(pickIpaFromWikitext(text)).toBe('/uk/');
  });

  it('bỏ qua IPA của ngôn ngữ khác', () => {
    expect(pickIpaFromWikitext(FRENCH_ONLY)).toBeNull();
    expect(pickIpaFromWikitext(MIXED)).toBe('/əˈmɛnd/');
  });

  it('chịu được đầu vào rác', () => {
    expect(pickIpaFromWikitext('')).toBeNull();
    expect(pickIpaFromWikitext(undefined)).toBeNull();
    expect(pickIpaFromWikitext('==English==\n{{IPA|en|abc}}')).toBeNull();
  });
});

const page = (title, content) => ({ title, revisions: [{ slots: { main: { content } } }] });
const respond = (query) => vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ query }) }));

describe('fetchIpaBatch — phân biệt "không có" với "chưa lấy được" (quy tắc số 4)', () => {
  it('trang có IPA → chuỗi; trang không tồn tại → null', async () => {
    const fetchImpl = respond({ pages: [page('amend', AMEND), { title: 'zzzz', missing: true }] });
    const result = await fetchIpaBatch(['amend', 'zzzz'], { fetchImpl });
    expect(result.get('amend')).toBe('/əˈmɛnd/');
    expect(result.get('zzzz')).toBeNull();
  });

  it('trang có nhưng không có IPA tiếng Anh → null (khỏi tra lại)', async () => {
    const result = await fetchIpaBatch(['invoice'], { fetchImpl: respond({ pages: [page('invoice', FRENCH_ONLY)] }) });
    expect(result.get('invoice')).toBeNull();
  });

  it('lỗi máy chủ 500 → undefined cho cả lô, không thử lại (tra lại ở lần chạy sau)', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 500 }));
    const result = await fetchIpaBatch(['a', 'b'], { fetchImpl });
    expect(result.get('a')).toBeUndefined();
    expect(result.get('b')).toBeUndefined();
  });

  it('mất mạng / hết thời gian → undefined, không ném lỗi', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('timeout'); });
    const result = await fetchIpaBatch(['a'], { fetchImpl });
    expect(result.get('a')).toBeUndefined();
  });

  it('phản hồi hỏng (không có query.pages) → undefined', async () => {
    const result = await fetchIpaBatch(['a'], { fetchImpl: respond({}) });
    expect(result.get('a')).toBeUndefined();
  });

  it('từ vắng mặt trong phản hồi (bị cắt) → undefined chứ KHÔNG phải null', async () => {
    const result = await fetchIpaBatch(['amend', 'deadline'], { fetchImpl: respond({ pages: [page('amend', AMEND)] }) });
    expect(result.get('amend')).toBe('/əˈmɛnd/');
    expect(result.get('deadline')).toBeUndefined();
  });

  it('đi theo chuẩn hoá tên và chuyển hướng', async () => {
    const fetchImpl = respond({
      normalized: [{ from: 'Amend', to: 'amend' }],
      redirects: [{ from: 'amend', to: 'amended' }],
      pages: [page('amended', AMEND)],
    });
    const result = await fetchIpaBatch(['Amend'], { fetchImpl });
    expect(result.get('Amend')).toBe('/əˈmɛnd/');
  });

  it('gửi User-Agent và có timeout (quy tắc số 1)', async () => {
    const fetchImpl = respond({ pages: [] });
    await fetchIpaBatch(['a'], { fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('titles=a');
    expect(init.headers['User-Agent']).toMatch(/toeic-app/);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });
});

describe('bị giới hạn tốc độ (HTTP 429)', () => {
  const tooMany = (retryAfter) => ({ ok: false, status: 429, headers: new Headers(retryAfter ? { 'retry-after': retryAfter } : {}) });
  const good = { ok: true, status: 200, json: async () => ({ query: { pages: [page('amend', AMEND)] } }) };

  it('chờ theo Retry-After rồi thử lại, và lấy được kết quả', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(tooMany('7')).mockResolvedValueOnce(good);
    const sleep = vi.fn(async () => {});
    const result = await fetchIpaBatch(['amend'], { fetchImpl, sleep });
    expect(sleep).toHaveBeenCalledWith(7000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.get('amend')).toBe('/əˈmɛnd/');
  });

  it('không có Retry-After thì chờ mặc định 5s; giá trị quá lớn bị chặn ở 60s', async () => {
    const sleep = vi.fn(async () => {});
    await fetchIpaBatch(['a'], { fetchImpl: vi.fn().mockResolvedValueOnce(tooMany()).mockResolvedValueOnce(good), sleep });
    await fetchIpaBatch(['a'], { fetchImpl: vi.fn().mockResolvedValueOnce(tooMany('9999')).mockResolvedValueOnce(good), sleep });
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([5000, 60000]);
  });

  it('hết lượt thử vẫn bị chặn → undefined (không cache nhầm thành "không có")', async () => {
    const fetchImpl = vi.fn(async () => tooMany('1'));
    const sleep = vi.fn(async () => {});
    const result = await fetchIpaBatch(['amend'], { fetchImpl, sleep, maxRetries: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.get('amend')).toBeUndefined();
  });
});

describe('User-Agent', () => {
  // Fetch giả không kiểm tra header, nên lỗi này lọt qua mọi test khác. Dùng chính Headers của Node
  // (cùng bộ kiểm tra với fetch thật) để bắt ký tự không hợp lệ.
  it('là giá trị header hợp lệ (ASCII) — nếu không fetch ném lỗi và mọi từ báo "lỗi tạm thời"', () => {
    expect(() => new Headers({ 'User-Agent': USER_AGENT })).not.toThrow();
    expect(USER_AGENT).toMatch(/^[\x20-\x7e]+$/);
  });
});

describe('fetchIpaManyWiktionary', () => {
  it('chia lô đúng kích thước và gộp đủ kết quả', async () => {
    const words = Array.from({ length: 45 }, (_, i) => `w${i}`);
    const fetchImpl = vi.fn(async (url) => {
      const titles = new URL(url).searchParams.get('titles').split('|');
      return { ok: true, json: async () => ({ query: { pages: titles.map((t) => page(t, AMEND)) } }) };
    });
    const progress = [];
    const result = await fetchIpaManyWiktionary(words, {
      batchSize: 20, concurrency: 2, delayMs: 0, sleep: async () => {}, fetchImpl, onProgress: (done, total) => progress.push([done, total]),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.size).toBe(45);
    expect([...result.values()].every((v) => v === '/əˈmɛnd/')).toBe(true);
    expect(progress.at(-1)).toEqual([45, 45]);
  });

  it('danh sách rỗng thì không gọi mạng', async () => {
    const fetchImpl = vi.fn();
    const result = await fetchIpaManyWiktionary([], { fetchImpl });
    expect(result.size).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
