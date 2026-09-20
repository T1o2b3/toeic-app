/**
 * Part 5 dựng theo ĐÚNG đề thật (D39). Hàm thuần, không đụng DOM.
 *
 * Đề thật: Part 5 là 30 câu điền vào chỗ trống, đánh số **101–130**, nằm trong 75 phút của phần Đọc.
 * Muốn còn đủ giờ cho Part 6 (16 câu) và Part 7 (54 câu) thì Part 5 phải xong trong khoảng 10 phút
 * → nhịp mục tiêu **20 giây/câu**. App hiện nhịp này để tập thói quen, không ép buộc.
 *
 * **Tỉ lệ dạng câu.** Đề thật chia xấp xỉ đều ba nhóm — từ loại, từ vựng, ngữ pháp (mỗi nhóm ~10/30 câu,
 * dao động vài câu tuỳ đề). Ngân hàng của app có 12 dạng với số lượng gần bằng nhau, nên lấy ngẫu nhiên
 * thì ~2/3 số câu rơi vào nhóm ngữ pháp — khác hẳn đề thật. `composeRound` lấy theo HẠN MỨC từng nhóm
 * để một lượt luyện có mặt cắt giống một đề thật.
 */
import { rankQuestions } from './quiz.js';
import { shuffle } from './shuffle.js';

/** Đề thật: 30 câu, đánh số 101–130. */
export const PART5_COUNT = 30;
export const PART5_FIRST_NUMBER = 101;

/** Nhịp cần giữ để còn giờ cho Part 6 và Part 7 (giây/câu). */
export const PART5_TARGET_SECONDS = 20;

/**
 * Ba nhóm dạng câu của Part 5 và số câu mục tiêu trong một đề 30 câu.
 * `types` là các `errorType` của ngân hàng câu hỏi thuộc về nhóm đó.
 */
export const PART5_GROUPS = Object.freeze({
  'word-form': Object.freeze({ label: 'Từ loại', share: 10, types: Object.freeze(['word-form', 'participle']) }),
  vocabulary: Object.freeze({ label: 'Từ vựng', share: 10, types: Object.freeze(['vocabulary']) }),
  grammar: Object.freeze({
    label: 'Ngữ pháp',
    share: 10,
    types: Object.freeze([
      'verb-tense', 'subject-verb-agreement', 'pronoun', 'preposition', 'conjunction',
      'relative-clause', 'comparison', 'quantifier', 'infinitive-gerund',
    ]),
  }),
});

export const PART5_GROUP_KEYS = Object.freeze(Object.keys(PART5_GROUPS));

const GROUP_OF_TYPE = new Map(
  PART5_GROUP_KEYS.flatMap((key) => PART5_GROUPS[key].types.map((type) => [type, key])),
);

/**
 * Câu này thuộc nhóm nào của đề thật.
 * @param {string} errorType
 * @returns {string|null} null nếu dạng câu chưa xếp vào nhóm nào
 */
export function groupOf(errorType) {
  return GROUP_OF_TYPE.get(errorType) ?? null;
}

/**
 * Hạn mức số câu mỗi nhóm cho một lượt `size` câu, chia theo tỉ lệ của đề thật.
 * Dùng phép chia "phần dư lớn nhất" để tổng hạn mức LUÔN đúng bằng `size` (làm tròn từng nhóm sẽ lệch).
 * @param {number} [size]
 * @returns {Record<string, number>}
 */
export function blueprintQuotas(size = PART5_COUNT) {
  const totalShare = PART5_GROUP_KEYS.reduce((sum, key) => sum + PART5_GROUPS[key].share, 0);
  const exact = PART5_GROUP_KEYS.map((key) => ({ key, value: (Math.max(0, size) * PART5_GROUPS[key].share) / totalShare }));
  const quotas = {};
  let used = 0;
  for (const item of exact) {
    quotas[item.key] = Math.floor(item.value);
    used += quotas[item.key];
  }
  const byRemainder = [...exact].sort((a, b) => (b.value % 1) - (a.value % 1));
  for (let i = 0; used < size; i += 1, used += 1) quotas[byRemainder[i % byRemainder.length].key] += 1;
  return quotas;
}

/**
 * Lấy `quota` câu từ một danh sách đã xếp theo mức ưu tiên, luân phiên qua các dạng câu
 * để một nhóm không bị dồn hết vào một dạng (vd 10 câu mệnh đề quan hệ).
 * @param {Array<object>} list - đã xếp ưu tiên
 * @param {number} quota
 * @returns {Array<object>}
 */
function takeSpread(list, quota) {
  if (quota <= 0 || list.length === 0) return [];
  const buckets = new Map();
  for (const question of list) {
    if (!buckets.has(question.errorType)) buckets.set(question.errorType, []);
    buckets.get(question.errorType).push(question);
  }
  const queues = [...buckets.values()];
  const out = [];
  for (let depth = 0; out.length < quota; depth += 1) {
    const before = out.length;
    for (const queue of queues) {
      if (out.length >= quota) break;
      if (queue.length > depth) out.push(queue[depth]);
    }
    if (out.length === before) break; // đã vét hết mọi dạng của nhóm
  }
  return out;
}

