/**
 * Chuẩn hoá dữ liệu AI trả về thành một mục từ vựng đúng schema.
 * Toàn bộ là hàm thuần (không gọi mạng, không đọc file) để test được.
 */
import { makeVocabId } from './tsl.js';

const ALLOWED_POS = new Set([
  'noun', 'verb', 'adjective', 'adverb', 'preposition',
  'conjunction', 'pronoun', 'determiner', 'interjection', 'phrase',
]);

/** Ánh xạ vài cách viết tắt AI hay dùng về đúng tên loại từ trong schema. */
const POS_ALIASES = {
  n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb',
  prep: 'preposition', conj: 'conjunction', pron: 'pronoun', det: 'determiner',
};

/**
 * Cắt bớt mảng chuỗi: bỏ rỗng, bỏ trùng, giới hạn số phần tử.
 * @param {unknown} value
 * @param {number} max
 * @returns {string[]}
 */
function cleanList(value, max) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const text = item.trim();
    if (!text) continue;
    if (out.some((existing) => existing.toLowerCase() === text.toLowerCase())) continue;
    out.push(text);
    if (out.length === max) break;
  }
  return out;
}

/**
 * Chuẩn hoá danh sách loại từ AI trả về.
 * @param {unknown} value
 * @returns {string[]} ít nhất 1 phần tử; không nhận ra được thì trả ['phrase']
 */
export function normalizePos(value) {
  const raw = Array.isArray(value) ? value : [value];
  const out = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const key = item.trim().toLowerCase().replace(/\.$/, '');
    const pos = ALLOWED_POS.has(key) ? key : POS_ALIASES[key];
    if (pos && !out.includes(pos)) out.push(pos);
  }
  return out.length > 0 ? out : ['phrase'];
}

/**
 * Chuẩn hoá danh sách ví dụ; bỏ ví dụ thiếu một trong hai vế.
 * @param {unknown} value
 * @returns {Array<{en: string, vi: string}>} tối đa 3
 */
export function normalizeExamples(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    const en = typeof item?.en === 'string' ? item.en.trim() : '';
    const vi = typeof item?.vi === 'string' ? item.vi.trim() : '';
    if (!en || !vi) continue;
    out.push({ en, vi });
    if (out.length === 3) break;
  }
  return out;
}

/**
 * Dựng một mục từ vựng hoàn chỉnh từ dữ liệu AI + thông tin danh sách gốc.
 * Ném lỗi nếu thiếu dữ liệu bắt buộc — pipeline sẽ bỏ từ đó và thử lại lô sau (D16).
 * @param {object} input
 * @param {string} input.word
 * @param {number} input.rank
 * @param {object} input.ai - JSON do AI trả về cho từ này
 * @param {string} [input.ipa]
 * @param {{model: string, promptVersion: string, batch: string, date: string}} input.gen
 * @returns {object} mục từ vựng đúng schemas/vocab.schema.json
 */
export function buildEntry({ word, rank, ai, ipa, gen }) {
  const vi = typeof ai?.vi === 'string' ? ai.vi.trim() : '';
  if (!vi) throw new Error(`"${word}": AI không trả về nghĩa tiếng Việt`);

  const examples = normalizeExamples(ai?.examples);
  if (examples.length === 0) throw new Error(`"${word}": AI không trả về ví dụ hợp lệ`);

  const entry = {
    id: makeVocabId(rank),
    deck: 'toeic-tsl',
    status: 'active',
    word,
    rank,
    pos: normalizePos(ai?.pos),
    vi,
    examples,
    gen: { ...gen },
  };

  if (typeof ipa === 'string' && ipa.trim()) entry.ipa = ipa.trim();
  if (typeof ai?.note === 'string' && ai.note.trim()) entry.note = ai.note.trim();

  const collocations = cleanList(ai?.collocations, 6);
  const synonyms = cleanList(ai?.synonyms, 6);
  const antonyms = cleanList(ai?.antonyms, 6);
  if (collocations.length) entry.collocations = collocations;
  if (synonyms.length) entry.synonyms = synonyms;
  if (antonyms.length) entry.antonyms = antonyms;

  return entry;
}
