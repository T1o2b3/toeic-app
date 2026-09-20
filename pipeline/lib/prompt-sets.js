/**
 * Prompt sinh các bộ "tài liệu + câu hỏi" cho Part 3, 4, 6, 7 và prompt kiểm định (D12, D37).
 * D17: chỉ mô tả dạng đề bằng lời, không đưa nguyên văn đề thật. Nội dung tiếng Anh tự viết hoàn toàn.
 *
 * Quy tắc chung rút từ bài học Part 2 (D35): lời giải thích KHÔNG được nhắc chữ cái A/B/C/D vì pipeline
 * xoay vị trí đáp án cho chia đều; các phương án không được tham chiếu nhau ("cả A và B").
 */

export const SET_PROMPT_VERSION = 'sets-v1';

/** Dạng câu hỏi (khớp enum `errorType` trong schemas/set.schema.json), kèm định nghĩa để AI gắn nhãn đúng. */
export const SET_TYPE_DEFINITIONS = Object.freeze({
  gist: 'ý chính / chủ đề của cả đoạn (What is the conversation/talk/email mainly about?)',
  detail: 'một chi tiết được nói rõ trong tài liệu',
  inference: 'điều suy ra được nhưng KHÔNG được nói thẳng (What is implied / most likely...)',
  purpose: 'mục đích viết/nói (Why did the writer send... / Why is the speaker calling?)',
  'next-action': 'việc người nói/viết sắp làm hoặc được yêu cầu làm tiếp (What will the man do next?)',
  'speaker-intent': 'ý của người nói khi nói một câu cụ thể (What does the woman mean when she says "...")',
  reference: 'nghĩa của một từ/cụm từ hoặc từ được thay thế trong ngữ cảnh (The word "..." in paragraph 2 is closest in meaning to)',
  'vocab-in-context': 'chọn từ hợp nghĩa/collocation điền vào chỗ trống trong đoạn văn',
  'grammar-in-context': 'chọn dạng từ/thì/cấu trúc đúng cho chỗ trống, đòi hỏi hiểu ngữ cảnh cả đoạn',
  'connector-in-context': 'chọn từ nối / trạng từ liên kết đúng quan hệ logic giữa các câu',
  'sentence-insertion': 'chọn CẢ CÂU điền vào chỗ trống (hoặc vị trí đặt câu cho sẵn) sao cho mạch văn liền',
  'not-stated': 'câu NOT / EXCEPT: điều KHÔNG được nhắc tới trong tài liệu',
  'cross-reference': 'cần kết hợp thông tin của HAI tài liệu trở lên mới trả lời được',
});

export const SET_TYPES = Object.freeze(Object.keys(SET_TYPE_DEFINITIONS));

const COMMON_RULES = `QUY TẮC CHUNG cho mọi câu hỏi:
- Mỗi câu có 4 phương án A-D, ĐÚNG MỘT đáp án. Phương án sai phải hấp dẫn (dùng lại từ trong tài liệu nhưng sai ý, đúng một phần, suy diễn quá đà, hoặc trả lời câu khác).
- Không phương án nào là "tất cả đều đúng", "cả A và B", "không có đáp án nào" và không phương án nào tham chiếu tới phương án khác.
- "explanation": tiếng Việt, 1-3 câu, nói rõ căn cứ trong tài liệu. "trap": một câu tiếng Việt nói vì sao phương án sai hấp dẫn.
- TUYỆT ĐỐI KHÔNG nhắc chữ cái A, B, C, D trong "explanation" và "trap" (vị trí phương án sẽ bị xáo trộn). Gọi phương án bằng NỘI DUNG của nó.
- Độ khó: người học đã 850 điểm nên câu dễ là vô dụng. Đáp án đúng KHÔNG được chép nguyên văn từ tài liệu; hãy diễn đạt lại (paraphrase).
- TUYỆT ĐỐI không chép lại nội dung từ đề thi có thật. Tự viết hoàn toàn, bối cảnh công sở/thương mại.
- Chỉ trả về JSON hợp lệ, không kèm giải thích, không kèm \`\`\`.`;

const QUESTION_FIELDS = `Mỗi câu hỏi là object {"stem": ..., "options": {"A":..., "B":..., "C":..., "D":...}, "answer": "A|B|C|D", "errorType": <một trong: {TYPES}>, "explanation": ..., "trap": ...}.`;

