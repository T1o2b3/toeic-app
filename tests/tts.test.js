import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  VOICES, MIN_AUDIO_BYTES, audioPath, voicesFor, edgeTtsArgs, synthesize, runLimited,
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
