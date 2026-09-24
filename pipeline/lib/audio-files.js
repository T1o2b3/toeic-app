/**
 * Dọn file âm thanh mồ côi. Thư mục public/audio/ dùng CHUNG cho mọi phần nghe (Part 2, 3, 4), nên "mồ côi"
 * nghĩa là không một file nội dung nghe nào tham chiếu — KHÔNG phải "không thuộc phần đang chạy" (lỗi đó suýt
 * xoá âm thanh Part 3/4 mỗi khi chạy lại pipeline Part 2).
 */
import { existsSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';

/**
 * Các file nội dung có tham chiếu âm thanh. Thêm file mới ở đây khi có phần nghe mới — quên là lần chạy pipeline
 * kế tiếp XOÁ SẠCH âm thanh của file đó (vd lời dẫn băng thi thử `narration`, D69).
 */
const AUDIO_CONTENT_FILES = Object.freeze(['listening-part2', 'sets-part3', 'sets-part4', 'narration']);

/**
 * Mọi tên file MP3 đang được tham chiếu.
 * @param {string} publicDir - đường dẫn tuyệt đối tới public/ (kết thúc bằng /)
 * @param {string[]} [files]
 * @returns {Set<string>}
 */
export function usedAudio(publicDir, files = AUDIO_CONTENT_FILES) {
  const used = new Set();
  for (const name of files) {
    const file = `${publicDir}content/${name}.json`;
    if (!existsSync(file)) continue;
    for (const match of readFileSync(file, 'utf8').matchAll(/audio\/([0-9a-f]{16}\.mp3)/g)) used.add(match[1]);
  }
  return used;
}

/**
 * Xoá MP3 không được tham chiếu bởi bất kỳ file nghe nào.
 * @param {string} publicDir
 * @param {string[]} [files]
 * @returns {string[]} tên các file đã xoá
 */
export function removeOrphanAudio(publicDir, files = AUDIO_CONTENT_FILES) {
  const dir = `${publicDir}audio`;
  if (!existsSync(dir)) return [];
  const used = usedAudio(publicDir, files);
  const removed = [];
  for (const file of readdirSync(dir)) {
    if (file.endsWith('.mp3') && !used.has(file)) {
      unlinkSync(`${dir}/${file}`);
      removed.push(file);
    }
  }
  return removed;
}
