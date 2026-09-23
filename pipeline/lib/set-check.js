/**
 * Kiểm tra cấu trúc, đối chiếu kiểm định và lắp ráp các bộ Part 3, 4, 6, 7. Hàm thuần, không gọi mạng.
 */
import { mentionsChoiceLetter, part2Key, isVietnameseOrEmpty } from './prompt-listening.js';
import { SET_TYPES, materialText, configKey } from './prompt-sets.js';
import { audioPath } from './tts.js';

const LETTERS = ['A', 'B', 'C', 'D'];

/** Số câu hợp lệ mỗi dạng bộ — khớp KINDS trong prompt-sets.js. */
const QUESTION_RANGE = { 3: [3, 3], 4: [3, 3], 6: [4, 4], '7-single': [2, 4], '7-double': [5, 5], '7-triple': [5, 5] };
const PASSAGE_COUNT = { 6: 1, '7-single': 1, '7-double': 2, '7-triple': 3 };

/**
 * Câu hỏi có hợp lệ không: đủ 4 phương án khác nhau, đáp án A-D, lời giải tiếng Việt không nhắc chữ cái.
 * @param {unknown} q
 * @returns {boolean}
 */
export function isWellFormedQuestion(q) {
  if (typeof q?.stem !== 'string' || q.stem.trim().length < 4) return false;
  if (!LETTERS.includes(q?.answer)) return false;
  const options = LETTERS.map((k) => q?.options?.[k]);
  if (options.some((o) => typeof o !== 'string' || o.trim() === '')) return false;
  if (new Set(options.map((o) => o.trim().toLowerCase())).size !== 4) return false;
  if (options.some((o) => /^(all of the above|none of the above|both|either)\b/i.test(o.trim()))) return false;
  if (typeof q.explanation !== 'string' || q.explanation.trim().length < 20) return false;
  if (!isVietnameseOrEmpty(q.explanation) || !isVietnameseOrEmpty(q.trap)) return false;
  return !mentionsChoiceLetter(q.explanation) && !mentionsChoiceLetter(q.trap);
}

/**
 * Bộ có hợp lệ về cấu trúc không, theo Part (và dạng với Part 7).
 * @param {number} part
 * @param {string|undefined} variant
 * @param {object} item
 * @returns {boolean}
 */
export function isWellFormedSet(part, variant, item) {
  const key = configKey(part, variant);
  const [min, max] = QUESTION_RANGE[key] ?? [0, 0];
  const questions = item?.questions;
  if (!Array.isArray(questions) || questions.length < min || questions.length > max) return false;
  if (!questions.every(isWellFormedQuestion)) return false;

  if (part === 3 || part === 4) {
    const script = item.script;
    if (!Array.isArray(script) || script.length < (part === 3 ? 4 : 1)) return false;
    if (script.some((t) => typeof t?.speaker !== 'string' || typeof t?.text !== 'string' || t.text.trim().length < 3)) return false;
    const words = script.map((t) => t.text).join(' ').split(/\s+/).length;
    return part === 3 ? words >= 50 && words <= 200 : words >= 60 && words <= 220;
  }

  const passages = item.passages;
  if (!Array.isArray(passages) || passages.length !== PASSAGE_COUNT[key]) return false;
  if (passages.some((p) => typeof p?.text !== 'string' || p.text.trim().split(/\s+/).length < 25)) return false;
  if (part === 6) {
    const text = passages[0].text;
    // Đúng 4 chỗ trống [1]..[4], mỗi chỗ đúng một lần.
    if (![1, 2, 3, 4].every((n) => text.split(`[${n}]`).length === 2)) return false;
  }
  return true;
}

/** Khoá so trùng: cùng tiêu đề và cùng mở đầu tài liệu là trùng. */
export function setKey(item) {
  const head = materialText(item).toLowerCase().replace(/\s+/g, ' ').slice(0, 80);
  return `${String(item?.title ?? '').toLowerCase().trim()}::${head}`;
}

/**
 * Đối chiếu đáp án của người ra đề với người giải độc lập. Bộ chỉ đạt khi MỌI câu đều khớp
 * (một câu lệch nghĩa là tài liệu hoặc câu hỏi có vấn đề, giữ lại bộ đó là giữ lỗi).
 * @param {Array<object>} items
 * @param {Array<{index: number, answers: string[]}>} solved
 * @returns {{agreed: object[], rejected: Array<{item: object, reason: string}>}}
 */
