/**
 * Nghe chép (M11): nghe lại đúng những đoạn thuộc câu nghe mình từng làm sai, gõ lại từng chữ, rồi so theo từ.
 * Nghe sai thường là do không bắt được một hai từ (nối âm, nuốt âm) — chép ra là thấy ngay đó là từ nào.
 *
 * Hàm thuần, không đụng DOM hay Audio.
 */
import { audioUrl } from './listen.js';

/** Số đoạn mỗi lượt — mỗi đoạn ~45 giây gồm nghe lại vài lần và gõ. */
export const DICTATION_ROUND_SIZE = 8;

/** Đoạn dài hơn số từ này không đưa vào chép: một lần nghe không nhớ nổi, thành bài tập trí nhớ chứ không phải nghe. */
export const MAX_WORDS = 30;

const LETTERS = ['A', 'B', 'C'];

/** Chữ thường, nháy cong → thẳng, bỏ dấu câu dính hai đầu. "Steve." → "steve", "director’s" → "director's". */
const normalize = (raw) => raw.toLowerCase().replace(/[‘’]/g, "'").replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

/**
 * Tách thành từ, giữ chữ gốc để hiện lại. Gạch nối tách như khoảng trắng ("heavy-duty" = "heavy duty").
 * ponytail: "3" và "three" tính là khác nhau — thêm bảng số nếu thấy hay bị chấm oan.
 * @param {string} text
 * @returns {Array<{raw: string, word: string}>}
 */
function splitWords(text) {
  return String(text ?? '')
    .split(/[\s–—-]+/)
    .map((raw) => ({ raw, word: normalize(raw) }))
    .filter((token) => token.word);
}

/**
 * So bài chép với chữ gốc theo từ (dãy con chung dài nhất), bỏ qua hoa/thường và dấu câu.
 * Chỗ gõ sai hiện thành cặp: từ đã gõ (extra) ngay trước từ đúng (missing).
 * @param {string} expected
 * @param {string} typed
 * @returns {{parts: Array<{text: string, kind: 'ok'|'missing'|'extra'}>, correct: number, total: number, perfect: boolean}}
 */
export function scoreDictation(expected, typed) {
  const a = splitWords(expected);
  const b = splitWords(typed);
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = độ dài dãy con chung dài nhất của a[i..] và b[j..]
  const lcs = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i][j] = a[i].word === b[j].word ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const parts = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i].word === b[j].word) {
      parts.push({ text: a[i].raw, kind: 'ok' });
      i += 1; j += 1;
    } else if (j < m && (i === n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      parts.push({ text: b[j].raw, kind: 'extra' });
      j += 1;
    } else {
      parts.push({ text: a[i].raw, kind: 'missing' });
      i += 1;
    }
  }
  const correct = lcs[0][0];
  return { parts, correct, total: n, perfect: correct === n && m === n };
}

/**
 * Các đoạn để chép, lấy từ câu nghe TỪNG làm sai (kể cả đã làm lại đúng — đã từng nghe nhầm là đáng chép).
 * Part 2: câu hỏi + ba câu đáp. Part 3/4: từng lượt lời (mỗi lượt là một file âm thanh), trừ lượt quá dài.
 * Câu sai gần đây nhất lên trước; trong một câu giữ đúng thứ tự nghe.
 *
 * Id đoạn = id nội dung + vị trí (`l2-0001:A`, `p3-0001:2`) — vĩnh viễn như id nội dung (ràng buộc #6).
 *
 * @param {object} input
 * @param {Array<object>} input.listening - câu Part 2
 * @param {Record<number, Array<object>>} input.sets - bộ theo Part (dùng Part 3, 4)
 * @param {Map<string, object>} input.quizStates - reduceQuizState
 * @returns {Array<{id: string, src: string, text: string, from: string, label: string}>}
 */
export function dictationUnits({ listening = [], sets = {}, quizStates }) {
  /** Lần sai gần nhất trong các câu này; null nếu chưa sai hoặc có câu bị báo lỗi. */
  const wrongAt = (ids) => {
    let latest = null;
    for (const id of ids) {
      const state = quizStates?.get(id);
      if (state?.reported) return null;
      if (state?.wrong > 0) latest = Math.max(latest ?? 0, state.lastTs);
    }
    return latest;
  };

  const groups = [];
  for (const item of listening) {
    const ts = item.status === 'retired' ? null : wrongAt([item.id]);
    if (ts === null) continue;
    groups.push({ ts, units: [
      { id: `${item.id}:question`, src: audioUrl(item.audio.question), text: item.question, from: item.id, label: 'Part 2 · câu hỏi' },
      ...LETTERS.map((letter) => ({
        id: `${item.id}:${letter}`, src: audioUrl(item.audio[letter]), text: item.responses[letter], from: item.id, label: `Part 2 · câu đáp ${letter}`,
      })),
    ] });
  }
  for (const part of [3, 4]) {
    for (const set of sets[part] ?? []) {
      const ts = set.status === 'retired' ? null : wrongAt(set.questions.map((q) => q.id));
      if (ts === null) continue;
      const units = set.script.flatMap((line, index) => (splitWords(line.text).length > MAX_WORDS ? [] : [{
        id: `${set.id}:${index}`, src: audioUrl(set.audio.clips[index]), text: line.text, from: set.id,
        label: `Part ${part} · lượt ${index + 1} (${line.speaker})`,
      }]));
      groups.push({ ts, units });
    }
  }
  return groups.sort((x, y) => y.ts - x.ts).flatMap((group) => group.units);
}

/**
 * Kết quả chép theo đoạn. Lần chép GẦN NHẤT quyết định đoạn đó còn phải chép nữa không.
 * @param {Array<object>} events
 * @returns {Map<string, {attempts: number, perfect: boolean}>}
 */
export function reduceDictation(events) {
  const states = new Map();
  for (const event of events ?? []) {
    if (event?.type !== 'dictation.checked') continue;
    const unitId = event.payload?.unitId;
    if (typeof unitId !== 'string' || unitId === '') continue;
    const state = states.get(unitId) ?? { attempts: 0, perfect: false };
    state.attempts += 1;
    state.perfect = event.payload.perfect === true;
    states.set(unitId, state);
  }
  return states;
}

const pending = (units, states) => units.filter((unit) => !states.get(unit.id)?.perfect);

/**
 * Hàng đợi một lượt — CỬA SỔ TRƯỢT (xem round.js): đừng lấy `.length` của nó làm số còn lại.
 * @param {Array<{id: string}>} units
 * @param {Map<string, object>} states - reduceDictation
 * @param {{size: number, exclude?: Set<string>}} options - exclude: đoạn đã làm trong lượt này
 */
export function dictationQueue(units, states, { size, exclude = new Set() }) {
  return pending(units, states).filter((unit) => !exclude.has(unit.id)).slice(0, size);
}

/** Số đoạn còn phải chép (đầy đủ, không bị cắt). */
export function countPending(units, states) {
  return pending(units, states).length;
}
