/**
 * Chữ IN TRÊN ĐỀ và lời BĂNG ĐỌC của thi thử (D67, D69): phần hướng dẫn (Directions) đầu mỗi Part, dòng giới thiệu
 * mỗi bộ ("Questions 147–148 refer to the following e-mail.") và lời đọc từng câu hỏi Part 3/4. Hàm thuần, không đụng DOM.
 *
 * Viết bằng tiếng Anh vì đề thật toàn tiếng Anh — quen mặt chữ là một phần của luyện thi. Lời hướng dẫn
 * do app TỰ VIẾT LẠI ý, không chép nguyên văn của ETS (ràng buộc #7).
 *
 * Giọng đọc do pipeline sinh sẵn (`pipeline/build-narration.js` → `public/content/narration.json`: lời → MP3), tra
 * theo ĐÚNG chuỗi chữ ở đây — vì vậy app và pipeline cùng lấy chữ từ file này, không ai tự gõ lại.
 */
import { audioUrl } from './listen.js';
import { EXAM_SPEC } from './exam.js';
import { PART_FIRST_NUMBER } from './exam-time.js';

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

/** Bộ là gì theo cách đề thật gọi: "conversation", "talk", "e-mail and article"… Rỗng nếu không phải bộ. */
function describeSet({ part, item }) {
  if (part === 'part3') {
    const speakers = new Set((item.script ?? []).map((turn) => turn.speaker)).size;
    return speakers > 2 ? 'conversation with three speakers' : 'conversation';
  }
  if (part === 'part4') return 'talk';
  return item.passages?.length ? listGenres(item.passages.map((p) => genreOf(p.label))) : '';
}

/** "Questions 32–34 refer to the following conversation." — lời ĐỌC thì "32 through 34" như băng thật. */
function introLine(what, list, spoken) {
  if (!what || list.length === 0) return '';
  const range = list.length === 1 ? `Question ${list[0]}`
    : `Questions ${list[0]}${spoken ? ' through ' : '–'}${list.at(-1)}`;
  return `${range} ${list.length > 1 ? 'refer' : 'refers'} to the following ${what}.`;
}

/**
 * Dòng giới thiệu của một bộ, như đề thật in/đọc trước mỗi bộ.
 * @param {{part: string, item: object}} unit - đơn vị bộ (Part 3, 4, 6, 7)
 * @param {number[]} numbers - số hiệu thật của các câu trong bộ
 * @param {{spoken?: boolean}} [options] - `spoken`: bản để ĐỌC ("32 through 34") — cũng là khoá tra giọng đọc
 * @returns {string} chuỗi rỗng nếu không phải bộ hoặc chưa có số hiệu
 */
export function setIntro(unit, numbers, { spoken = false } = {}) {
  return introLine(describeSet(unit), numbers.filter(Number.isInteger), spoken);
}

/** Khoảng trả lời sau khi băng đọc mỗi câu hỏi Part 3/4 — đề thật cho 8 giây (D69). */
export const QUESTION_PAUSE_MS = 8000;

/**
 * Mọi lời băng có thể đọc — danh sách pipeline sinh giọng đọc. Câu giới thiệu bộ phụ thuộc số hiệu (bộ nào rơi vào
 * vị trí nào đổi theo từng đề) nên sinh cho MỌI vị trí bộ 3 câu của Part 3 (32–70) và Part 4 (71–100).
 * @param {Record<number, object[]>} sets - bộ theo Part: {3: [...], 4: [...]}
 * @returns {string[]} không trùng lặp
 */
export function narrationTexts(sets) {
  const texts = new Set(['part2', 'part3', 'part4'].map((part) => PART_DIRECTIONS[part]));
  const kinds = { part3: ['conversation', 'conversation with three speakers'], part4: ['talk'] };
  for (const [part, whats] of Object.entries(kinds)) {
    const first = PART_FIRST_NUMBER[part];
    for (let n = first; n + 3 <= first + EXAM_SPEC[part].questions; n += 3) {
      for (const what of whats) texts.add(introLine(what, [n, n + 1, n + 2], true));
    }
  }
  for (const set of [...(sets[3] ?? []), ...(sets[4] ?? [])]) {
    if (set.status === 'retired') continue;
    for (const question of set.questions) texts.add(question.stem);
  }
  return [...texts];
}

/**
 * Các đoạn băng đọc thêm quanh phần nghe của một đơn vị (D69): hướng dẫn đầu Part → câu giới thiệu bộ → [phần nghe]
 * → đọc từng câu hỏi Part 3/4, mỗi câu 8 giây trả lời. Lời nào chưa có giọng đọc thì bỏ qua — băng vẫn chạy như cũ.
 * @param {{kind: string, part: string, item: object, questions: object[]}} unit
 * @param {number[]} numbers - số hiệu thật các câu của đơn vị
 * @param {Record<string, string>} clips - lời → đường dẫn MP3 (narration.json)
 * @param {{partStart?: boolean}} [options] - đơn vị mở đầu một Part thì đọc hướng dẫn
 * @returns {{before: object[], after: object[], directions: boolean, narrated: boolean}} `narrated`: đã đọc đủ câu hỏi
 *   kèm khoảng trả lời — hết băng là sang câu sau luôn, không đếm thêm.
 */
export function narrationSteps(unit, numbers, clips, { partStart = false } = {}) {
  const clip = (key, text) => (text && clips[text] ? { type: 'clip', key, src: audioUrl(clips[text]) } : null);
  const before = [];
  const directions = partStart ? clip('directions', PART_DIRECTIONS[unit.part]) : null;
  if (directions) before.push(directions, { type: 'gap', ms: 1000 });
  const intro = unit.kind === 'set' ? clip('intro', setIntro(unit, numbers, { spoken: true })) : null;
  if (intro) before.push(intro, { type: 'gap', ms: 600 });

  const reads = unit.kind === 'set' ? unit.questions.map((question, i) => clip(`q${i}`, question.stem)) : [];
  const narrated = reads.length > 0 && reads.every(Boolean);
  const after = narrated ? reads.flatMap((read) => [{ type: 'gap', ms: 900 }, read, { type: 'gap', ms: QUESTION_PAUSE_MS }]) : [];
  return { before, after, directions: Boolean(directions), narrated };
}
