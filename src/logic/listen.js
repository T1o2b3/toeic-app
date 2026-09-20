/**
 * Logic luyện nghe Part 2. Hàm thuần, không đụng DOM hay Audio — phần phát âm thanh nằm ở src/ui/audio-player.js.
 *
 * Bài nghe thật chỉ phát tiếng, KHÔNG in chữ. App làm giống vậy: làm bài chỉ thấy ba nút A/B/C,
 * chữ (transcript) chỉ hiện sau khi đã trả lời.
 */

/** Tốc độ phát. 0.75 để nghe kỹ câu khó; 1.25 để tập quen tốc độ nói nhanh ở phần thi thật. */
export const SPEEDS = Object.freeze([0.75, 1, 1.25]);
export const DEFAULT_SPEED = 1;

/** Khoảng lặng giữa câu hỏi và các câu đáp, giống nhịp bài thi (mili giây). */
export const GAP_AFTER_QUESTION_MS = 900;
export const GAP_BETWEEN_RESPONSES_MS = 600;

/** Số câu nghe mỗi lượt — nghe mỏi nhanh hơn đọc, và mỗi câu ~30 giây gồm cả suy nghĩ. */
export const LISTEN_ROUND_SIZE = 10;

/**
 * Lọc tốc độ đọc từ localStorage về một giá trị hợp lệ (dữ liệu ở đó có thể là rác).
 * @param {unknown} value
 * @returns {number}
 */
export function normalizeSpeed(value) {
  const speed = Number.parseFloat(value);
  return SPEEDS.includes(speed) ? speed : DEFAULT_SPEED;
}

/**
 * Địa chỉ phát của một file âm thanh. Cùng gốc `/` với nội dung JSON (xem src/data/content.js).
 * @param {string} path - vd "audio/0123456789abcdef.mp3"
 * @returns {string}
 */
export function audioUrl(path) {
  return `/${String(path).replace(/^\/+/, '')}`;
}

/**
 * Trình tự phát một câu: câu hỏi → lặng → A → lặng → B → lặng → C.
 * @param {{audio: Record<string, string>}} item
 * @returns {Array<{type: 'clip', key: string, src: string}|{type: 'gap', ms: number}>}
 */
export function clipSequence(item) {
  const steps = [{ type: 'clip', key: 'question', src: audioUrl(item.audio.question) }];
  const keys = ['A', 'B', 'C'];
  keys.forEach((key, index) => {
    steps.push({ type: 'gap', ms: index === 0 ? GAP_AFTER_QUESTION_MS : GAP_BETWEEN_RESPONSES_MS });
    steps.push({ type: 'clip', key, src: audioUrl(item.audio[key]) });
  });
  return steps;
}

/**
 * Nghe xong rồi mới cho chọn: cho chọn ngay thì người học đoán mò thay vì nghe.
 * @param {boolean} heardAll - đã nghe hết một lượt câu hỏi + ba câu đáp chưa
 * @param {string|null} picked - phương án đã chọn
 * @returns {boolean}
 */
export function canAnswer(heardAll, picked) {
  return heardAll && !picked;
}

/**
 * Ước lượng thời gian một lượt (phút), để hiện trên màn chính.
 * @param {number} count - số câu
 * @returns {number}
 */
export function estimateMinutes(count) {
  return Math.max(1, Math.round((count * 30) / 60));
}

/** Khoảng lặng giữa hai lượt nói trong hội thoại (mili giây). */
export const GAP_BETWEEN_TURNS_MS = 450;

/**
 * Trình tự phát một bộ hội thoại / bài nói (Part 3, 4): từng lượt nói xen khoảng lặng ngắn.
 * `key` là vị trí lượt nói trong `script` để màn hình tô sáng đúng dòng đang phát.
 * @param {{audio: {clips: string[]}}} set
 * @returns {Array<{type: 'clip', key: number, src: string}|{type: 'gap', ms: number}>}
 */
export function turnSequence(set) {
  const steps = [];
  set.audio.clips.forEach((path, index) => {
    if (index > 0) steps.push({ type: 'gap', ms: GAP_BETWEEN_TURNS_MS });
    steps.push({ type: 'clip', key: index, src: audioUrl(path) });
  });
  return steps;
}
