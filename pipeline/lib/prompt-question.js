/**
 * Prompt sinh câu hỏi Part 5 và prompt kiểm định.
 * D12: hai bước — prompt A sinh câu kèm đáp án, prompt B (chạy bằng MODEL KHÁC) tự giải
 * mà không thấy đáp án. Lệch nhau thì loại câu đó.
 * D17: chỉ mô tả dạng đề bằng lời, không đưa nguyên văn đề thật vào prompt.
 */

export const QUESTION_PROMPT_VERSION = 'part5-v3';

/**
 * Các loại kiến thức Part 5 hay kiểm tra, khớp với enum trong schema.
 * Kèm định nghĩa vì nếu không nói rõ, AI gắn nhãn bừa — hay gặp nhất là gắn "word-form"
 * cho câu thực chất là chọn từ theo nghĩa, làm hỏng thống kê lỗ hổng của người học.
 */
export const ERROR_TYPE_DEFINITIONS = Object.freeze({
  'word-form': 'bốn phương án là các dạng từ loại của CÙNG MỘT gốc từ (inform/information/informative/informatively)',
  'vocabulary': 'bốn phương án là những TỪ KHÁC NHAU, chọn theo nghĩa hoặc collocation (rearrange/relocate/renovate/reconstruct)',
  'verb-tense': 'cùng một động từ ở các thì khác nhau',
  'subject-verb-agreement': 'động từ hoà hợp số ít/số nhiều với chủ ngữ',
  'preposition': 'chọn giới từ',
  'conjunction': 'chọn liên từ hoặc trạng từ liên kết (although/despite/therefore/whereas)',
  'pronoun': 'chọn đại từ hoặc dạng sở hữu/phản thân',
  'relative-clause': 'chọn đại từ quan hệ hoặc dạng mệnh đề quan hệ',
  'participle': 'phân biệt phân từ hiện tại và quá khứ, mệnh đề rút gọn',
  'comparison': 'cấu trúc so sánh',
  'quantifier': 'từ chỉ lượng (much/many/few/several/a great deal of)',
  'infinitive-gerund': 'sau động từ/giới từ dùng to-V hay V-ing',
});

export const ERROR_TYPES = Object.freeze(Object.keys(ERROR_TYPE_DEFINITIONS));

/**
 * Prompt A — sinh câu hỏi.
 * @param {object} input
 * @param {string[]} input.errorTypes - các loại kiến thức cần ra đề
 * @param {string[]} [input.words] - từ vựng nên dùng để câu hỏi bám sát deck đang học
 * @param {number} input.count
 * @returns {string}
 */
export function buildQuestionPrompt({ errorTypes, words = [], count }) {
  if (!Array.isArray(errorTypes) || errorTypes.length === 0) {
    throw new Error('Cần ít nhất một loại kiến thức để ra đề');
  }
  const wordHint = words.length
    ? `\nƯu tiên dùng các từ sau trong câu (mỗi từ nhiều nhất 1 câu): ${words.join(', ')}.`
    : '';

  return `Bạn là người soạn đề luyện thi TOEIC Part 5 (câu hoàn thành câu, 4 phương án A/B/C/D) cho người Việt đang ở mức 850 điểm muốn lên 950.

Soạn ${count} câu hỏi. Mỗi câu là một object JSON với đúng các khoá:
- "stem": câu tiếng Anh có ĐÚNG MỘT chỗ trống viết là ---- (4 dấu gạch ngang). Bối cảnh công sở/thương mại: email, thông báo, hợp đồng, báo cáo, lịch họp. Dài 12-25 từ.
- "options": object {"A": ..., "B": ..., "C": ..., "D": ...} — 4 phương án, chỉ 1 đúng.
- "answer": chữ cái của phương án đúng.
- "errorType": đúng MỘT trong các loại sau, theo định nghĩa kèm theo — gắn nhãn sai làm hỏng thống kê
  lỗ hổng của người học, nên phải cân nhắc kỹ:
${errorTypes.map((type) => `  · ${type}: ${ERROR_TYPE_DEFINITIONS[type]}`).join('\n')}
- "explanation": giải thích bằng TIẾNG VIỆT vì sao đáp án đúng, 1-3 câu, nói rõ dấu hiệu nhận biết trong câu.
- "trap": một câu tiếng Việt nói vì sao các phương án sai lại hấp dẫn.

ĐỘ KHÓ — đây là yêu cầu quan trọng nhất. Người học đã đạt 850 điểm, những câu sau là VÔ DỤNG với họ.
CẤM các mẫu câu dễ sau:
- Có trạng từ thời gian lộ liễu (yesterday, last week, next month, since 2020) rồi hỏi chia thì.
- Bốn phương án là bốn từ loại khác nhau của cùng một từ (exclusive/exclusively/exclusion/exclude)
  mà chỗ trống chỉ có đúng một từ loại điền được.
- Chỗ trống đứng ngay sau mạo từ rồi hỏi danh từ, hoặc ngay sau "to" rồi hỏi động từ nguyên thể.
- Câu mà chỉ cần nhìn 3 từ quanh chỗ trống là chọn được, không cần đọc hết câu.

BẮT BUỘC, mỗi câu phải đạt:
- Phải ĐỌC HẾT câu (thường là đọc cả mệnh đề thứ hai) mới quyết được đáp án.
- Ít nhất 2 phương án sai phải đúng ngữ pháp nếu chỉ xét cục bộ quanh chỗ trống; chúng chỉ sai khi
  xét nghĩa, sự hoà hợp logic, hoặc collocation.
- Ưu tiên các điểm mà người 850 điểm hay trượt: phân biệt từ gần nghĩa, giới từ đi với collocation cố định,
  liên từ chỉ quan hệ logic ngược chiều, thì hoàn thành so với quá khứ đơn khi mốc thời gian là ngầm,
  phân từ phân biệt chủ động/bị động, mệnh đề rút gọn.
- Mỗi câu chỉ kiểm tra MỘT điểm kiến thức, đúng với "errorType" đã ghi.
- TUYỆT ĐỐI không chép lại câu từ bất kỳ đề thi có thật nào. Tự viết hoàn toàn.${wordHint}

Chỉ trả về một mảng JSON gồm ${count} object, không kèm giải thích, không kèm \`\`\`.`;
}

