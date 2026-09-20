/**
 * Tạo file âm thanh bằng edge-tts (giọng đọc của trình duyệt Edge, miễn phí, không cần key).
 *
 * Ràng buộc #1 (100% miễn phí) thoả, nhưng đây là dịch vụ KHÔNG chính thức của Microsoft:
 * có thể đổi hoặc chặn bất cứ lúc nào. Vì vậy file MP3 đã sinh được commit vào repo (D35) —
 * app không phụ thuộc dịch vụ này lúc chạy, chỉ pipeline mới cần nó.
 *
 * Tên file là hash của (giọng + nội dung): cùng nội dung + cùng giọng thì cùng file, chạy lại
 * pipeline không sinh lại, và đổi giọng hay đổi lời thì ra file mới thay vì đè file cũ (D16).
 */
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Bộ giọng đọc: pha giọng Mỹ / Anh / Úc như bài thi thật. Đã kiểm tra tồn tại bằng `edge-tts --list-voices`.
 * Thứ tự cố định: đổi thứ tự là đổi giọng của mọi câu đã có (và ra file mới).
 */
export const VOICES = Object.freeze([
  'en-US-GuyNeural',      // nam, Mỹ
  'en-GB-SoniaNeural',    // nữ, Anh
  'en-US-JennyNeural',    // nữ, Mỹ
  'en-GB-RyanNeural',     // nam, Anh
  'en-AU-NatashaNeural',  // nữ, Úc
]);

/** Một file MP3 giọng đọc hợp lệ luôn lớn hơn ngưỡng này; nhỏ hơn là lỗi dịch vụ trả file rỗng/hỏng. */
export const MIN_AUDIO_BYTES = 1024;

/**
 * Tên file (đường dẫn công khai) cho một đoạn thoại. Băm JSON.stringify([giọng, lời]) chứ không nối
 * chuỗi, vì nối chuỗi có va chạm thật ("a\n"+"\n"+"b" trùng "a"+"\n"+"\nb").
 * @param {string} text
 * @param {string} voice
 * @returns {string} dạng "audio/0123456789abcdef.mp3"
 */
export function audioPath(text, voice) {
  const hash = createHash('sha1').update(JSON.stringify([voice, text])).digest('hex').slice(0, 16);
  return `audio/${hash}.mp3`;
}

/**
 * Chọn giọng cho câu thứ `index`: người hỏi và người đáp luôn KHÁC giọng, và xoay vòng
 * để người học quen nhiều giọng thay vì chỉ một.
 * @param {number} index
 * @returns {{question: string, responses: string}}
 */
export function voicesFor(index) {
  const n = VOICES.length;
  return { question: VOICES[index % n], responses: VOICES[(index + 2) % n] };
}

/**
 * Tham số dòng lệnh edge-tts. Dùng dạng `--text=...` để nội dung bắt đầu bằng dấu gạch (vd "-5%")
 * không bị hiểu nhầm là một cờ; và truyền mảng tham số (không qua shell) nên không có chuyện chèn lệnh.
 * @param {string} text
 * @param {string} voice
 * @param {string} outFile
 * @returns {string[]}
 */
export function edgeTtsArgs(text, voice, outFile) {
  return [`--voice=${voice}`, `--text=${text}`, `--write-media=${outFile}`];
}

/** Chạy một lệnh, có timeout (quy tắc số 1). */
function run(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: timeoutMs }, (error, stdout, stderr) => {
      if (error) reject(new Error(`${error.message}\n${stderr ?? ''}`.trim()));
      else resolve(stdout);
    });
  });
}

/**
 * Sinh một file âm thanh nếu chưa có. Thử lại vài lần vì dịch vụ đôi khi từ chối.
 * @param {object} input
 * @param {string} input.text
 * @param {string} input.voice
 * @param {string} input.outFile - đường dẫn tuyệt đối
 * @param {string} input.command - đường dẫn tới edge-tts
 * @param {object} [options]
 * @param {(cmd: string, args: string[], timeoutMs: number) => Promise<unknown>} [options.runner] - tiêm để test
 * @param {(ms: number) => Promise<void>} [options.sleep]
 * @param {number} [options.retries]
 * @returns {Promise<'exists'|'created'>}
 */
export async function synthesize(
  { text, voice, outFile, command },
  { runner = run, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), retries = 3 } = {},
) {
  if (existsSync(outFile) && statSync(outFile).size >= MIN_AUDIO_BYTES) return 'exists';
  mkdirSync(dirname(outFile), { recursive: true });

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      await runner(command, edgeTtsArgs(text, voice, outFile), 45_000);
      if (existsSync(outFile) && statSync(outFile).size >= MIN_AUDIO_BYTES) return 'created';
      lastError = new Error('file âm thanh rỗng hoặc quá nhỏ');
    } catch (error) {
      lastError = error;
    }
    // Không để lại file hỏng: lần chạy sau sẽ tưởng đã có.
    if (existsSync(outFile)) unlinkSync(outFile);
    if (attempt < retries) await sleep(1500 * (attempt + 1));
  }
  throw new Error(`Không sinh được âm thanh cho "${text.slice(0, 40)}": ${String(lastError?.message).slice(0, 200)}`);
}

/**
 * Chạy nhiều việc với số luồng giới hạn (quy tắc số 2).
 * @template T
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<void>} task
 * @returns {Promise<void>}
 */
export async function runLimited(items, limit, task) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await task(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