/** Cấu hình từng dạng: mô tả tài liệu, số câu, các dạng câu hỏi nên dùng. */
const KINDS = Object.freeze({
  3: {
    kind: 'conversation',
    types: ['gist', 'detail', 'inference', 'next-action', 'speaker-intent', 'purpose'],
    body: `Soạn {N} BỘ HỘI THOẠI kiểu TOEIC Part 3 (2 hoặc 3 người nói, được NGHE chứ không đọc). Mỗi bộ là object:
- "title": tên ngắn tiếng Anh của chủ đề.
- "script": mảng lượt nói [{"speaker": "Man" | "Woman" | "Man 2" | "Woman 2", "text": ...}], 6-10 lượt, tổng 80-130 từ, có ngập ngừng/ngắt tự nhiên (well, actually, let me check...), người thứ hai đổi ý/nêu vấn đề rồi cả hai tìm hướng giải quyết. Không ghi tên người nói vào text.
- "questions": ĐÚNG 3 câu: câu 1 hỏi ý chính/mục đích; câu 2 hỏi chi tiết hoặc suy luận; câu 3 hỏi việc sắp làm tiếp theo HOẶC ý của người nói khi nói một câu cụ thể (trích đúng câu đó trong script).`,
    questionCount: [3, 3],
  },
  4: {
    kind: 'talk',
    types: ['gist', 'detail', 'inference', 'next-action', 'speaker-intent', 'purpose'],
    body: `Soạn {N} BÀI NÓI NGẮN kiểu TOEIC Part 4 (một người nói, được NGHE chứ không đọc): thông báo nội bộ, tin nhắn thoại, quảng cáo, hướng dẫn viên, bản tin, phát biểu họp/hội nghị. Mỗi bài là object:
- "title": tên ngắn tiếng Anh.
- "script": mảng ĐÚNG MỘT phần tử [{"speaker": "Speaker", "text": ...}], 90-140 từ, văn nói tự nhiên có câu ngắn ngắt nghỉ, kết bằng lời nhắc/việc cần làm.
- "questions": ĐÚNG 3 câu: ý chính/mục đích; chi tiết hoặc suy luận; việc sắp làm tiếp theo hoặc ý của người nói khi nói một câu cụ thể.`,
    questionCount: [3, 3],
  },
  6: {
    kind: 'text-completion',
    types: ['grammar-in-context', 'vocab-in-context', 'connector-in-context', 'sentence-insertion'],
    body: `Soạn {N} ĐOẠN VĂN ĐIỀN CHỖ TRỐNG kiểu TOEIC Part 6 (email, thông báo, bản ghi nhớ, bài báo ngắn, thư mời). Mỗi bộ là object:
- "title": loại văn bản, vd "Email".
- "passages": mảng ĐÚNG MỘT phần tử [{"label": "Email", "text": ...}], 90-150 từ, có ĐÚNG 4 chỗ trống đánh dấu [1], [2], [3], [4] ngay trong text (viết đúng dạng "[1]"). Chỗ trống đứng đúng chỗ của từ/cụm/câu cần điền.
- "questions": ĐÚNG 4 câu, câu k ứng với chỗ trống [k]. "stem" viết "Blank [k]". Phân bổ: 1 câu grammar-in-context, 1 vocab-in-context, 1 connector-in-context và 1 sentence-insertion (phương án là 4 CÂU đầy đủ; chỉ MỘT câu hợp mạch văn xét cả các câu trước và sau).
  Chỗ trống phải có ít nhất 2 phương án hợp lệ về ngữ pháp nếu chỉ nhìn cục bộ; chỉ một phương án hợp ngữ cảnh của cả đoạn.`,
    questionCount: [4, 4],
  },
  '7-single': {
    kind: 'single',
    types: ['detail', 'not-stated', 'inference', 'purpose', 'reference', 'gist'],
    body: `Soạn {N} BÀI ĐỌC ĐƠN kiểu TOEIC Part 7 (một tài liệu): email, thông báo, bài báo, quảng cáo, thông báo nội bộ, tin nhắn nhóm, biểu mẫu, thư. Mỗi bộ là object:
- "title": loại văn bản.
- "passages": mảng ĐÚNG MỘT phần tử [{"label": ..., "text": ...}], 120-220 từ, có tiêu đề/người gửi/ngày nếu hợp loại văn bản; xuống dòng bằng \\n.
- "questions": 2 đến 4 câu (KHÁC NHAU giữa các bộ), gồm ít nhất một câu detail, và tuỳ bộ có câu not-stated / inference / purpose / reference.`,
    questionCount: [2, 4],
  },
  '7-double': {
    kind: 'double',
    types: ['detail', 'cross-reference', 'inference', 'purpose', 'not-stated'],
    body: `Soạn {N} BỘ HAI TÀI LIỆU LIÊN QUAN kiểu TOEIC Part 7 (vd email + thư trả lời, quảng cáo + bài đánh giá, thông báo + lịch trình). Mỗi bộ là object:
- "title": mô tả ngắn.
- "passages": mảng ĐÚNG 2 phần tử [{"label": ..., "text": ...}], mỗi tài liệu 80-160 từ, thông tin chi tiết (ngày, số tiền, tên) chỉ đủ khi đọc cả hai.
- "questions": ĐÚNG 5 câu, trong đó ít nhất 2 câu cross-reference (phải kết hợp cả hai tài liệu).`,
    questionCount: [5, 5],
  },
  '7-triple': {
    kind: 'triple',
    types: ['detail', 'cross-reference', 'inference', 'purpose', 'not-stated'],
    body: `Soạn {N} BỘ BA TÀI LIỆU LIÊN QUAN kiểu TOEIC Part 7 (vd thông báo + email + biểu mẫu/lịch trình). Mỗi bộ là object:
- "title": mô tả ngắn.
- "passages": mảng ĐÚNG 3 phần tử [{"label": ..., "text": ...}], mỗi tài liệu 60-130 từ; câu trả lời cần ghép thông tin từ nhiều tài liệu.
- "questions": ĐÚNG 5 câu, trong đó ít nhất 3 câu cross-reference.`,
    questionCount: [5, 5],
  },
});

