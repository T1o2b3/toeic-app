/**
 * Tra cứu từ vựng (D36): tìm bất kỳ từ nào trong deck — kể cả từ CHƯA học — khi đang cần dùng ngay.
 *
 * Khác bộ tìm trong Kho từ vựng (word-library.js): kho lọc theo trạng thái học và chỉ khớp từ/nghĩa;
 * tra cứu xếp hạng theo độ khớp, hiểu dạng chia (raised → raise), tìm cả trong cụm từ, đồng nghĩa và ví dụ,
 * và cho thêm từ tìm được vào danh sách học ngay tại chỗ.
 *
 * Hàm thuần, không đụng DOM.
 */
import { fold } from './word-library.js';
import { baseForms } from './capture.js';
import { LEVELS, payloadForLevel } from './vocab-levels.js';

/** Mức khớp, từ tốt nhất tới yếu nhất. Số càng lớn càng lên đầu. */
export const MATCH = Object.freeze({
  EXACT: 100,        // gõ đúng từ
  FORM: 90,          // gõ dạng chia của từ (raised → raise)
  PREFIX: 80,        // từ bắt đầu bằng chuỗi gõ
  CONTAINS: 60,      // từ chứa chuỗi gõ
  MEANING_START: 50, // nghĩa tiếng Việt bắt đầu bằng chuỗi gõ
  MEANING: 40,       // nghĩa tiếng Việt chứa chuỗi gõ
  PHRASE: 30,        // cụm từ đi kèm / đồng nghĩa / trái nghĩa
  EXAMPLE: 20,       // câu ví dụ, ghi chú
});

/** Nhãn hiện cho người dùng: vì sao từ này xuất hiện trong kết quả. */
export const MATCH_LABEL = Object.freeze({
  [MATCH.EXACT]: 'đúng từ',
  [MATCH.FORM]: 'dạng chia',
  [MATCH.PREFIX]: 'bắt đầu bằng',
  [MATCH.CONTAINS]: 'chứa',
  [MATCH.MEANING_START]: 'khớp nghĩa',
  [MATCH.MEANING]: 'khớp nghĩa',
  [MATCH.PHRASE]: 'trong cụm từ',
  [MATCH.EXAMPLE]: 'trong ví dụ',
});

/**
 * Dựng chỉ mục tìm kiếm MỘT lần (bỏ dấu + hạ chữ hoa sẵn) để mỗi lần gõ phím không phải xử lý lại
 * hàng nghìn chuỗi. Deck ~2400 từ nên dựng chỉ tốn vài chục mili giây.
 * @param {Array<object>} entries
 * @returns {Array<{entry: object, word: string, vi: string, phrase: string, example: string}>}
 */
export function buildSearchIndex(entries) {
  return (entries ?? [])
    .filter((entry) => entry.status !== 'retired')
    .map((entry) => ({
      entry,
      word: fold(entry.word),
      vi: fold(entry.vi),
      phrase: fold([...(entry.collocations ?? []), ...(entry.synonyms ?? []), ...(entry.antonyms ?? [])].join(' | ')),
      example: fold([...(entry.examples ?? []).flatMap((e) => [e.en, e.vi]), entry.note].filter(Boolean).join(' | ')),
    }));
}

/** Điểm khớp của một mục với chuỗi tìm, hoặc 0 nếu không khớp. */
function scoreOf(item, needle, forms) {
  if (item.word === needle) return MATCH.EXACT;
  if (forms.includes(item.word)) return MATCH.FORM;
  if (item.word.startsWith(needle)) return MATCH.PREFIX;
  if (needle.length >= 3 && item.word.includes(needle)) return MATCH.CONTAINS;
  if (item.vi.startsWith(needle)) return MATCH.MEANING_START;
  if (needle.length >= 2 && item.vi.includes(needle)) return MATCH.MEANING;
  if (needle.length >= 3 && item.phrase.includes(needle)) return MATCH.PHRASE;
  if (needle.length >= 4 && item.example.includes(needle)) return MATCH.EXAMPLE;
  return 0;
}

/**
 * Tìm trong deck, kết quả xếp theo độ khớp rồi tới tần suất (rank nhỏ = hay gặp hơn).
 * @param {ReturnType<typeof buildSearchIndex>} index
 * @param {string} query
 * @param {{limit?: number}} [options]
 * @returns {Array<{entry: object, score: number}>}
 */
export function searchWords(index, query, { limit = 30 } = {}) {
  const needle = fold(query);
  if (needle === '') return [];
  const forms = baseForms(needle);

  const hits = [];
  for (const item of index) {
    const score = scoreOf(item, needle, forms);
    if (score > 0) hits.push({ entry: item.entry, score });
  }
  hits.sort((a, b) => b.score - a.score
    || (a.entry.rank ?? Infinity) - (b.entry.rank ?? Infinity)
    || a.entry.word.localeCompare(b.entry.word));
  return hits.slice(0, limit);
}

/**
 * Nút hành động cho một từ tìm được, tuỳ trạng thái học hiện tại.
 *   chưa phân loại → thêm vào danh sách học ("không biết", học từ đầu);
 *   đang "thành thạo" → học lại (Huy vừa tìm nó nghĩa là chưa nắm chắc), hạ xuống "đoán được";
 *   đã đang học → không cần làm gì.
 * @param {object} entry
 * @param {object|undefined} state - trạng thái của từ, undefined nếu chưa có sự kiện
 * @returns {{kind: 'add'|'relearn'|'learning', label: string, event: {type: string, payload: object}|null}}
 */
export function lookupAction(entry, state) {
  if (!state?.triaged) {
    return {
      kind: 'add', label: '＋ Thêm vào danh sách học',
      event: { type: 'vocab.triaged', payload: payloadForLevel(entry.id, LEVELS.UNKNOWN) },
    };
  }
  if (state.known) {
    return {
      kind: 'relearn', label: '↺ Mình quên từ này — học lại',
      event: { type: 'vocab.triaged', payload: payloadForLevel(entry.id, LEVELS.CONTEXT) },
    };
  }
  return { kind: 'learning', label: '✓ Đang trong danh sách học', event: null };
}
