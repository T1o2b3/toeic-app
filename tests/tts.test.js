import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  VOICES, MIN_AUDIO_BYTES, audioPath, voicesFor, edgeTtsArgs, synthesize, runLimited,
  renderClips, EDGE_TTS_MISSING,
} from '../pipeline/lib/tts.js';

describe('audioPath', () => {
  it('cùng nội dung + cùng giọng thì cùng tên file; khớp mẫu của schema', () => {
    const a = audioPath('Where is the memo?', VOICES[0]);
    expect(a).toBe(audioPath('Where is the memo?', VOICES[0]));
    expect(a).toMatch(/^audio\/[0-9a-f]{16}\.mp3$/);
  });

  it('đổi lời hoặc đổi giọng thì ra file mới (không đè file cũ, D16)', () => {
    const base = audioPath('Where is the memo?', VOICES[0]);
    expect(audioPath('Where is the memo', VOICES[0])).not.toBe(base);
    expect(audioPath('Where is the memo?', VOICES[1])).not.toBe(base);
  });

  it('không nhập nhằng giữa giọng và lời (ranh giới được phân tách)', () => {
    expect(audioPath('b', 'a\n')).not.toBe(audioPath('\nb', 'a'));
  });
});

describe('voicesFor', () => {
  it('người hỏi và người đáp luôn khác giọng', () => {
    for (let i = 0; i < 50; i += 1) {
      const v = voicesFor(i);
      expect(v.question).not.toBe(v.responses);
      expect(VOICES).toContain(v.question);
      expect(VOICES).toContain(v.responses);
    }
  });

  it('xoay vòng qua mọi giọng, và có cả giọng Mỹ, Anh, Úc', () => {
    const used = new Set(Array.from({ length: VOICES.length }, (_, i) => voicesFor(i).question));
    expect(used.size).toBe(VOICES.length);
    for (const region of ['en-US', 'en-GB', 'en-AU']) expect(VOICES.some((v) => v.startsWith(region))).toBe(true);
  });
});

describe('edgeTtsArgs', () => {
  it('nội dung bắt đầu bằng dấu gạch không bị hiểu thành cờ', () => {
    const args = edgeTtsArgs('--help me', 'en-US-GuyNeural', '/tmp/x.mp3');
    expect(args).toEqual(['--voice=en-US-GuyNeural', '--text=--help me', '--write-media=/tmp/x.mp3']);
  });
});

describe('synthesize', () => {
  let dir;
  const big = Buffer.alloc(MIN_AUDIO_BYTES + 10, 1);
  const noSleep = async () => {};
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'tts-')); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const input = (name = 'a.mp3') => ({ text: 'Hello there', voice: VOICES[0], outFile: join(dir, name), command: 'edge-tts' });

  it('file đã có thì KHÔNG gọi lại dịch vụ', async () => {
    const file = join(dir, 'a.mp3');
    writeFileSync(file, big);
    const runner = vi.fn();
    expect(await synthesize(input(), { runner, sleep: noSleep })).toBe('exists');
    expect(runner).not.toHaveBeenCalled();
  });

  it('chưa có thì gọi dịch vụ và tạo file', async () => {
    const runner = vi.fn(async (_c, args) => writeFileSync(args[2].replace('--write-media=', ''), big));
    expect(await synthesize(input(), { runner, sleep: noSleep })).toBe('created');
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('lỗi tạm thời thì thử lại rồi thành công', async () => {
    let calls = 0;
    const runner = vi.fn(async (_c, args) => {
      calls += 1;
      if (calls < 3) throw new Error('503');
      writeFileSync(args[2].replace('--write-media=', ''), big);
    });
    expect(await synthesize(input(), { runner, sleep: noSleep })).toBe('created');
    expect(calls).toBe(3);
  });

  it('file rỗng/quá nhỏ bị coi là hỏng: xoá đi và báo lỗi (không để lại file rác)', async () => {
    const runner = vi.fn(async (_c, args) => writeFileSync(args[2].replace('--write-media=', ''), Buffer.alloc(10)));
    await expect(synthesize(input(), { runner, sleep: noSleep, retries: 1 })).rejects.toThrow(/Không sinh được/);
    expect(existsSync(join(dir, 'a.mp3'))).toBe(false);
  });

  it('file cũ quá nhỏ (lần trước hỏng) được sinh lại chứ không tin là đã có', async () => {
    writeFileSync(join(dir, 'a.mp3'), Buffer.alloc(10));
    const runner = vi.fn(async (_c, args) => writeFileSync(args[2].replace('--write-media=', ''), big));
    expect(await synthesize(input(), { runner, sleep: noSleep })).toBe('created');
  });
});

