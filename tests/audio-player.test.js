import { describe, it, expect, vi } from 'vitest';
import { createPlayer } from '../src/ui/audio-player.js';

/** Audio giả: play() xong thì tự bắn ended sau một nhịp, ghi lại mọi lần gán src/tốc độ. */
function fakeAudio() {
  const log = { srcs: [], rates: [], plays: 0, pauses: 0 };
  const audio = {
    onended: null, onerror: null, preservesPitch: false, defaultPlaybackRate: 1, playbackRate: 1,
    set src(value) { log.srcs.push(value); },
    play() { log.plays += 1; log.rates.push(audio.playbackRate); setTimeout(() => audio.onended?.(), 0); return Promise.resolve(); },
    pause() { log.pauses += 1; },
  };
  return { audio, log };
}

const okFetch = () => vi.fn(async (src) => ({ ok: true, status: 200, blob: async () => ({ src }) }));
const make = (over = {}) => {
  const { audio, log } = fakeAudio();
  const fetchImpl = over.fetchImpl ?? okFetch();
  const player = createPlayer({
    makeAudio: () => audio, fetchImpl, toUrl: (blob) => `blob:${blob.src}`, revoke: vi.fn(), wait: async () => {}, ...over,
  });
  return { player, audio, log, fetchImpl };
};

const steps = [
  { type: 'clip', key: 'question', src: '/audio/q.mp3' },
  { type: 'gap', ms: 900 },
  { type: 'clip', key: 'A', src: '/audio/a.mp3' },
];

describe('phát chuỗi', () => {
  it('phát lần lượt từng đoạn từ blob đã tải, báo từng bước, và trả về done', async () => {
    const { player, log } = make();
    const seen = [];
    expect(await player.play(steps, { onStep: (s) => seen.push(s.type === 'gap' ? 'gap' : s.key) })).toBe('done');
    expect(log.srcs).toEqual(['blob:/audio/q.mp3', 'blob:/audio/a.mp3']);
    expect(seen).toEqual(['question', 'gap', 'A']);
  });

  it('dùng MỘT phần tử Audio cho cả chuỗi (giữ được quyền phát trên iPhone)', async () => {
    const made = vi.fn();
    const { audio } = fakeAudio();
    const player = createPlayer({ makeAudio: () => { made(); return audio; }, fetchImpl: okFetch(), toUrl: (b) => `blob:${b.src}`, wait: async () => {} });
    await player.play(steps);
    await player.play(steps);
    expect(made).toHaveBeenCalledTimes(1);
  });

  it('đặt tốc độ sau khi gán nguồn và giữ cao độ', async () => {
    const { player, log, audio } = make();
    await player.play(steps, { rate: 0.75 });
    expect(log.rates).toEqual([0.75, 0.75]);
    expect(audio.preservesPitch).toBe(true);
  });
});

describe('tải trước', () => {
  it('đoạn đã tải trước thì phát không cần tải lại', async () => {
    const { player, fetchImpl } = make();
    await player.preload(['/audio/q.mp3', '/audio/a.mp3']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    await player.play(steps);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gọi preload hai lần cho cùng đoạn chỉ tải một lần', async () => {
    const { player, fetchImpl } = make();
    await Promise.all([player.preload(['/audio/q.mp3']), player.preload(['/audio/q.mp3'])]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('tải hỏng thì phát bằng địa chỉ gốc và lần sau thử tải lại', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('offline'); });
    const { player, log } = make({ fetchImpl });
    await player.preload(['/audio/q.mp3']);
    await player.play([steps[0]]);
    expect(log.srcs).toEqual(['/audio/q.mp3']);
    expect(fetchImpl.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('phản hồi lỗi HTTP cũng coi là tải hỏng', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 404 }));
    const { player, log } = make({ fetchImpl });
    await player.play([steps[0]]);
    expect(log.srcs).toEqual(['/audio/q.mp3']);
  });
});

describe('ngắt', () => {
  it('phát chuỗi mới ngắt chuỗi cũ: chuỗi cũ trả về stopped và không phát thêm', async () => {
    const { player, log } = make({ wait: () => new Promise((r) => setTimeout(r, 20)) });
    const first = player.play(steps);
    await new Promise((r) => setTimeout(r, 5));
    const second = player.play([steps[2]]);
    expect(await first).toBe('stopped');
    expect(await second).toBe('done');
    expect(log.srcs.filter((s) => s.includes('a.mp3'))).toHaveLength(1);
  });

  it('stop() dừng giữa chừng và tạm dừng phần tử Audio', async () => {
    const { player, log } = make({ wait: () => new Promise((r) => setTimeout(r, 20)) });
    const running = player.play(steps);
    await new Promise((r) => setTimeout(r, 5));
    player.stop();
    expect(await running).toBe('stopped');
    expect(log.pauses).toBe(1);
  });

  it('lỗi phát âm thanh thì chuỗi báo lỗi', async () => {
    const { audio, player } = make();
    audio.play = () => { setTimeout(() => audio.onerror?.(), 0); return Promise.resolve(); };
    await expect(player.play([steps[0]])).rejects.toThrow(/Không phát được/);
  });
});

describe('dispose', () => {
  it('giải phóng các blob đã tải', async () => {
    const revoke = vi.fn();
    const { player } = make({ revoke });
    await player.preload(['/audio/q.mp3', '/audio/a.mp3']);
    player.dispose();
    expect(revoke).toHaveBeenCalledTimes(2);
  });
});

describe('mở khoá phần tử Audio trong cú chạm (D67)', () => {
  it('unlock phát NGAY (đồng bộ) một tiếng lặng trên chính phần tử sẽ phát bài nghe', async () => {
    const { audio, log } = fakeAudio();
    audio.paused = true;
    const made = vi.fn(() => audio);
    const player = createPlayer({ makeAudio: made, fetchImpl: okFetch(), toUrl: (b) => `blob:${b.src}`, wait: async () => {} });
    player.unlock();
    expect(log.plays).toBe(1);                              // chưa có await nào — còn trong thao tác chạm
    expect(log.srcs[0]).toMatch(/^data:audio\/wav;base64,/);
    await player.play(steps);                               // bài nghe phát trên CÙNG phần tử đã mở khoá
    expect(made).toHaveBeenCalledTimes(1);
    expect(log.srcs.slice(1)).toEqual(['blob:/audio/q.mp3', 'blob:/audio/a.mp3']);
  });

  it('đang phát dở thì unlock không đụng vào — đổi nguồn lúc đó sẽ cắt ngang đoạn đang nghe', () => {
    const { audio, log } = fakeAudio();
    audio.paused = false;
    const player = createPlayer({ makeAudio: () => audio, fetchImpl: okFetch() });
    player.unlock();
    expect(log.plays).toBe(0);
    expect(log.srcs).toEqual([]);
  });

  it('trình duyệt từ chối tiếng lặng cũng không thành lỗi "Uncaught"', async () => {
    const { audio } = fakeAudio();
    audio.paused = true;
    audio.play = () => Promise.reject(new Error('NotAllowedError'));
    const player = createPlayer({ makeAudio: () => audio, fetchImpl: okFetch() });
    expect(() => player.unlock()).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
});