/**
 * Prompt B — bắt model khác tự giải, KHÔNG cho thấy đáp án (D12).
 * @param {Array<{stem: string, options: object}>} questions
 * @returns {string}
 */
export function buildVerifyPrompt(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Không có câu nào để kiểm định');
  }
  const list = questions.map((q, index) => {
    const options = ['A', 'B', 'C', 'D'].map((key) => `${key}. ${q.options[key]}`).join('\n');
    return `#${index + 1}\n${q.stem}\n${options}`;
  }).join('\n\n');

  return `Giải các câu trắc nghiệm ngữ pháp/từ vựng tiếng Anh sau, rồi đánh giá độ khó của chúng.

${list}

Với mỗi câu trả về: {"index": số câu, "answer": "A"/"B"/"C"/"D", "obvious": true/false}

"obvious" = true khi câu đó giải được trong khoảng 3 giây chỉ nhờ MỘT dấu hiệu bề mặt gần chỗ trống —
ví dụ có trạng từ thời gian lộ liễu, hoặc chỉ một phương án đúng từ loại, hoặc chỉ cần nhìn 3 từ quanh
chỗ trống. "obvious" = false khi phải đọc hết câu và cân nhắc nghĩa mới chọn được.
Đánh giá nghiêm khắc: người làm bài đã ở trình độ 850/990.

Trả về mảng JSON đủ ${questions.length} phần tử. Chỉ trả JSON, không giải thích.`;
}

/**
 * Câu Part 5 PHẢI có chỗ trống để điền. Đã lọt một câu không có chỗ trống ra bản phát hành (p5-0079:
 * đáp án "irritated" nằm sẵn trong câu, không điền vào đâu được) — người làm bài không có cách nào chọn đúng.
 *
 * Bản sao của `hasBlank` trong src/logic/part5.js: pipeline cố ý KHÔNG nhập gì từ src/ (hai thế giới tách
 * nhau — app chạy trên trình duyệt, pipeline chạy trên máy Huy). Một test canh hai bản không lệch nhau.
 * @param {string} stem
 * @returns {boolean}
 */
export function hasBlank(stem) {
  return /-{2,}|_{2,}/.test(String(stem ?? ''));
}

/**
 * Đối chiếu đáp án của người ra đề với đáp án của người giải độc lập.
 * @param {Array<object>} questions - câu đã sinh, có trường answer
 * @param {Array<{index: number, answer: string}>} solved
 * @returns {{agreed: object[], rejected: Array<{question: object, solvedAnswer: string|null}>}}
 */
export function crossCheck(questions, solved) {
  const byIndex = new Map();
  for (const item of solved ?? []) {
    const index = Number(item?.index);
    const answer = typeof item?.answer === 'string' ? item.answer.trim().toUpperCase()[0] : null;
    if (Number.isInteger(index) && ['A', 'B', 'C', 'D'].includes(answer)) {
      byIndex.set(index, { answer, obvious: item.obvious === true });
    }
  }

  const agreed = [];
  const rejected = [];
  for (const [position, question] of questions.entries()) {
    const solved = byIndex.get(position + 1) ?? null;
    const solvedAnswer = solved?.answer ?? null;

    // Chỉ áp cho câu Part 5 (có `stem`). Part 2 dùng lại crossCheck nhưng câu nghe không có chỗ trống.
    if (question.stem !== undefined && !hasBlank(question.stem)) {
      rejected.push({ question, solvedAnswer, reason: 'thiếu chỗ trống' });
    } else if (!solvedAnswer || solvedAnswer !== question.answer) {
      rejected.push({ question, solvedAnswer, reason: solvedAnswer ? 'lệch đáp án' : 'không giải được' });
    } else if (solved.obvious) {
      // Đúng đáp án nhưng quá dễ thì cũng bỏ: người 850 điểm không học được gì từ câu này.
      rejected.push({ question, solvedAnswer, reason: 'quá dễ' });
    } else {
      agreed.push({ question, solvedAnswer });
    }
  }
  return { agreed, rejected };
}

/**
 * Khoá so trùng: hai câu cùng nội dung chỗ trống và cùng bộ phương án thì coi là trùng.
 * @param {object} question
 * @returns {string}
 */
export function questionKey(question) {
  const stem = String(question?.stem ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const options = ['A', 'B', 'C', 'D']
    .map((key) => String(question?.options?.[key] ?? '').toLowerCase().trim())
    .sort()
    .join('|');
  return `${stem}::${options}`;
}
