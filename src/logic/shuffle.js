/**
 * Xáo một danh sách. Tách ra file riêng vì cả thi thử (exam.js) lẫn lượt luyện Part 5 (part5.js) đều cần,
 * mà part5.js được exam.js gọi — để chung một file sẽ thành vòng tròn import.
 */

/**
 * Fisher–Yates: xáo ĐỀU (khác `sort(() => random() - 0.5)` vốn thiên lệch và phụ thuộc thuật toán sắp xếp).
 * @template T
 * @param {T[]} list
 * @param {() => number} random
 * @returns {T[]} mảng mới, không sửa mảng gốc
 */
/**
 * Bộ sinh số ngẫu nhiên CÓ HẠT GIỐNG (mulberry32): cùng một `seed` thì luôn ra đúng cùng một dãy số.
 *
 * Dùng khi cần dựng lại y hệt một thứ đã xáo: thi thử lưu `seed` lúc bắt đầu, lúc khôi phục bài làm dở
 * thì dựng lại đề bằng chính `seed` đó. Nếu dùng `Math.random`, đề dựng lại sẽ là đề KHÁC và mọi câu
 * trả lời đã lưu trở thành vô nghĩa.
 * @param {number} seed
 * @returns {() => number} hàm trả số trong [0, 1), dùng thay cho Math.random
 */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Thứ tự ngẫu nhiên nhưng CỐ ĐỊNH theo `seed` (D65): sắp theo hash(seed, id).
 *
 * Dùng cho hàng đợi từ vựng — màn vẽ lại liên tục (lật thẻ, chấm xong) nên xáo bằng `Math.random` mỗi lần
 * vẽ sẽ làm từ đang hiện nhảy sang từ khác. Sắp theo hash thì bỏ bớt phần tử (từ vừa chấm) không làm đổi
 * thứ tự phần còn lại; đổi `seed` mỗi lượt là ra thứ tự mới.
 * @template T
 * @param {T[]} list
 * @param {number} seed
 * @param {(item: T) => string} [keyOf]
 * @returns {T[]}
 */
export function seededOrder(list, seed, keyOf = (item) => item.id) {
  const rank = (key) => {
    let h = (seed ^ 0x9e3779b9) >>> 0;
    for (let i = 0; i < key.length; i += 1) {
      h = Math.imul(h ^ key.charCodeAt(i), 0x5bd1e995);
      h ^= h >>> 15;
    }
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  };
  return list
    .map((item) => { const key = String(keyOf(item)); return { item, key, rank: rank(key) }; })
    .sort((a, b) => a.rank - b.rank || a.key.localeCompare(b.key))
    .map((x) => x.item);
}

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Lời giải có nhắc chữ cái phương án không ("Phương án B…", "(D)"). Bản sao của `mentionsChoiceLetter` trong
 * pipeline/lib/prompt-listening.js — app không nhập gì từ pipeline; tests/shuffle.test.js canh hai bản không lệch.
 * @param {string} text
 * @returns {boolean}
 */
export function mentionsChoiceLetter(text) {
  const value = String(text ?? '');
  return /\((?:[A-D])\)/.test(value)
    || /(?:câu|phương án|đáp án|đáp án đúng|lựa chọn|option|answer|choice)\s+(?:là\s+)?["'“‘]?[A-D](?!\p{L})/iu.test(value)
    || /(?:câu|phương án|đáp án)\s+[A-D]\s*(?:,|và|hoặc)\s*[A-D](?!\p{L})/iu.test(value);
}

/**
 * Xáo phương án của MỘT lần hiện câu (D65). Trả bản sao: phương án (và âm thanh câu đáp Part 2) đổi chỗ,
 * `answer` theo nội dung đúng, `original` quy chữ cái hiển thị về chữ cái gốc — nhật ký luôn ghi chữ GỐC.
 * Câu có lời giải nhắc chữ cái thì giữ nguyên, vì xáo xong lời giải sẽ nói sai.
 * @param {object} question - có `options` (Part 3–7) hoặc `responses` + `audio` (Part 2)
 * @param {() => number} [random]
 * @returns {object}
 */
export function shuffleChoices(question, random = Math.random) {
  const field = question.options ? 'options' : 'responses';
  const letters = LETTERS.filter((l) => question[field]?.[l] !== undefined);
  if (letters.length < 2 || mentionsChoiceLetter(question.explanation) || mentionsChoiceLetter(question.trap)) return question;

  const order = shuffle(letters, random);   // order[i] = chữ cái GỐC hiện ở vị trí letters[i]
  const moved = (map) => Object.fromEntries(letters.map((l, i) => [l, map[order[i]]]));
  const view = {
    ...question,
    [field]: moved(question[field]),
    answer: letters[order.indexOf(question.answer)],
    original: Object.fromEntries(letters.map((l, i) => [l, order[i]])),
  };
  if (field === 'responses' && question.audio) view.audio = { ...question.audio, ...moved(question.audio) };
  return view;
}

/** Chữ cái gốc của một lựa chọn trên bản đã xáo — dùng khi ghi `choice` vào nhật ký. */
export const originalLetter = (question, letter) => question.original?.[letter] ?? letter;

/**
 * Giữ MỘT bản đã xáo cho mục đang hiện (D65). Màn vẽ lại liên tục (bấm nghe, chọn đáp án) — xáo lại mỗi lần
 * vẽ thì phương án nhảy chỗ ngay trước mắt. Sang mục khác (id khác) hoặc `reset()` thì xáo bản mới.
 * @param {(item: object) => object} make - dựng bản đã xáo từ mục gốc
 * @returns {{get: (item: object|null) => object|null, reset: () => void}}
 */
export function onceShuffled(make) {
  let last = null;
  return {
    get(item) {
      if (!item) return null;
      if (last?.id !== item.id) last = make(item);
      return last;
    },
    reset() { last = null; },
  };
}

/** Hạt giống mới cho `seededRandom` / `seededOrder` — mỗi lượt học hoặc mỗi bài thi một hạt. */
export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);
