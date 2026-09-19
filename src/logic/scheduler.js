/**
 * Bọc thư viện FSRS sau một interface riêng (D26).
 * Phần còn lại của app CHỈ gọi các hàm ở đây, không import ts-fsrs trực tiếp —
 * nhờ vậy đổi thuật toán ôn tập sau này chỉ phải sửa một file.
 *
 * FSRS (Free Spaced Repetition Scheduler) là thuật toán quyết định "hôm nào nên ôn lại từ này":
 * nhớ tốt thì giãn khoảng cách ra, quên thì kéo gần lại. Trạng thái mỗi thẻ là một object nhỏ
 * (độ khó, độ bền trí nhớ, hạn ôn kế tiếp) — lưu được, tính lại được từ nhật ký sự kiện (D23).
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

/** Mức đánh giá khi ôn một thẻ, dùng trong toàn app (không lộ Rating của thư viện ra ngoài). */
export const GRADES = Object.freeze({
  AGAIN: 'again',
  HARD: 'hard',
  GOOD: 'good',
  EASY: 'easy',
});

const RATING_BY_GRADE = {
  [GRADES.AGAIN]: Rating.Again,
  [GRADES.HARD]: Rating.Hard,
  [GRADES.GOOD]: Rating.Good,
  [GRADES.EASY]: Rating.Easy,
};

/** Nhịp học của Huy là 1–2 giờ/tuần (D03) nên cho phép quên nhiều hơn một chút để hàng đợi không phình. */
const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true }));

/**
 * Trạng thái ban đầu của một từ chưa học.
 * @param {Date} [now]
 * @returns {object} thẻ FSRS ở dạng thuần dữ liệu (lưu vào IndexedDB / gửi qua mạng được)
 */
export function createNewCard(now = new Date()) {
  return toPlain(createEmptyCard(now));
}

/**
 * Tính trạng thái mới sau một lượt ôn.
 * @param {object} card - thẻ hiện tại (từ createNewCard hoặc lần ôn trước)
 * @param {string} grade - một giá trị trong GRADES
 * @param {Date} [now] - thời điểm ôn
 * @returns {object} thẻ mới
 */
export function reviewCard(card, grade, now = new Date()) {
  const rating = RATING_BY_GRADE[grade];
  if (!rating) throw new Error(`Mức đánh giá không hợp lệ: ${grade}`);
  const result = scheduler.next(fromPlain(card), now, rating);
  return toPlain(result.card);
}

/**
 * Thẻ đã đến hạn ôn chưa?
 * @param {object} card
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isDue(card, now = new Date()) {
  return new Date(card.due).getTime() <= now.getTime();
}

/**
 * Lọc và sắp xếp các thẻ đến hạn, quá hạn lâu nhất lên trước.
 * @param {Array<{card: object}>} items
 * @param {Date} [now]
 * @returns {Array<{card: object}>}
 */
export function dueItems(items, now = new Date()) {
  return items
    .filter((item) => isDue(item.card, now))
    .sort((a, b) => new Date(a.card.due) - new Date(b.card.due));
}

/**
 * Thẻ này đã từng được ôn lần nào chưa (để phân biệt từ mới với từ đang ôn).
 * @param {object} card
 * @returns {boolean}
 */
export function isNew(card) {
  return card.state === State.New;
}

/** Chuyển thẻ của thư viện về dữ liệu thuần: Date -> chuỗi ISO, lưu/đồng bộ được. */
function toPlain(card) {
  return { ...card, due: card.due.toISOString(), last_review: card.last_review?.toISOString() ?? null };
}

/** Chiều ngược lại của toPlain. */
function fromPlain(card) {
  return {
    ...card,
    due: new Date(card.due),
    last_review: card.last_review ? new Date(card.last_review) : undefined,
  };
}