describe('runLimited', () => {
  it('không bao giờ chạy quá số luồng cho phép và làm hết việc', async () => {
    let running = 0; let peak = 0; const done = [];
    await runLimited([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running += 1; peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running -= 1; done.push(n);
    });
    expect(peak).toBeLessThanOrEqual(3);
    expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('renderClips', () => {
  const clips = (n) => Array.from({ length: n }, (_, i) => ({ text: `Câu ${i}`, voice: VOICES[0], path: `audio/${i}.mp3` }));
  const silent = () => ({ log: vi.fn(), error: vi.fn() });
  const base = { publicDir: '/tmp/pub/', command: '/bin/edge-tts', exists: () => true };

  it('đếm riêng đoạn mới sinh và đoạn đã có sẵn (chạy lại không sinh lại)', async () => {
    const make = vi.fn(async ({ outFile }) => (outFile.endsWith('0.mp3') ? 'exists' : 'created'));
    const counts = await renderClips(clips(3), { ...base, label: '3 câu', make, log: silent() });
    expect(counts).toEqual({ created: 2, existed: 1, failed: 0 });
    expect(make).toHaveBeenCalledTimes(3);
    // Đường dẫn ghi ra phải là public/ + path của clip, không phải path trần.
    expect(make.mock.calls[0][0].outFile).toBe('/tmp/pub/audio/0.mp3');
  });

  it('một đoạn lỗi KHÔNG làm hỏng cả lô, nhưng phải đếm vào failed để bên gọi biết mà không ghi file', async () => {
    const make = vi.fn(async ({ text }) => { if (text === 'Câu 1') throw new Error('edge-tts sập'); return 'created'; });
    const log = silent();
    const counts = await renderClips(clips(4), { ...base, label: '4 câu', make, log });
    expect(counts).toEqual({ created: 3, existed: 0, failed: 1 });
    expect(log.error.mock.calls[0][0]).toContain('edge-tts sập');
  });

  it('danh sách rỗng (Part 6/7 không có tiếng): trả về ngay, không đòi edge-tts, không in gì', async () => {
    const log = silent();
    const counts = await renderClips([], { ...base, label: '4 bộ', exists: () => false, log });
    expect(counts).toEqual({ created: 0, existed: 0, failed: 0 });
    expect(log.log).not.toHaveBeenCalled();
  });

  it('chưa cài edge-tts thì báo đúng cách cài, không lặng lẽ bỏ qua', async () => {
    await expect(renderClips(clips(1), { ...base, label: '1 câu', exists: () => false, log: silent() }))
      .rejects.toThrow(EDGE_TTS_MISSING);
  });

  it('giữ giới hạn số luồng (quy tắc số 2: không ép dịch vụ miễn phí)', async () => {
    let running = 0; let peak = 0;
    const make = async () => {
      running += 1; peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running -= 1; return 'created';
    };
    await renderClips(clips(10), { ...base, label: '10 câu', make, concurrency: 3, log: silent() });
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('báo tiến độ giữa chừng cho việc chạy dài (quy tắc số 5)', async () => {
    const log = silent();
    await renderClips(clips(80), { ...base, label: '80 câu', make: async () => 'created', log });
    const lines = log.log.mock.calls.map((c) => String(c[0]));
    expect(lines.filter((l) => l.startsWith('  ...'))).toEqual(['  ...40/80', '  ...80/80']);
    expect(lines.at(-1)).toContain('80 mới, 0 đã có, 0 lỗi');
  });
});
