/**
 * Logic luyện câu hỏi trắc nghiệm. Hàm thuần, không đụng DOM.
 * Trạng thái được tính lại từ nhật ký sự kiện như phần từ vựng (D23).
 */

/**
 * Gấp nhật ký thành trạng thái từng câu hỏi.
 * @param {Array<{type: string, ts: number, payload: object}>} events
 * @returns {Map<string, {questionId: string, attempts: number, wrong: number, lastCorrect: boolean|null, lastTs: number|null, reported: boolean}>}
 */
export function reduceQuizState(events) {
  const states = new Map();

  const ensure = (questionId) => {
    if (!states.has(questionId)) {
      states.set(questionId, {
        questionId, attempts: 0, wrong: 0, lastCorrect: null, lastTs: null, reported: false,
      });
    }
    return states.get(questionId);
  };

  for (const event of events ?? []) {
    const questionId = event?.payload?.questionId;
    if (typeof questionId !== 'string' || questionId === '') continue;

    if (event.type === 'question.answered') {
      const state = ensure(questionId);
      const correct = event.payload.correct === true;
      state.attempts += 1;
      if (!correct) state.wrong += 1;
      state.lastCorrect = correct;
      state.lastTs = event.ts;
    } else if (event.type === 'question.reported') {
      ensure(questionId).reported = true;
    }
  }

  return states;
}

/**
 * Chấm một câu trả lời.
 * @param {{answer: string, errorType: string}} question
 * @param {string} choice - A/B/C/D
 * @returns {{correct: boolean, errorType: string, answer: string}}
 */
export function gradeAnswer(question, choice) {
  return {
    correct: question.answer === choice,
    answer: question.answer,
    errorType: question.errorType,
  };
}

/**
 * Xếp TOÀN BỘ ngân hàng theo mức cần làm: câu từng làm SAI trước (sai nhiều lên trước),
 * rồi câu chưa làm bao giờ, cuối cùng câu đã làm đúng (lâu chưa gặp lên trước).
 * Câu đã báo lỗi bị loại hẳn.
 *
 * Tách riêng khỏi `quizQueue` vì lượt Part 5 theo đề thật (part5.js) cần CẢ danh sách đã xếp hạng
 * để chia theo hạn mức từng nhóm, chứ không chỉ N câu đầu.
 *
 * @param {Array<object>} questions
 * @param {Map<string, object>} states
 * @param {{errorType?: string, exclude?: Set<string>}} [options]
 * @returns {Array<object>}
 */
export function rankQuestions(questions, states, { errorType, exclude } = {}) {
  const pool = (questions ?? []).filter((question) => {
    if (question.status === 'retired') return false;
    if (states.get(question.id)?.reported) return false;
    if (errorType && question.errorType !== errorType) return false;
    if (exclude?.has(question.id)) return false;
    return true;
  });

  const wrong = [];
  const unseen = [];
  const done = [];
  for (const question of pool) {
    const state = states.get(question.id);
    if (!state) unseen.push(question);
    else if (state.lastCorrect === false) wrong.push(question);
    else done.push(question);
  }

  wrong.sort((a, b) => (states.get(b.id).wrong - states.get(a.id).wrong));
  done.sort((a, b) => (states.get(a.id).lastTs ?? 0) - (states.get(b.id).lastTs ?? 0));

  return [...wrong, ...unseen, ...done];
}

/**
 * Chọn câu cho một lượt luyện: N câu đầu của danh sách đã xếp hạng.
 * @param {Array<object>} questions
 * @param {Map<string, object>} states
 * @param {object} [options]
 * @param {number} [options.size] - số câu mỗi lượt, mặc định 20
 * @param {string} [options.errorType] - chỉ lấy một loại kiến thức
 * @param {Set<string>} [options.exclude] - câu đã làm trong lượt này; câu sai được ưu tiên
 *   cho LƯỢT SAU, còn trong cùng một lượt thì không lặp lại ngay
 * @returns {Array<object>}
 */
export function quizQueue(questions, states, { size = 20, errorType, exclude } = {}) {
  return rankQuestions(questions, states, { errorType, exclude }).slice(0, size);
}

