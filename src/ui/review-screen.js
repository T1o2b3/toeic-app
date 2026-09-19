/**
 * Màn ôn thẻ: hiện từ -> tự nhớ -> lật thẻ -> tự chấm.
 * Mỗi nút chấm hiện luôn lần ôn kế tiếp (RESEARCH.md R3), phím tắt 1-4 và Space (R4).
 */
import { el, goTo } from './dom.js';
import { reviewQueue } from '../logic/vocab-state.js';
import { previewIntervals, GRADES } from '../logic/scheduler.js';
import { formatDuration } from '../logic/format.js';

/** Trạng thái chỉ của riêng màn này: đã lật thẻ hay chưa. */
let revealed = false;

const GRADE_LABELS = [
  [GRADES.AGAIN, 'Quên', 'again', '1'],
  [GRADES.HARD, 'Khó', 'hard', '2'],
  [GRADES.GOOD, 'Tốt', 'good', '3'],
  [GRADES.EASY, 'Dễ', 'easy', '4'],
];

/** Lấy thẻ đang ôn, hoặc null nếu hết. */
function currentItem(store) {
  return reviewQueue(store.entries, store.states, {})[0] ?? null;
}

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderReview(store) {
  const item = currentItem(store);

  if (!item) {
    revealed = false;
    return el('div', {}, [
      el('h1', { text: 'Xong phiên này' }),
      el('p', { class: 'empty', text: 'Không còn thẻ nào đến hạn. Ôn dồn không giúp nhớ lâu hơn.' }),
      store.questions.length > 0
        ? el('button', { class: 'primary', onClick: () => goTo('/quiz') }, [
            el('span', { text: 'Làm tiếp Part 5' }),
            el('small', { text: 'phần còn lại của phiên hôm nay' }),
          ])
        : '',
      el('button', { class: 'secondary', onClick: () => goTo('/') }, [el('span', { text: 'Về màn chính' })]),
    ]);
  }

  const { entry, state } = item;
  const remaining = reviewQueue(store.entries, store.states, {}).length;

  const front = el('div', { class: 'card big' }, [
    el('div', { class: 'word', text: entry.word }),
    entry.ipa ? el('div', { class: 'ipa', text: entry.ipa }) : '',
    el('div', { class: 'pos', text: (entry.pos ?? []).join(' · ') }),
    state.lapses > 0 ? el('div', { class: 'warn', text: `Đã quên ${state.lapses} lần` }) : '',
  ]);

  const children = [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Về màn chính', onClick: () => goTo('/') }),
      el('span', { class: 'progress', text: `còn ${remaining} thẻ` }),
    ]),
    front,
  ];

  if (!revealed) {
    children.push(
      el('div', { class: 'actions' }, [
        el('button', {
          class: 'primary',
          onClick: () => { revealed = true; store.refresh(); },
        }, [el('span', { text: 'Hiện nghĩa' }), el('small', { text: 'phím Space' })]),
      ]),
    );
  } else {
    children.push(renderBack(entry), renderGradeButtons(store, item));
  }

  children.push(renderBookmark(store, entry, state));
  return el('div', {}, children);
}

/** Mặt sau của thẻ: nghĩa, ví dụ, collocation, bẫy hay gặp. */
function renderBack(entry) {
  const parts = [el('div', { class: 'meaning', text: entry.vi })];

  for (const example of entry.examples ?? []) {
    parts.push(el('div', { class: 'example' }, [
      el('div', { class: 'en', text: example.en }),
      el('div', { class: 'vi', text: example.vi }),
    ]));
  }
  if (entry.collocations?.length) {
    parts.push(el('div', { class: 'chips' }, entry.collocations.map((c) => el('span', { class: 'chip', text: c }))));
  }
  if (entry.note) parts.push(el('div', { class: 'note', text: entry.note }));

  return el('div', { class: 'card back' }, parts);
}

/** Bốn nút chấm, mỗi nút kèm khoảng cách tới lần ôn kế tiếp. */
function renderGradeButtons(store, item) {
  const preview = previewIntervals(item.state.card);

  return el('div', { class: 'actions four' },
    GRADE_LABELS.map(([grade, label, className, key]) =>
      el('button', {
        class: `grade ${className}`,
        onClick: () => grade && submitGrade(store, item, grade),
      }, [
        el('span', { text: label }),
        el('small', { text: formatDuration(preview[grade]) }),
        el('kbd', { text: key }),
      ])),
  );
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

/** Ghi kết quả chấm rồi chuyển sang thẻ kế tiếp. */
async function submitGrade(store, item, grade) {
  revealed = false;
  await store.record('vocab.reviewed', { wordId: item.entry.id, grade });
}

/**
 * Phím tắt màn ôn: Space để lật, 1-4 để chấm (RESEARCH.md R4).
 * @param {object} store
 * @param {KeyboardEvent} event
 */
export function handleReviewKey(store, event) {
  const item = currentItem(store);
  if (!item) return;

  if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
    event.preventDefault();
    revealed = true;
    store.refresh();
    return;
  }
  if (!revealed) return;

  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault();
    submitGrade(store, item, GRADES.GOOD);
    return;
  }
  const match = GRADE_LABELS.find(([, , , key]) => key === event.key);
  if (match) submitGrade(store, item, match[0]);
}

/** Đặt lại trạng thái lật thẻ khi rời màn. */
export function resetReview() {
  revealed = false;
}
