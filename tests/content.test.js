import { describe, it, expect } from 'vitest';
import {
  loadQuestionBank, loadListeningBank, loadSetBank, loadCollocationBank, loadNarration,
} from '../src/data/content.js';

/** fetch giả trả đúng một kết quả cho mọi địa chỉ. */
const respond = (result) => async () => {
  if (result instanceof Error) throw result;
  return result === 404 ? { ok: false, status: 404 } : { ok: true, status: 200, json: async () => result };
};

describe('nội dung không bắt buộc: thiếu hay hỏng thì app vẫn chạy', () => {
  const cases = [
    ['loadQuestionBank', (f) => loadQuestionBank('part5', f), { set: 'part5', part: 5, entries: [] }],
    ['loadListeningBank', (f) => loadListeningBank('part2', f), { set: 'part2', part: 2, entries: [] }],
    ['loadSetBank', (f) => loadSetBank(3, f), []],
    ['loadCollocationBank', (f) => loadCollocationBank(f), []],
    ['loadNarration', (f) => loadNarration(f), {}],
  ];

  it.each(cases)('%s: thiếu file (404), lỗi mạng, sai định dạng → giá trị rỗng, không ném lỗi', async (_, load, empty) => {
    expect(await load(respond(404))).toEqual(empty);
    expect(await load(respond(new Error('offline')))).toEqual(empty);
    expect(await load(respond({ entries: 'không phải mảng', clips: 'không phải object' }))).toEqual(empty);
  });

  it('có dữ liệu thì trả đúng phần cần dùng', async () => {
    const bank = { set: 'part5', part: 5, entries: [{ id: 'p5-1' }] };
    expect(await loadQuestionBank('part5', respond(bank))).toEqual(bank);
    expect(await loadSetBank(3, respond({ entries: [{ id: 'p3-1' }] }))).toEqual([{ id: 'p3-1' }]);
    expect(await loadNarration(respond({ version: 1, clips: { Hi: 'audio/a.mp3' } }))).toEqual({ Hi: 'audio/a.mp3' });
  });
});