/**
 * Dựng một lượt Part 5 giống một đề thật: đúng tỉ lệ ba nhóm, các dạng trong nhóm trải đều,
 * rồi xáo thứ tự (đề thật không xếp câu theo dạng).
 *
 * Giữ nguyên mức ưu tiên của `quizQueue`: câu từng làm SAI trước, rồi câu chưa làm, cuối cùng câu đã đúng.
 * Nhóm nào không đủ câu thì bù bằng câu còn lại — thà đủ số câu còn hơn đúng tỉ lệ mà lượt bị ngắn.
 *
 * @param {Array<object>} questions
 * @param {Map<string, object>} states
 * @param {{size?: number, exclude?: Set<string>, random?: () => number}} [options]
 * @returns {Array<object>} tối đa `size` câu, thứ tự đã xáo
 */
export function composeRound(questions, states, { size = PART5_COUNT, exclude, random = Math.random } = {}) {
  const ranked = rankQuestions(questions, states, { exclude });
  const byGroup = new Map(PART5_GROUP_KEYS.map((key) => [key, []]));
  for (const question of ranked) {
    const key = groupOf(question.errorType);
    if (key) byGroup.get(key).push(question);
  }

  const quotas = blueprintQuotas(size);
  const picked = [];
  const taken = new Set();
  for (const key of PART5_GROUP_KEYS) {
    for (const question of takeSpread(byGroup.get(key), quotas[key])) {
      picked.push(question);
      taken.add(question.id);
    }
  }
  for (const question of ranked) {
    if (picked.length >= size) break;
    if (!taken.has(question.id)) { picked.push(question); taken.add(question.id); }
  }
  return shuffle(picked, random).slice(0, size);
}

/**
 * Mặt cắt thật của một lượt: mỗi nhóm bao nhiêu câu. Dùng để hiện cho người học và để test canh tỉ lệ.
 * @param {Array<object>} questions
 * @returns {Record<string, number>}
 */
export function groupBreakdown(questions) {
  const counts = Object.fromEntries(PART5_GROUP_KEYS.map((key) => [key, 0]));
  for (const question of questions ?? []) {
    const key = groupOf(question.errorType);
    if (key) counts[key] += 1;
  }
  return counts;
}

/**
 * Số hiệu câu như trong đề thật (câu thứ 0 của lượt là câu 101).
 * @param {number} index
 * @returns {number}
 */
export function questionNumber(index) {
  return PART5_FIRST_NUMBER + Math.max(0, index);
}

/** Chỗ trống in trong đề thật là một dãy gạch nối dài. */
export const BLANK_TEXT = '-------';
export const BLANK_PATTERN = /-{2,}|_{2,}/;

/**
 * Câu có chỗ trống không. Câu thiếu chỗ trống là câu HỎNG (không điền vào đâu được) — validator chặn.
 * @param {string} stem
 * @returns {boolean}
 */
export function hasBlank(stem) {
  return BLANK_PATTERN.test(String(stem ?? ''));
}

/** Part 6 đánh dấu chỗ trống trong đoạn văn bằng [1], [2]… theo thứ tự câu hỏi của bộ. */
const BLANK_TOKEN = /-{2,}|_{2,}|\[(\d+)\]/g;

/**
 * Tách một đoạn chữ thành các mảnh chữ thường và các CHỖ TRỐNG, để màn hình in chỗ trống đúng kiểu đề thật
 * (dãy gạch nối dài, kèm số câu nếu có). Dùng chung cho câu Part 5, đoạn văn Part 6 và bài thi thử.
 *
 * @param {string} text
 * @param {number[]} [numbers] - số hiệu câu theo thứ tự [1], [2]… của Part 6
 * @returns {Array<{type: 'text'|'blank', text: string, number: number|null}>}
 */
export function splitBlanks(text, numbers = []) {
  const source = String(text ?? '');
  const out = [];
  let cursor = 0;
  for (const match of source.matchAll(BLANK_TOKEN)) {
    if (match.index > cursor) out.push({ type: 'text', text: source.slice(cursor, match.index), number: null });
    const marked = match[1] ? numbers[Number(match[1]) - 1] ?? null : null;
    out.push({ type: 'blank', text: BLANK_TEXT, number: marked });
    cursor = match.index + match[0].length;
  }
  if (cursor < source.length) out.push({ type: 'text', text: source.slice(cursor), number: null });
  return out;
}

/**
 * Đánh giá nhịp làm một câu so với nhịp đề thật.
 * @param {number} seconds
 * @returns {{seconds: number, onPace: boolean, label: string}}
 */
export function pace(seconds) {
  const value = Math.max(0, Math.round(seconds));
  const onPace = value <= PART5_TARGET_SECONDS;
  return {
    seconds: value,
    onPace,
    label: onPace ? `${value} giây · kịp nhịp` : `${value} giây · chậm hơn nhịp ${PART5_TARGET_SECONDS} giây`,
  };
}