export function crossCheckSets(items, solved) {
  const byIndex = new Map();
  for (const entry of solved ?? []) {
    const answers = Array.isArray(entry?.answers)
      ? entry.answers.map((a) => (typeof a === 'string' ? a.trim().toUpperCase()[0] : null))
      : null;
    if (Number.isInteger(Number(entry?.index)) && answers) byIndex.set(Number(entry.index), answers);
  }
  const agreed = [];
  const rejected = [];
  items.forEach((item, position) => {
    const answers = byIndex.get(position + 1);
    if (!answers || answers.length < item.questions.length) {
      rejected.push({ item, reason: 'không giải được' });
    } else if (item.questions.some((q, i) => answers[i] !== q.answer)) {
      rejected.push({ item, reason: 'lệch đáp án' });
    } else {
      agreed.push(item);
    }
  });
  return { agreed, rejected };
}

/**
 * Đưa đáp án về chữ cái đích, giữ thứ tự tương đối của 3 phương án còn lại.
 * @param {{options: Record<string, string>, answer: string}} q
 * @param {string} target
 */
export function moveOptionTo(q, target) {
  const correct = q.options[q.answer];
  const others = LETTERS.filter((l) => l !== q.answer).map((l) => q.options[l]);
  const options = {};
  let next = 0;
  for (const letter of LETTERS) options[letter] = letter === target ? correct : others[next++];
  return { options, answer: target };
}

// Bộ giọng theo giới tính, dùng riêng cho Part 3/4. KHÔNG dùng VOICES của tts.js (đổi thứ tự đó là đổi giọng Part 2 đã phát hành).
export const MALE_VOICES = Object.freeze(['en-US-GuyNeural', 'en-GB-RyanNeural', 'en-CA-LiamNeural']);
export const FEMALE_VOICES = Object.freeze(['en-US-JennyNeural', 'en-GB-SoniaNeural', 'en-AU-NatashaNeural', 'en-CA-ClaraNeural']);

/**
 * Gán giọng cho từng người nói: nam/nữ theo nhãn (Man/Woman), hai người cùng giới thì khác giọng,
 * và xoay vòng theo thứ tự bộ để người học quen nhiều giọng. Nhãn khác (vd "Speaker") xen kẽ nam/nữ theo bộ.
 * @param {Array<{speaker: string}>} script
 * @param {number} index
 * @returns {Record<string, string>} tên người nói -> giọng
 */
export function voicesForScript(script, index) {
  const speakers = [...new Set(script.map((t) => t.speaker))];
  const used = { male: 0, female: 0 };
  const map = {};
  for (const speaker of speakers) {
    const lower = speaker.toLowerCase();
    const female = lower.includes('woman') || lower.includes('female') || (!lower.includes('man') && index % 2 === 1);
    const pool = female ? FEMALE_VOICES : MALE_VOICES;
    const slot = female ? used.female++ : used.male++;
    map[speaker] = pool[(index + slot) % pool.length];
  }
  return map;
}

/**
 * Dựng bản ghi cuối: cân bằng đáp án (xoay theo số thứ tự câu toàn cục), đánh id câu, gán giọng và đường dẫn âm thanh.
 * @param {object} cached - bản thảo (title, script|passages, questions, gen, verify...)
 * @param {{part: number, index: number, questionOffset: number}} context
 * @returns {{entry: object, clips: Array<{text: string, voice: string, path: string}>}}
 */
export function assembleSet(cached, { part, index, questionOffset }) {
  const questions = cached.questions.map((q, n) => {
    const moved = moveOptionTo(q, LETTERS[(questionOffset + n) % 4]);
    return {
      id: `${cached.id}-${n + 1}`, stem: q.stem.trim(), options: moved.options, answer: moved.answer,
      errorType: SET_TYPES.includes(q.errorType) ? q.errorType : 'detail',
      explanation: q.explanation.trim(), ...(q.trap ? { trap: String(q.trap).trim() } : {}),
    };
  });
  const entry = { ...cached, questions };

  if (part !== 3 && part !== 4) return { entry, clips: [] };
  const voices = voicesForScript(cached.script, index);
  const clips = cached.script.map((turn) => {
    const voice = voices[turn.speaker];
    return { text: turn.text, voice, path: audioPath(turn.text, voice) };
  });
  entry.audio = { clips: clips.map((c) => c.path), voices };
  return { entry, clips };
}

export { part2Key };
