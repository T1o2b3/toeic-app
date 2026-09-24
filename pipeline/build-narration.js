/**
 * Sinh giọng đọc LỜI DẪN của băng thi thử (D69): hướng dẫn đầu Part 2/3/4, câu "Questions 32 through 34 refer to
 * the following conversation." cho mọi vị trí bộ, và từng câu hỏi Part 3/4 — đề thật đọc to câu hỏi rồi cho 8 giây.
 *
 * Chạy (trên máy có edge-tts, KHÔNG cần Gemini):
 *   node pipeline/build-narration.js
 * Chạy lại sau mỗi lần thêm bộ Part 3/4 (câu hỏi mới cần giọng đọc). File đã có thì bỏ qua (quy tắc số 6).
 *
 * Chữ lấy từ `src/logic/exam-directions.js` — ĐÚNG hàm app dùng để tra, nên khoá trong narration.json luôn khớp.
 * Ghi `public/content/narration.json` = { lời: đường dẫn MP3 }. Thiếu file này app vẫn chạy (đếm ngược thay lời đọc).
 */
import { readFileSync, existsSync } from 'node:fs';
import { narrationTexts } from '../src/logic/exam-directions.js';
import { renderClips, audioPath, VOICES, AUDIO_FAILED_MESSAGE } from './lib/tts.js';
import { writeBank } from './lib/validate-deck.js';
import { removeOrphanAudio } from './lib/audio-files.js';
import { projectPath } from './lib/cli.js';

const OUTPUT = projectPath('public/content/narration.json');
/** Người dẫn băng: MỘT giọng Mỹ trung tính cho cả đề, như băng thật. Lấy từ bộ giọng đã kiểm tra tồn tại. */
const NARRATOR = VOICES[0];

/** Bộ Part 3/4 đã phát hành. Thiếu file thì coi như rỗng — vẫn sinh được hướng dẫn và câu giới thiệu. */
function readSets(part) {
  const file = projectPath(`public/content/sets-part${part}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).entries ?? [] : [];
}

async function main() {
  const texts = narrationTexts({ 3: readSets(3), 4: readSets(4) });
  const clips = texts.map((text) => ({ text, voice: NARRATOR, path: audioPath(text, NARRATOR) }));

  const audio = await renderClips(clips, { label: 'lời dẫn băng thi thử' });
  if (audio.failed > 0) { console.error(AUDIO_FAILED_MESSAGE); process.exitCode = 1; return; }

  const bank = { version: 1, voice: NARRATOR, clips: Object.fromEntries(clips.map((c) => [c.text, c.path])) };
  if (!writeBank(OUTPUT, bank, null)) return;
  console.log(`Đã ghi ${clips.length} lời dẫn vào public/content/narration.json`);

  const removed = removeOrphanAudio();
  if (removed.length > 0) console.log(`Đã xoá ${removed.length} file âm thanh không còn được dùng.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
