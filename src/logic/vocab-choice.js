/**
 * Câu trắc nghiệm cho một thẻ từ vựng (D66) — thay cho tự chấm "Quên/Khó/Tốt/Dễ" và "Vẫn nhớ/Quên".
 * Tự chấm dễ tự dối: lật thẻ thấy nghĩa là "à, biết rồi". Phải CHỌN ra nghĩa đúng thì mới biết thật.
 *
 * - Từ: hiện từ tiếng Anh, chọn nghĩa tiếng Việt ngắn. Nghĩa lấy từ trường `vi` sẵn có (đã là bản dịch ngắn,
 *   trung vị 25 ký tự) — không cần sinh thêm bằng AI. Phương án nhiễu: nghĩa của từ CÙNG từ loại, độ khó gần.
 * - Cụm từ: hiện nghĩa tiếng Việt, chọn ĐÚNG cụm; trong các lựa chọn có dạng sai hay mắc ("do a decision") —
 *   thứ cần nhớ của cụm là dạng đúng, còn nghĩa thì thường đoán được.
 *
 * Hàm thuần, không đụng DOM.
 */
import { shuffle } from './shuffle.js';

const LETTERS = ['A', 'B', 'C', 'D'];

/** Rút phương án nhiễu trong số này ứng viên gần độ khó nhất — đủ rộng để mỗi lần hỏi ra bộ khác nhau. */
const NEAR = 30;

/**
 * Nghĩa ngắn làm lựa chọn: bỏ phần trong ngoặc — có chỗ lộ đáp án ("phúc lợi phụ (fringe benefits)").
 * @param {string} vi
 * @returns {string}
 */
export function shortGloss(vi) {
  const raw = String(vi ?? '').trim();
  return raw.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim() || raw;
}

const senses = (vi) => shortGloss(vi).toLowerCase().split(/[,;/]/).map((s) => s.trim()).filter(Boolean);

/** Hai nghĩa có chung một nét nghĩa ("khách hàng" và "khách hàng, người mua") → không được cùng làm lựa chọn. */
function overlaps(a, b) {
  const first = new Set(senses(a));
  return senses(b).some((s) => first.has(s));
}

/**
 * Che cụm trong câu ví dụ để làm gợi ý ngữ cảnh. Không thấy cụm thì trả null — hiện nguyên câu là lộ đáp án.
 * @param {string} sentence
 * @param {string} chunk
 * @returns {string|null}
 */
export function blankOut(sentence, chunk) {
  const at = String(sentence ?? '').toLowerCase().indexOf(String(chunk).toLowerCase());
  if (at < 0) return null;
  return `${sentence.slice(0, at)}______${sentence.slice(at + chunk.length)}`;
}

/** Xếp đúng + sai vào A–D theo thứ tự ngẫu nhiên. */
function assemble(correct, wrongs, random) {
  const texts = shuffle([correct, ...wrongs], random);
  const letters = LETTERS.slice(0, texts.length);
  return { options: Object.fromEntries(letters.map((l, i) => [l, texts[i]])), answer: letters[texts.indexOf(correct)] };
}

/** Lấy `count` mục có chữ không trùng nhau và không chung nét nghĩa với nhau. */
function pickDistinct(list, count, textOf, avoid) {
  const chosen = [];
  for (const item of list) {
    const text = textOf(item);
    if (overlaps(text, avoid) || chosen.some((c) => overlaps(textOf(c), text))) continue;
    chosen.push(item);
    if (chosen.length === count) break;
  }
  return chosen;
}

function wordChoice(entry, pool, random) {
  const blocked = new Set([entry.word, ...(entry.synonyms ?? [])].map((w) => String(w).toLowerCase()));
  const usable = (c) => c.id !== entry.id && !c.isCollocation && c.status !== 'retired' && c.vi
    && !blocked.has(String(c.word).toLowerCase()) && !(c.synonyms ?? []).includes(entry.word);
  const samePos = pool.filter((c) => usable(c) && c.pos?.[0] === entry.pos?.[0]);
  const candidates = samePos.length >= 3 ? samePos : pool.filter(usable);
  // Độ khó gần = cùng bộ từ và hạng tần suất gần nhau (hạng của hai bộ TSL/BSL không so được với nhau).
  const distance = (c) => (c.deck === entry.deck ? 0 : 1e6) + Math.abs((c.rank ?? 0) - (entry.rank ?? 0));
  const near = [...candidates].sort((a, b) => distance(a) - distance(b)).slice(0, NEAR);
  const wrongs = pickDistinct(shuffle(near, random), 3, (c) => shortGloss(c.vi), entry.vi).map((c) => shortGloss(c.vi));
  return { kind: 'word', ...assemble(shortGloss(entry.vi), wrongs, random) };
}

function collocChoice(entry, pool, random) {
  const others = shuffle(pool.filter((c) => c.isCollocation && c.id !== entry.id && c.word !== entry.wrong), random);
  // Cùng nhóm (động từ + danh từ, giới từ…) trước: khác nhóm thì nhìn dạng là loại được ngay.
  others.sort((a, b) => Number(b.pos?.[0] === entry.pos?.[0]) - Number(a.pos?.[0] === entry.pos?.[0]));
  const wrongs = [...(entry.wrong ? [entry.wrong] : []), ...others.map((c) => c.word)].slice(0, 3);
  const example = entry.examples?.[0]?.en ? blankOut(entry.examples[0].en, entry.word) : null;
  return { kind: 'colloc', example, ...assemble(entry.word, wrongs, random) };
}

/**
 * @param {object} entry - thẻ đang hỏi (từ hoặc cụm từ)
 * @param {Array<object>} pool - cả bộ từ + cụm từ, để lấy phương án nhiễu
 * @param {() => number} [random]
 * @returns {{kind: 'word'|'colloc', options: Record<string, string>, answer: string, example?: string|null}}
 */
export function buildChoice(entry, pool, random = Math.random) {
  return entry.isCollocation ? collocChoice(entry, pool, random) : wordChoice(entry, pool, random);
}
