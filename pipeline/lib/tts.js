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
import { projectPath, PUBLIC_DIR } from './cli.js';

/** edge-tts cài trong venv riêng của pipeline (xem EDGE_TTS_MISSING). */
export const EDGE_TTS = projectPath('pipeline/.venv/bin/edge-tts');

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

/** Câu báo khi chưa cài edge-tts. */
export const EDGE_TTS_MISSING = 'Chưa cài edge-tts: python3 -m venv pipeline/.venv && pipeline/.venv/bin/pip install edge-tts';

/**
 * Câu báo khi có đoạn lỗi. Luật đi kèm: **có đoạn lỗi thì KHÔNG ghi file nội dung** — file nội dung mà
 * tham chiếu một MP3 không tồn tại thì app im lặng khi chạm "Nghe", còn pipeline vẫn báo thành công.
 */
export const AUDIO_FAILED_MESSAGE = 'Có đoạn âm thanh lỗi — không ghi file nội dung để khỏi có câu thiếu tiếng. Chạy lại lệnh cũ.';

/**
 * Sinh MP3 cho một danh sách đoạn ĐÃ DỰNG SẴN.
 *
 * `build-listening` (Part 2) và `build-sets` (Part 3/4) chép tay cùng khối này. Hai bên dựng `clips`
 * theo cách khác nhau (`assembleEntry` / `assembleSet`) nên hàm này KHÔNG tự đi dựng — nhận thẳng mảng
 * đã có. Đoạn nào đã có file thì `synthesize` bỏ qua, nên chạy lại là tiếp tục chỗ dở (quy tắc số 6).
 *
 * @param {Array<{text: string, voice: string, path: string}>} clips
 * @param {object} options
 * @param {string} [options.publicDir] - thư mục public/ (đường dẫn của clip tính từ đây); mặc định PUBLIC_DIR
 * @param {string} [options.command] - đường dẫn edge-tts; mặc định EDGE_TTS
 * @param {string} options.label - hiện trong dòng log, vd "58 câu" hoặc "13 bộ"
 * @param {number} [options.concurrency] - số luồng, giới hạn để không ép dịch vụ miễn phí (quy tắc số 2)
 * @param {object} [options.log] - console giả khi test
 * @param {Function} [options.make] - mặc định synthesize (test tiêm bản giả)
 * @param {Function} [options.exists] - mặc định existsSync
 * @returns {Promise<{created: number, existed: number, failed: number}>}
 */
export async function renderClips(clips, {
  publicDir = PUBLIC_DIR, command = EDGE_TTS, label, concurrency = 4, log = console, make = synthesize, exists = existsSync,
}) {
  const counts = { created: 0, existed: 0, failed: 0 };
  if (clips.length === 0) return counts;

  log.log(`\nSinh âm thanh cho ${clips.length} đoạn (${label})...`);
  if (!exists(command)) throw new Error(EDGE_TTS_MISSING);

  await runLimited(clips, concurrency, async (clip) => {
    try {
      const result = await make({ text: clip.text, voice: clip.voice, outFile: `${publicDir}${clip.path}`, command });
      counts[result === 'created' ? 'created' : 'existed'] += 1;
    } catch (error) {
      counts.failed += 1;
      log.error(`  ✗ ${error.message.slice(0, 160)}`);
    }
    // Báo tiến độ giữa chừng: việc này chạy nhiều phút, im lặng thì không biết đang chạy hay treo (quy tắc số 5).
    const done = counts.created + counts.existed + counts.failed;
    if (done % 40 === 0) log.log(`  ...${done}/${clips.length}`);
  });

  log.log(`Âm thanh: ${counts.created} mới, ${counts.existed} đã có, ${counts.failed} lỗi.`);
  return counts;
}
