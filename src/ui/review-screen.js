/**
 * Màn ôn thẻ (D66): hiện từ → CHỌN nghĩa đúng trong 4 lựa chọn → lộ đúng/sai, giải thích và lần ôn kế tiếp.
 * Chọn đúng = "Tốt", chọn sai = "Quên" (lịch FSRS tính bằng ngày — D66). Phím 1–4 / A–D chọn, Space sang thẻ kế.
 */
import { el, goTo } from './dom.js';
import { backButton, backLink, sessionDone, letterFromKey } from './blocks.js';
import { reviewQueue, reviewCounts } from '../logic/vocab-state.js';
import { reviewProgress } from '../logic/round.js';
import { TIER_ORDER, studyEntries } from '../logic/deck-tiers.js';
import { randomSeed, onceShuffled } from '../logic/shuffle.js';
import { buildChoice } from '../logic/vocab-choice.js';
import { getTier } from '../data/prefs.js';
import { previewIntervals, GRADES } from '../logic/scheduler.js';
import { formatDuration } from '../logic/format.js';
import { renderChoiceCard } from './word-detail.js';

/** Hạn mức từ MỚI mỗi lượt — không nhồi quá nhiều thứ mới một lúc (D03). */
const NEW_PER_ROUND = 10;

/** Chữ cái vừa chọn; null = chưa trả lời thẻ đang hiện. */
let picked = null;

/** Thẻ đang xem kết quả — phải giữ lại, vì ghi xong thì nó rời hàng đợi (hết đến hạn). */
let locked = null;

/** "3 ngày" — lần ôn kế tiếp của thẻ vừa trả lời. */
let nextIn = '';

/** Cả bộ từ + cụm, để rút phương án nhiễu. Cập nhật mỗi lần vẽ. */
let allCards = [];

/** Câu trắc nghiệm của thẻ đang hiện, dựng MỘT lần (vẽ lại không đổi phương án). */
const shown = onceShuffled((entry) => ({ id: entry.id, ...buildChoice(entry, allCards) }));

/**
 * Từ MỚI đã đưa ra trong lượt này. Không có nó thì hạn mức maxNew vô tác dụng:
 * học xong một từ mới, từ mới kế tiếp lấp ngay vào chỗ trống nên lượt kéo dài vô tận
 * và bộ đếm đứng yên ở 10 (xem src/logic/round.js).
 */
let newThisRound = new Set();

/** Số thẻ đã chấm trong lượt này — màn kết thúc cần đếm VIỆC ĐÃ LÀM, không lấy độ dài hàng đợi (quy tắc #7). */
let gradedThisRound = 0;

/** Số từ mới còn được phép đưa ra trong lượt này. */
function newLeft() {
  return Math.max(0, NEW_PER_ROUND - newThisRound.size);
}

/** Hạt giống thứ tự của lượt (D65): thẻ xáo ngẫu nhiên, từ mới xen giữa thẻ đến hạn, mỗi lượt một thứ tự. */
let seed = randomSeed();

/**
 * Hàng đợi của lượt hiện tại: từ vựng (đã lọc theo tầng) CỘNG cụm từ, chung một hàng — lịch FSRS tính theo
 * từng thẻ nên trộn không làm sai lịch thẻ nào. Hết hạn mức từ mới thì chỉ còn thẻ đến hạn.
 */
const studyList = (store) => studyEntries(store.entries, getTier(TIER_ORDER), store.collocationCards ?? []);

function roundQueue(store) {
  return reviewQueue(studyList(store), store.states, { maxNew: newLeft(), seed });
}