/**
 * Thống kê tỉ lệ đúng theo loại kiến thức — chỉ ra lỗ hổng của người học.
 * @param {Array<object>} questions
 * @param {Map<string, object>} states
 * @returns {Array<{errorType: string, attempts: number, wrong: number, accuracy: number}>}
 */
export function accuracyByErrorType(questions, states) {
  const byType = new Map();
  const typeOf = new Map(questions.map((question) => [question.id, question.errorType]));

  for (const state of states.values()) {
    const errorType = typeOf.get(state.questionId);
    if (!errorType || state.attempts === 0) continue;
    const bucket = byType.get(errorType) ?? { errorType, attempts: 0, wrong: 0 };
    bucket.attempts += state.attempts;
    bucket.wrong += state.wrong;
    byType.set(errorType, bucket);
  }

  return [...byType.values()]
    .map((bucket) => ({ ...bucket, accuracy: (bucket.attempts - bucket.wrong) / bucket.attempts }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

/**
 * Tên tiếng Việt của từng dạng câu (`errorType`). Mã tiếng Anh giữ nguyên trong dữ liệu và nhật ký sự kiện
 * (ID vĩnh viễn), chỉ đổi chữ HIỂN THỊ — trước đây màn phân tích in thẳng `word-form`, `wh-why`... khó hiểu.
 * Tên trong ngoặc là chữ tiếng Anh thật xuất hiện trong đề, để nhận ra khi gặp.
 */
export const ERROR_TYPE_LABEL = Object.freeze({
  // Part 5–6: ngữ pháp và từ vựng
  'word-form': 'Từ loại',
  participle: 'Phân từ (V-ing / V-ed)',
  vocabulary: 'Từ vựng',
  'verb-tense': 'Thì động từ',
  'subject-verb-agreement': 'Hoà hợp chủ ngữ – động từ',
  pronoun: 'Đại từ',
  preposition: 'Giới từ',
  conjunction: 'Liên từ',
  'relative-clause': 'Mệnh đề quan hệ',
  comparison: 'So sánh',
  quantifier: 'Từ chỉ số lượng',
  'infinitive-gerund': 'To V hay V-ing',
  'grammar-in-context': 'Ngữ pháp theo ngữ cảnh',
  'vocab-in-context': 'Từ vựng theo ngữ cảnh',
  'connector-in-context': 'Từ nối theo ngữ cảnh',
  'sentence-insertion': 'Chèn câu vào đoạn',
  // Part 2: kiểu câu hỏi / câu nói mở đầu
  'wh-who': 'Hỏi ai (Who)',
  'wh-what': 'Hỏi cái gì (What)',
  'wh-when': 'Hỏi khi nào (When)',
  'wh-where': 'Hỏi ở đâu (Where)',
  'wh-why': 'Hỏi tại sao (Why)',
  'wh-how': 'Hỏi thế nào (How)',
  'yes-no': 'Câu hỏi Có/Không',
  'tag-question': 'Câu hỏi đuôi',
  choice: 'Câu hỏi lựa chọn (A hay B)',
  'request-suggestion': 'Lời đề nghị, yêu cầu',
  statement: 'Câu nói, không phải câu hỏi',
  indirect: 'Trả lời vòng vo, gián tiếp',
  // Part 3, 4, 7: đọc/nghe hiểu
  gist: 'Ý chính, mục đích chung',
  detail: 'Chi tiết cụ thể',
  inference: 'Suy luận',
  purpose: 'Mục đích',
  'speaker-intent': 'Ý người nói',
  'next-action': 'Việc sắp làm tiếp',
  'not-stated': 'Điều KHÔNG được nhắc',
  reference: 'Từ này chỉ cái gì',
  'cross-reference': 'Đối chiếu nhiều đoạn',
});

/**
 * @param {string} errorType
 * @returns {string} tên tiếng Việt; dạng lạ (pipeline mới thêm) thì trả nguyên mã, không để trống
 */
export function errorTypeLabel(errorType) {
  return ERROR_TYPE_LABEL[errorType] ?? errorType;
}
