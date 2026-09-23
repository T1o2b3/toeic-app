/**
 * Prompt sinh câu hỏi nghe Part 2 (hỏi - đáp ngắn) và prompt kiểm định.
 * Cùng khuôn với Part 5 (D12): model A sinh kèm đáp án, model B KHÁC tự giải mà không thấy đáp án,
 * lệch nhau hoặc quá dễ thì loại. D17: chỉ mô tả dạng đề bằng lời, không đưa đề thật vào prompt.
 *
 * Khác Part 5 ở chỗ chỉ có 3 phương án và người học KHÔNG thấy chữ lúc làm bài — nên bẫy nằm ở
 * âm thanh và ở việc trả lời lệch câu hỏi, không phải ở ngữ pháp.
 */

/**
 * v3: Tăng cường sự đa dạng bối cảnh, yêu cầu văn phong nói tự nhiên (spoken English),
 * cấm các mô típ "sách giáo khoa" lặp lại.
 */
export const PART2_PROMPT_VERSION = 'part2-v3';

/** Dạng câu hỏi Part 2, khớp enum `errorType` in schemas/listening.schema.json. */
export const PART2_TYPE_DEFINITIONS = Object.freeze({
  'wh-who': 'câu hỏi Who / Whose (ai, của ai) — đáp án thường là tên, chức danh hoặc phòng ban, hay trả lời gián tiếp',
  'wh-what': 'câu hỏi What / Which (cái gì, cái nào)',
  'wh-where': 'câu hỏi Where — địa điểm, hoặc chỉ dẫn "hỏi phòng X", "trên bàn của Y"',
  'wh-when': 'câu hỏi When / What time / How soon — mốc thời gian, hoặc "ngay sau cuộc họp"',
  'wh-why': 'câu hỏi Why / Why don\'t we — lý do, hoặc lời đề nghị dưới dạng Why don\'t',
  'wh-how': 'câu hỏi How (how long / how much / how often / how do I...)',
  'yes-no': 'câu hỏi Yes/No (Do/Did/Have/Is/Can...) — đáp án hay là câu gián tiếp thay vì Yes/No',
  'tag-question': 'câu hỏi đuôi (..., isn\'t it? / ..., didn\'t you?)',
  'choice': 'câu hỏi lựa chọn "A or B?" — đáp án có thể chọn một, cả hai, hoặc không chọn cái nào',
  'statement': 'MỘT CÂU KHẲNG ĐỊNH (không phải câu hỏi) mà phương án đúng là phản hồi tự nhiên với nó',
  'request-suggestion': 'lời đề nghị / yêu cầu / gợi ý (Could you..., Would you mind..., Let\'s...) và cách đáp lại',
  'indirect': 'câu hỏi lồng (Do you know where..., Could you tell me when...)',
});

export const PART2_TYPES = Object.freeze(Object.keys(PART2_TYPE_DEFINITIONS));

/**
 * Prompt A — sinh câu hỏi nghe.
 * @param {object} input
 * @param {string[]} input.types - dạng câu cần ra đề
 * @param {number} input.count
 * @returns {string}
 */
export function buildPart2Prompt({ types, count }) {
  if (!Array.isArray(types) || types.length === 0) {
    throw new Error('Cần ít nhất một dạng câu để ra đề');
  }

  return `Bạn là chuyên gia soạn đề TOEIC Listening Part 2 cho trình độ cao cấp (850 $\rightarrow$ 950). 
Mục tiêu là tạo ra các câu hỏi có tính thực tế cao, tránh xa các mẫu câu "sách giáo khoa" khô khan và lặp lại.

YÊU CẦU VỀ NỘI DUNG:
1. Bối cảnh đa dạng: Không chỉ xoay quanh "travel budget" hay "marketing campaign". Hãy mở rộng sang: 
   - Vận hành kho bãi, logistics, quản lý chuỗi cung ứng.
   - Xung đột nhỏ nơi công sở, điều phối lịch họp, thảo luận về deadline.
   - Giao tiếp với đối tác bên ngoài, khách hàng khó tính, nhà cung cấp.
   - Các tình huống thực tế: máy in hỏng, nhầm lịch hẹn, thiếu hụt nhân sự, cập nhật phần mềm.
2. Văn phong nói tự nhiên (Spoken English): 
   - Sử dụng các cụm từ tự nhiên, lối nói rút gọn (elliptical responses) thay vì câu đầy đủ ngữ pháp.
   - Ví dụ thay vì "Yes, I can help you," hãy dùng "Sure thing," hoặc "I'm on it."
   - Tránh các câu đáp quá dài hoặc quá trang trọng một cách gượng ép.
3. Độ khó 850+: 
   - Đáp án đúng phải là câu trả lời GIÁN TIẾP, TRẢ LỜI MỘT CÂU HỎI KHÁC hoặc yêu cầu suy luận nhẹ. 
   - TUYỆT ĐỐI không để đáp án đúng lặp lại từ khóa chính của câu hỏi một cách lộ liễu.

YÊU CẦU CẤU TRÚC (JSON):
Soạn ${count} câu. Mỗi câu là một object JSON:
- "question": câu nói thứ nhất (5-16 từ).
- "responses": {"A": ..., "B": ..., "C": ...} (mỗi câu 2-14 từ).
- "answer": "A", "B" hoặc "C" (phân bổ đều).
- "errorType": đúng MỘT trong các dạng:
${types.map((type) => `  · ${type}: ${PART2_TYPE_DEFINITIONS[type]}`).join('\n')}
- "explanation": giải thích tiếng Việt ngắn gọn, nhấn mạnh tại sao đáp án đúng là tự nhiên nhất.
- "trap": giải thích tiếng Việt về bẫy (âm thanh tương tự, trả lời sai loại câu hỏi, lặp từ khóa).

QUY TẮC VÀNG:
- KHÔNG nhắc chữ cái A, B, C trong "explanation" và "trap".
- Mỗi câu phải có ít nhất một bẫy "lặp từ" (word repeat) và một bẫy "sai loại câu" (wrong type).
- Phải đảm bảo mỗi câu trong lô ${count} câu có tình huống và từ vựng hoàn toàn khác nhau.

Chỉ trả về một mảng JSON, không kèm giải thích, không kèm \`\`\`.`;
}