/** Thẻ đang hiện: thẻ vừa trả lời (đang xem kết quả), hoặc đầu hàng đợi. */
function currentItem(store) {
  return locked ?? roundQueue(store)[0] ?? null;
}

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderReview(store) {
  const counts = reviewCounts(studyList(store), store.states);
  const { remaining } = reviewProgress({
    dueCount: counts.due,
    newAvailable: counts.fresh,
    newPerRound: NEW_PER_ROUND,
    newDoneCount: newThisRound.size,
  });
  allCards = [...store.entries, ...(store.collocationCards ?? [])];
  const item = currentItem(store);
  if (!item) return renderDone(store, counts);

  const { entry, state } = item;
  const choice = shown.get(entry);
  const right = picked === choice.answer;
  const verdict = right
    ? `Đúng — ôn lại sau ${nextIn}`
    : `Sai — đáp án: ${choice.options[choice.answer]} · ôn lại sau ${nextIn}`;

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      backLink('vocab'),
      el('span', { class: 'progress', text: `còn ${remaining} thẻ` }),
    ]),
    ...renderChoiceCard(store, entry, choice, {
      picked, verdict, onPick: (letter) => pick(store, item, choice, letter),
      hint: state.lapses > 0 && !picked ? `Đã quên ${state.lapses} lần — nghĩa là gì?` : undefined,
    }),
    picked ? el('div', { class: 'actions' }, [
      el('button', { class: 'primary', onClick: () => next(store) }, [el('span', { text: 'Thẻ tiếp' }), el('small', { text: 'phím Space' })]),
    ]) : '',
    renderBookmark(store, entry, state),
  ]);
}

/** Màn kết thúc: hết hạn mức từ mới của lượt, hoặc thật sự không còn gì đến hạn. */
function renderDone(store, counts) {
  const moreNew = counts.fresh > 0 && newLeft() === 0;
  const learned = newThisRound.size;
  const actions = [];

  if (moreNew) {
    actions.push(el('button', { class: 'primary', onClick: () => { resetReview(); store.refresh(); } }, [
      el('span', { text: `Học thêm ${Math.min(NEW_PER_ROUND, counts.fresh)} từ mới` }),
      el('small', { text: `còn ${counts.fresh} từ mới trong kho` }),
    ]));
  }
  if (store.questions.length > 0) {
    actions.push(el('button', { class: moreNew ? 'secondary' : 'primary', onClick: () => goTo('/quiz') }, [
      el('span', { text: 'Làm tiếp Part 5' }),
      el('small', { text: 'phần còn lại của phiên hôm nay' }),
    ]));
  }
  actions.push(backButton('vocab'));

  return sessionDone({
    title: moreNew ? 'Xong lượt này' : 'Xong phiên này',
    headline: `${gradedThisRound} thẻ đã ôn`,
    note: learned > 0 ? `trong đó ${learned} từ mới` : 'đều là từ ôn lại',
    changed: moreNew
      ? `Còn ${counts.fresh} từ mới chưa học — để dành cho lần sau cũng được.`
      : 'Không còn thẻ nào đến hạn. Ôn dồn không giúp nhớ lâu hơn.',
    actions,
  });
}

/** Nút đánh dấu từ cần để ý lại sau. */
function renderBookmark(store, entry, state) {
  return el('div', { class: 'actions' }, [
    el('button', {
      class: state.bookmarked ? 'link active' : 'link',
      text: state.bookmarked ? '★ Bỏ đánh dấu' : '☆ Đánh dấu từ này',
      onClick: () => store.record('vocab.bookmarked', { wordId: entry.id, bookmarked: !state.bookmarked }),
    }),
  ]);
}

/** Chấm lựa chọn: đúng = "Tốt", sai = "Quên". Ghi xong thẻ vẫn hiện (khoá) để xem giải thích. */
async function pick(store, item, choice, letter) {
  if (picked) return;
  const grade = letter === choice.answer ? GRADES.GOOD : GRADES.AGAIN;
  picked = letter;
  locked = item;
  nextIn = formatDuration(previewIntervals(item.state.card)[grade]);
  gradedThisRound += 1;
  if (item.isNew) newThisRound.add(item.entry.id);
  await store.record('vocab.reviewed', { wordId: item.entry.id, grade });
}

/** Sang thẻ kế tiếp. */
function next(store) {
  picked = null;
  locked = null;
  shown.reset();
  store.refresh();
}

/**
 * Phím tắt: 1–4 hoặc A–D để chọn; chọn rồi thì Space/Enter sang thẻ kế.
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handleReviewKey(store, event) {
  const item = currentItem(store);
  if (!item) return;
  if (picked) {
    if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); next(store); }
    return;
  }
  const choice = shown.get(item.entry);
  const letter = letterFromKey(event, Object.keys(choice.options));
  if (letter) pick(store, item, choice, letter);
}

/** Đặt lại khi rời màn hoặc khi bắt đầu lượt mới. */
export function resetReview() {
  seed = randomSeed();
  picked = null;
  locked = null;
  shown.reset();
  newThisRound = new Set();
  gradedThisRound = 0;
}
