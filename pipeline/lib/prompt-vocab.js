/**
 * Prompt sinh dữ liệu từ vựng và bộ đọc kết quả.
 * Tách riêng khỏi phần gọi mạng để test được mà không tốn hạn mức API.
 * D17: prompt chỉ mô tả dạng đề bằng lời, không chứa nguyên văn đề ETS.
 */

/** Đổi số này khi sửa prompt, để `gen.promptVersion` phản ánh đúng (D13). */
export const VOCAB_PROMPT_VERSION = 'vocab-v1';

/**
 * Dựng prompt cho một lô từ.
 * @param {Array<{word: string, rank: number}>} words
 * @returns {string}
 */
export function buildVocabPrompt(words) {
  if (!Array.isArray(words) || words.length === 0) {
    throw new Error('buildVocabPrompt cần ít nhất 1 từ');
  }
  const list = words.map((w) => `- ${w.word}`).join('\n');
  return `Bạn là giáo viên luyện thi TOEIC, soạn thẻ từ vựng cho một người Việt đang ở trình độ khoảng 850 điểm muốn lên 950.

Với MỖI từ dưới đây, trả về một object JSON theo đúng khoá sau:
- "word": chính từ đó, viết thường
- "pos": mảng loại từ, chỉ dùng: noun, verb, adjective, adverb, preposition, conjunction, pronoun, determiner, interjection, phrase
- "vi": nghĩa tiếng Việt NGẮN GỌN (dưới 12 từ), là nghĩa hay gặp nhất trong bối cảnh công sở/thương mại của đề TOEIC
- "examples": 2 ví dụ, mỗi ví dụ {"en": câu tiếng Anh, "vi": bản dịch tiếng Việt}. Câu phải giống văn phong TOEIC (email công việc, thông báo, hợp đồng, lịch họp), dài 8-18 từ, KHÔNG chép từ bất kỳ đề thi có thật nào
- "collocations": 2-4 cụm từ hay đi với từ này trong tiếng Anh công sở
- "synonyms": tối đa 3 từ đồng nghĩa gần nhất (mảng rỗng nếu không có)
- "antonyms": tối đa 2 từ trái nghĩa (mảng rỗng nếu không có)
- "note": một câu tiếng Việt về bẫy hay gặp trong TOEIC với từ này (dễ nhầm với từ nào, hay ra ở dạng từ loại nào). Bỏ trống "" nếu không có gì đáng nói.

Danh sách từ:
${list}

Chỉ trả về MỘT mảng JSON gồm ${words.length} object, không kèm giải thích, không kèm dấu \`\`\`.`;
}

/**
 * Đọc kết quả AI trả về thành mảng object, chịu được vài kiểu bẩn thường gặp
 * (bọc trong ```json, có chữ thừa trước/sau mảng).
 * @param {string} text
 * @returns {object[]}
 */
export function parseVocabResponse(text) {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('AI trả về rỗng');
  }
  let body = text.trim();

  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) body = fenced[1].trim();

  const start = body.indexOf('[');
  const end = body.lastIndexOf(']');
  if (start === -1 && !body.includes('{')) {
    throw new Error('Không tìm thấy mảng JSON trong kết quả AI');
  }

  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(body.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Rơi xuống cách đọc từng phần bên dưới.
    }
  }

  // Lô lớn dễ bị cắt giữa chừng khi chạm trần token. Vớt lấy các object còn nguyên vẹn
  // thay vì vứt cả lô — mỗi request là một phần hạn mức ngày, không được phí.
  const salvaged = salvageObjects(body.slice(start === -1 ? 0 : start));
  if (salvaged.length === 0) throw new Error('JSON từ AI hỏng, không vớt được mục nào');
  return salvaged;
}

/**
 * Quét một chuỗi JSON (có thể cụt) và trả về mọi object ở cấp ngoài cùng còn đọc được.
 * Bỏ qua dấu ngoặc nằm trong chuỗi và ký tự thoát.
 * @param {string} text
 * @returns {object[]}
 */
export function salvageObjects(text) {
  const out = [];
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }

    if (char === '"') inString = true;
    else if (char === '{') {
      if (depth === 0) startIndex = i;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && startIndex !== -1) {
        try {
          out.push(JSON.parse(text.slice(startIndex, i + 1)));
        } catch {
          // Object hỏng thì bỏ, các object khác vẫn dùng được.
        }
        startIndex = -1;
      }
      if (depth < 0) depth = 0;
    }
  }
  return out;
}

/**
 * Ghép kết quả AI với danh sách từ đã gửi, khớp theo trường "word".
 * Từ nào AI không trả về sẽ nằm trong `missing` để pipeline thử lại sau.
 * @param {Array<{word: string, rank: number}>} words
 * @param {object[]} aiItems
 * @returns {{matched: Array<{word: string, rank: number, ai: object}>, missing: string[]}}
 */
export function matchVocabResponse(words, aiItems) {
  const byWord = new Map();
  for (const item of aiItems) {
    const key = typeof item?.word === 'string' ? item.word.trim().toLowerCase() : '';
    if (key && !byWord.has(key)) byWord.set(key, item);
  }
  const matched = [];
  const missing = [];
  for (const { word, rank } of words) {
    const ai = byWord.get(word.toLowerCase());
    if (ai) matched.push({ word, rank, ai });
    else missing.push(word);
  }
  return { matched, missing };
}