/**
 * Prompt B — bắt model khác tự giải, KHÔNG cho cho thấy đáp án.
 * @param {Array<{question: string, responses: object}>} items
 * @returns {string}
 */
export function buildPart2VerifyPrompt(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Không có câu nào để kiểm định');
  }
  const list = items.map((item, index) => {
    const responses = ['A', 'B', 'C'].map((key) => `${key}. ${item.responses[key]}`).join('\n');
    return `#${index + 1}\nQ: ${item.question}\n${responses}`;
  }).join('\n\n');

  return `Đây là các câu hỏi - đáp ngắn kiểu TOEIC Part 2. Với mỗi câu, chọn phương án đáp lại PHÙ HỢP NHẤT với câu hỏi, rồi đánh giá độ khó.

${list}

Với mỗi câu trả về: {"index": số câu, "answer": "A"/"B"/"C", "obvious": true/false}

"obvious" = true khi câu giải được ngay chỉ nhờ một dấu hiệu bề mặt (vd đáp án duy nhất bắt đầu bằng Yes/No, hoặc hai phương án kia rõ ràng không liên quan đến loại câu hỏi). "obvious" = false khi phải nghe kỹ nghĩa mới chọn được. Đánh giá nghiêm khắc: người làm bài đã ở trình độ 850/990.

Trả về mảng JSON đủ ${items.length} phần tử. Chỉ trả JSON, không giải thích.`;
}

export function part2Key(item) {
  const question = String(item?.question ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const responses = ['A', 'B', 'C']
    .map((key) => String(item?.responses?.[key] ?? '').toLowerCase().trim())
    .sort()
    .join('|');
  return `${question}::${responses}`;
}

export function mentionsChoiceLetter(text) {
  const value = String(text ?? '');
  // A–D: dùng chung cho Part 2 (3 phương án) lẫn Part 5 và các bộ (4 phương án) — bỏ sót D là đổi chỗ sai (D64).
  // `(?!\p{L})` thay cho `\b`: `\b` chỉ hiểu chữ ASCII nên "câu dễ", "câu bị động" bị đọc thành "câu D", "câu B".
  return /\((?:[A-D])\)/.test(value)
    || /(?:câu|phương án|đáp án|đáp án đúng|lựa chọn|option|answer|choice)\s+(?:là\s+)?["'“‘]?[A-D](?!\p{L})/iu.test(value)
    || /(?:câu|phương án|đáp án)\s+[A-D]\s*(?:,|và|hoặc)\s*[A-D](?!\p{L})/iu.test(value);
}

/**
 * Văn bản có phải tiếng Việt không (có chữ mang dấu tiếng Việt). Prompt dặn viết lời giải bằng tiếng Việt, nhưng
 * model yếu (flash-lite) từng bỏ qua: 10 bộ Part 7 đầu ra lời giải toàn tiếng Anh mà vẫn qua kiểm định.
 * Không có chữ nào thì coi là đạt (trường tuỳ chọn như `trap` có thể trống).
 * @param {unknown} text
 * @returns {boolean}
 */
export function isVietnameseOrEmpty(text) {
  const value = String(text ?? '').trim();
  return value === '' || /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(value);
}

export function isWellFormedPart2(item) {
  if (typeof item?.question !== 'string' || item.question.trim().split(/\s+/).length < 3) return false;
  if (!['A', 'B', 'C'].includes(item?.answer)) return false;
  for (const key of ['A', 'B', 'C']) {
    const text = item?.responses?.[key];
    if (typeof text !== 'string' || text.trim().length < 2) return false;
    if (text.trim().split(/\s+/).length > 25) return false;
  }
  const unique = new Set(['A', 'B', 'C'].map((key) => item.responses[key].trim().toLowerCase()));
  if (unique.size !== 3) return false;
  if (!isVietnameseOrEmpty(item.explanation) || !isVietnameseOrEmpty(item.trap)) return false;
  return !mentionsChoiceLetter(item.explanation) && !mentionsChoiceLetter(item.trap);
}
