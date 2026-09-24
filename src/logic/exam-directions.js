/**
 * Chữ IN TRÊN ĐỀ của thi thử (D67): phần hướng dẫn (Directions) đầu mỗi Part và dòng giới thiệu mỗi bộ
 * ("Questions 147–148 refer to the following e-mail."). Hàm thuần, không đụng DOM.
 *
 * Viết bằng tiếng Anh vì đề thật toàn tiếng Anh — quen mặt chữ là một phần của luyện thi. Lời hướng dẫn
 * do app TỰ VIẾT LẠI ý, không chép nguyên văn của ETS (ràng buộc #7).
 */

/**
 * Thời gian "băng đọc hướng dẫn" ở đầu mỗi Part phần Nghe (giây). Đề thật đọc hướng dẫn ~30 giây, và người
 * thi quen tay dùng lúc đó để đọc trước câu hỏi của bộ đầu tiên (Part 3/4). App không có tiếng đọc hướng dẫn
 * nên chỉ đếm ngược, rút xuống 10 giây cho đỡ phí — vẫn đủ lướt ba câu hỏi. Có nút bắt đầu ngay.
 */
export const DIRECTIONS_SECONDS = 10;

/** Hướng dẫn từng Part. Part 1 không có vì app bỏ Part 1 (cần ảnh). */
export const PART_DIRECTIONS = Object.freeze({
  part2: 'You will hear a question or statement, followed by three spoken replies. Nothing is printed, and '
    + 'everything is played only once. Choose the reply that fits best: (A), (B), or (C).',
  part3: 'You will hear short conversations between two or three people. Each conversation has three printed '
    + 'questions. The conversation is not printed and is played only once. Choose the best answer to each '
    + 'question: (A), (B), (C), or (D).',
  part4: 'You will hear short talks given by one speaker. Each talk has three printed questions. The talk is '
    + 'not printed and is played only once. Choose the best answer to each question: (A), (B), (C), or (D).',
  part5: 'Each sentence below has a word or phrase missing. Choose the answer that best completes the '
    + 'sentence: (A), (B), (C), or (D).',
  part6: 'Read the texts below. A word, a phrase, or a whole sentence is missing in parts of each text. '
    + 'Choose the answer that best fills each blank: (A), (B), (C), or (D).',
  part7: 'You will read texts such as e-mails, notices, articles, and chat messages, alone or in groups of two '
    + 'or three. Each text or group is followed by several questions. Choose the best answer: (A), (B), (C), or (D).',
});

/**
 * Thể loại văn bản theo cách đề thật gọi, suy từ nhãn tự do của nội dung ("Email from PackSmart Inc.",
 * "MEMORANDUM", "Group Chat"…). Không nhận ra thì trả về "text" — đúng chữ đề thật dùng khi không nêu loại.
 * Thứ tự quan trọng: "Email Response" phải ra e-mail trước khi xét "response"…
 * @param {string} label
 * @returns {string}
 */
export function genreOf(label) {
  const text = String(label ?? '').toLowerCase();
  const rules = [
    [/e-?mail/, 'e-mail'],
    [/memo/, 'memo'],
    [/chat|text message/, 'online chat discussion'],
    [/web ?page|website/, 'Web page'],
    [/press release/, 'press release'],
    [/article/, 'article'],
    [/advertisement|\bad\b/, 'advertisement'],
    [/announcement/, 'announcement'],
    [/notice/, 'notice'],
    [/letter/, 'letter'],
    [/form\b/, 'form'],
    [/review/, 'review'],
    [/invoice|receipt/, 'invoice'],
    [/schedule|itinerary|agenda/, 'schedule'],
    [/report|\blog\b|summary/, 'report'],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] ?? 'text';
}

/** "e-mail" · "e-mail and article" · "Web page, e-mail, and review" — cùng một loại thì gộp số nhiều. */
function listGenres(genres) {
  if (genres.length > 1 && genres.every((g) => g === genres[0])) return `${genres[0]}s`;
  if (genres.length <= 2) return genres.join(' and ');
  return `${genres.slice(0, -1).join(', ')}, and ${genres.at(-1)}`;
}

/**
 * Dòng giới thiệu của một bộ, như đề thật in/đọc trước mỗi bộ.
 * @param {{part: string, item: object}} unit - đơn vị bộ (Part 3, 4, 6, 7)
 * @param {number[]} numbers - số hiệu thật của các câu trong bộ
 * @returns {string} chuỗi rỗng nếu không phải bộ hoặc chưa có số hiệu
 */
export function setIntro(unit, numbers) {
  const list = numbers.filter(Number.isInteger);
  if (list.length === 0) return '';
  const range = list.length > 1 ? `Questions ${list[0]}–${list.at(-1)}` : `Question ${list[0]}`;
  const verb = list.length > 1 ? 'refer' : 'refers';
  const { part, item } = unit;
  let what;
  if (part === 'part3') {
    const speakers = new Set((item.script ?? []).map((turn) => turn.speaker)).size;
    what = speakers > 2 ? 'conversation with three speakers' : 'conversation';
  } else if (part === 'part4') what = 'talk';
  else if (item.passages?.length) what = listGenres(item.passages.map((p) => genreOf(p.label)));
  else return '';
  return `${range} ${verb} to the following ${what}.`;
}