/**
 * Khoá cấu hình: part 7 tách 3 dạng; các part khác dùng số part.
 * @param {number} part
 * @param {'single'|'double'|'triple'} [variant]
 * @returns {string|number}
 */
export function configKey(part, variant) {
  return part === 7 ? `7-${variant ?? 'single'}` : part;
}

/**
 * Prompt A — sinh {count} bộ.
 * @param {object} input
 * @param {number} input.part
 * @param {number} input.count
 * @param {string} [input.variant] - chỉ Part 7
 * @param {string[]} [input.topics] - gợi ý chủ đề để các bộ không trùng ý
 * @returns {string}
 */
export function buildSetPrompt({ part, count, variant, topics = [] }) {
  const config = KINDS[configKey(part, variant)];
  if (!config) throw new Error(`Không hỗ trợ Part ${part}${variant ? `/${variant}` : ''}`);
  const topicHint = topics.length ? `\nChủ đề gợi ý (mỗi bộ một chủ đề khác nhau): ${topics.join('; ')}.` : '';
  return `Bạn là người soạn đề luyện thi TOEIC cho người Việt đang ở mức 850 điểm muốn lên 950.

${config.body.replace('{N}', String(count))}${topicHint}

${QUESTION_FIELDS.replace('{TYPES}', config.types.join(' | '))}
Định nghĩa dạng câu (gắn nhãn errorType cho đúng):
${config.types.map((t) => `  · ${t}: ${SET_TYPE_DEFINITIONS[t]}`).join('\n')}

${COMMON_RULES}

Trả về MỘT mảng JSON gồm ${count} bộ.`;
}

/** Tài liệu của một bộ dưới dạng chữ, dùng cho prompt kiểm định. */
export function materialText(item) {
  if (item.script) return item.script.map((t) => `${t.speaker}: ${t.text}`).join('\n');
  return (item.passages ?? []).map((p, i) => `--- Document ${i + 1}: ${p.label} ---\n${p.text}`).join('\n\n');
}

/**
 * Prompt B — model KHÁC tự giải, KHÔNG thấy đáp án.
 * @param {Array<object>} items
 * @returns {string}
 */
export function buildSetVerifyPrompt(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('Không có bộ nào để kiểm định');
  const list = items.map((item, index) => {
    const qs = item.questions.map((q, n) => `  Q${n + 1}. ${q.stem}\n${['A', 'B', 'C', 'D'].map((k) => `     ${k}. ${q.options[k]}`).join('\n')}`).join('\n');
    return `#${index + 1}\n${materialText(item)}\n\n${qs}`;
  }).join('\n\n=========\n\n');

  return `Đọc/nghe tài liệu rồi trả lời các câu hỏi trắc nghiệm kiểu TOEIC. Chỉ dựa vào tài liệu.

${list}

Với mỗi bộ trả về {"index": số bộ, "answers": ["A"|"B"|"C"|"D", ...]} — đủ một chữ cái cho MỖI câu theo thứ tự.
Trả về mảng JSON đủ ${items.length} phần tử. Chỉ trả JSON, không giải thích.`;
}
