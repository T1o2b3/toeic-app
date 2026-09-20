/**
 * Prompt sinh câu hỏi nghe Part 2 (hỏi - đáp ngắn) và prompt kiểm định.
 * Cùng khuôn với Part 5 (D12): model A sinh kèm đáp án, model B KHÁC tự giải mà không thấy đáp án,
 * lệch nhau hoặc quá dễ thì loại. D17: chỉ mô tả dạng đề bằng lời, không đưa đề thật vào prompt.
 *
 * Khác Part 5 ở chỗ chỉ có 3 phương án và người học KHÔNG thấy chữ lúc làm bài — nên bẫy nằm ở
 * âm thanh và ở việc trả lời lệch câu hỏi, không phải ở ngữ pháp.
 */

/**
 * v2: cấm nhắc chữ cái A/B/C trong explanation/trap. Pipeline xoay vị trí các câu đáp để đáp án chia đều
 * A/B/C (assembleEntry), nên mọi chữ cái trong lời giải thích sẽ sai sau khi xoay. v1 đã mắc lỗi này.
 */
export const PART2_PROMPT_VERSION = 'part2-v2';

/** Dạng câu hỏi Part 2, khớp enum `errorType` trong schemas/listening.schema.json. */
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

  return `Bạn là người soạn đề luyện thi TOEIC Listening Part 2 (Question-Response) cho người Việt đang ở mức 850 điểm muốn lên 950.
Người học sẽ NGHE (không đọc chữ): một người nói câu thứ nhất, rồi người thứ hai nói 3 câu đáp A, B, C. Chỉ 1 câu đáp là phù hợp.

Soạn ${count} câu. Mỗi câu là một object JSON với đúng các khoá:
- "question": câu người thứ nhất nói, tiếng Anh, bối cảnh công sở/thương mại (văn phòng, cuộc họp, giao hàng, tuyển dụng, đi công tác, kho, nhà hàng...), 5-16 từ.
- "responses": {"A": ..., "B": ..., "C": ...} — ba câu đáp, mỗi câu 2-14 từ, đọc thành lời tự nhiên (viết đúng chính tả, có dấu câu để đọc ngắt nghỉ tự nhiên).
- "answer": "A", "B" hoặc "C" — phải phân bổ đều giữa A, B, C trong cả loạt, đừng dồn vào một chữ.
- "errorType": đúng MỘT trong các dạng sau, theo định nghĩa:
${types.map((type) => `  · ${type}: ${PART2_TYPE_DEFINITIONS[type]}`).join('\n')}
- "explanation": giải thích bằng TIẾNG VIỆT vì sao câu đáp đúng phù hợp, 1-3 câu, nêu rõ từ khoá trong câu hỏi cần nghe.
- "trap": một câu tiếng Việt nói vì sao các câu đáp sai nghe có vẻ hợp lý (bẫy âm thanh, lặp từ, trả lời câu hỏi khác...).

QUAN TRỌNG về cách viết "explanation" và "trap": TUYỆT ĐỐI KHÔNG nhắc tới chữ cái A, B, C (không viết "đáp án B",
"câu A", "phương án C", "(B)"). Vị trí các câu đáp sẽ bị xáo trộn sau khi bạn viết xong nên mọi chữ cái sẽ thành sai.
Hãy gọi câu đáp bằng NỘI DUNG của nó, vd: câu đáp nhắc tới "the HR desk", câu đáp nói về thời gian, câu đáp lặp lại từ "secure".

ĐỘ KHÓ — người học đã 850 điểm nên câu dễ là vô dụng. Mỗi câu phải:
- Có ít nhất MỘT phương án sai chứa từ trùng hoặc gần âm với từ trong câu hỏi (vd: copy/coffee, sale/sail, right/write, meeting/eating) — bẫy dành cho người nghe nhầm.
- Có ít nhất MỘT phương án sai TRẢ LỜI MỘT CÂU HỎI KHÁC (vd câu hỏi "When" mà đáp bằng địa điểm; câu hỏi "Who" mà đáp bằng thời gian) nhưng nghe vẫn trôi chảy.
- Phương án đúng nên GIÁN TIẾP hoặc tự nhiên như người thật nói ("I'll check with Ms. Lee", "It's been moved to Friday", "Isn't that Ken's department?"), KHÔNG phải câu trả lời sách giáo khoa lặp lại từ của câu hỏi.
- Không câu nào có phương án đúng nhìn chữ đầu là đoán ra (vd cứ "Yes," hay "No," là đúng).
- Mỗi câu chỉ có ĐÚNG MỘT phương án phù hợp; hai phương án còn lại phải sai thật sự khi nghe lại, không được "cũng chấp nhận được".
- TUYỆT ĐỐI không chép lại câu từ đề thi có thật. Tự viết hoàn toàn.

Chỉ trả về một mảng JSON gồm ${count} object, không kèm giải thích, không kèm \`\`\`.`;
}

/**
 * Prompt B — bắt model khác tự giải, KHÔNG cho thấy đáp án.
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

/**
 * Khoá so trùng: cùng câu hỏi và cùng bộ câu đáp thì coi là trùng.
 * @param {{question?: string, responses?: object}} item
 * @returns {string}
 */
export function part2Key(item) {
  const question = String(item?.question ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const responses = ['A', 'B', 'C']
    .map((key) => String(item?.responses?.[key] ?? '').toLowerCase().trim())
    .sort()
    .join('|');
  return `${question}::${responses}`;
}

/**
 * Lời giải thích có nhắc tới chữ cái phương án không ("đáp án B", "câu A", "phương án C", "(B)")?
 * Không được phép: vị trí câu đáp bị xoay sau khi sinh nên chữ cái sẽ sai.
 * @param {unknown} text
 * @returns {boolean}
 */
// Không dùng \b trước cụm tiếng Việt: \b của JavaScript chỉ hiểu ASCII nên không khớp ở đầu chữ có dấu ("đáp").
export function mentionsChoiceLetter(text) {
  const value = String(text ?? '');
  return /\((?:[ABC])\)/.test(value)
    || /(?:câu|phương án|đáp án|đáp án đúng|lựa chọn|option|answer|choice)\s+(?:là\s+)?["'“‘]?[ABC]\b/i.test(value)
    || /(?:câu|phương án|đáp án)\s+[ABC]\s*(?:,|và|hoặc)\s*[ABC]\b/i.test(value);
}

/**
 * Lọc các câu AI sinh ra hỏng cấu trúc trước khi tốn một request kiểm định.
 * @param {unknown} item
 * @returns {boolean}
 */
export function isWellFormedPart2(item) {
  if (typeof item?.question !== 'string' || item.question.trim().split(/\s+/).length < 3) return false;
  if (!['A', 'B', 'C'].includes(item?.answer)) return false;
  for (const key of ['A', 'B', 'C']) {
    const text = item?.responses?.[key];
    if (typeof text !== 'string' || text.trim().length < 2) return false;
    if (text.trim().split(/\s+/).length > 25) return false; // quá dài để nghe một lần
  }
  const unique = new Set(['A', 'B', 'C'].map((key) => item.responses[key].trim().toLowerCase()));
  if (unique.size !== 3) return false;
  return !mentionsChoiceLetter(item.explanation) && !mentionsChoiceLetter(item.trap);
}
