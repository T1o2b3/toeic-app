/**
 * Kho từ vựng: xem lại mọi từ theo mức đã chấm, tìm kiếm, và đổi mức khi chấm nhầm (D32).
 *
 * Màn phân loại chỉ lướt một chiều; đây là chỗ duy nhất nhìn được toàn bộ những gì đã chấm —
 * kể cả các từ "thành thạo" vốn bị loại khỏi hàng đợi học nên không bao giờ hiện lại ở đâu khác.
 */
import { el, goTo } from './dom.js';
import { LEVEL_ORDER, LEVEL_INFO, payloadForLevel } from '../logic/vocab-levels.js';
import {
  FILTERS, FILTER_ORDER, normalizeFilter, filterWords, countByFilter, fold,
} from '../logic/word-library.js';
import { splitCaptured } from '../logic/capture.js';
import { renderWordBack } from './word-detail.js';

/** Số dòng hiện mỗi lần — deck có hàng nghìn từ, vẽ hết một lượt sẽ chậm trên điện thoại. */
const PAGE_SIZE = 40;

/** Cùng bảng màu với màn phân loại để nhìn là nhận ra mức. */
const LEVEL_CLASS = { unknown: 'again', context: 'hard', spelling: 'good', fluent: 'easy' };

const FILTER_LABEL = {
  [FILTERS.ALL]: 'Tất cả',
  [FILTERS.UNTRIAGED]: 'Chưa phân loại',
  [FILTERS.BOOKMARKED]: '★ Đánh dấu',
  [FILTERS.CAPTURED]: 'Đã gạt',
  ...Object.fromEntries(LEVEL_ORDER.map((level) => [level, LEVEL_INFO[level].label])),
};

// Trạng thái riêng của màn này. Giữ ở đây (không trong DOM) vì mỗi lần ghi sự kiện thì cả màn được vẽ lại.
let filter = null;      // null = chưa khởi tạo, sẽ đọc từ địa chỉ #/words?f=...
let query = '';
let shown = PAGE_SIZE;
let openId = null;

/**
 * @param {object} store
 * @param {URLSearchParams} [params]
 * @returns {HTMLElement}
 */
export function renderWords(store, params) {
  if (filter === null) filter = normalizeFilter(params?.get('f'));
  const counts = countByFilter(store.entries, store.states, { capturedTotal: store.captured.size });

  const summary = el('p', { class: 'subtitle' });
  const list = el('div', { class: 'word-list' });
  const fill = () => fillList(store, list, summary, fill);
  fill();

  // Gõ tìm kiếm chỉ vẽ lại danh sách, không vẽ lại cả màn — vẽ lại cả màn sẽ mất ô nhập đang gõ dở.
  const search = el('input', {
    class: 'field', type: 'search', placeholder: 'Tìm từ hoặc nghĩa…', value: query, 'aria-label': 'Tìm từ',
  });
  search.addEventListener('input', () => {
    query = search.value;
    shown = PAGE_SIZE;
    openId = null;
    fill();
  });

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Về màn chính', onClick: () => goTo('/') }),
      el('span', { class: 'progress', text: `${counts[FILTERS.ALL]} từ trong kho` }),
    ]),
    el('h1', { text: 'Kho từ vựng' }),
    summary,
    search,
    el('div', { class: 'filters' }, FILTER_ORDER.map((key) => el('button', {
      class: key === filter ? 'chip-btn active' : 'chip-btn',
      text: `${FILTER_LABEL[key]} ${counts[key]}`,
      onClick: () => { filter = key; shown = PAGE_SIZE; openId = null; store.refresh(); },
    }))),
    list,
  ]);
}

/** Vẽ (lại) phần danh sách theo bộ lọc + từ khoá hiện tại. */
function fillList(store, list, summary, refill) {
  const { entryIds, unmatched } = splitCaptured(store.captured, store.wordIndex);
  const matches = filterWords(store.entries, store.states, { filter, query, capturedIds: entryIds });
  const visible = matches.slice(0, shown);
  // Từ đã gạt mà deck chưa có: chỉ hiện ở bộ lọc "Đã gạt", lọc theo từ khoá như các dòng khác.
  const orphans = filter === FILTERS.CAPTURED ? unmatchedRows(unmatched) : [];

  summary.textContent = query.trim() === ''
    ? 'Bấm vào một từ để xem chi tiết và đổi mức.'
    : `${matches.length + orphans.length} từ khớp “${query.trim()}”.`;

  const rows = visible.map((entry) => renderRow(store, entry, refill));
  rows.push(...orphans.map(renderOrphanRow));

  if (matches.length === 0 && orphans.length === 0) {
    rows.push(el('p', { class: 'empty', text: emptyText() }));
  } else if (matches.length > visible.length) {
    rows.push(el('button', { class: 'secondary', onClick: () => { shown += PAGE_SIZE; refill(); } }, [
      el('span', { text: `Hiện thêm ${Math.min(PAGE_SIZE, matches.length - visible.length)} từ` }),
      el('small', { text: `đang hiện ${visible.length}/${matches.length}` }),
    ]));
  }
  list.replaceChildren(...rows);
}

/** Từ đã gạt chưa có trong deck, gặp nhiều lần nhất lên đầu, lọc theo từ khoá. */
function unmatchedRows(unmatched) {
  const needle = fold(query);
  return unmatched
    .filter((item) => needle === '' || fold(item.word).includes(needle))
    .sort((a, b) => b.count - a.count || b.lastTs - a.lastTs);
}

/** Dòng cho từ đã gạt mà deck chưa có: chưa có nghĩa nên chỉ có nút tra ngoài. */
function renderOrphanRow(item) {
  return el('div', { class: 'word-row orphan' }, [
    el('div', { class: 'word-head static' }, [
      el('span', { class: 'wh-main' }, [
        el('strong', { text: item.word }),
        el('span', { class: 'lvl none', text: 'chưa có trong deck' }),
      ]),
      el('small', { text: `gặp ${item.count} lần trong ${item.questionIds.length} câu` }),
      el('a', {
        class: 'ext-link', href: `https://en.wiktionary.org/wiki/${encodeURIComponent(item.word)}`,
        target: '_blank', rel: 'noopener', text: 'Tra nghĩa ↗',
      }),
    ]),
  ]);
}

function emptyText() {
  if (query.trim() !== '') return 'Không có từ nào khớp.';
  if (filter === FILTERS.CAPTURED) return 'Chưa gạt từ nào. Khi làm Part 5, chạm vào một từ lạ trong câu để thêm vào đây.';
  if (filter === FILTERS.BOOKMARKED) return 'Chưa đánh dấu từ nào. Mở một từ rồi bấm ☆ để đánh dấu.';
  if (filter === FILTERS.UNTRIAGED) return 'Đã phân loại hết mọi từ.';
  return 'Chưa có từ nào ở nhóm này.';
}

/** Một dòng: bấm để mở ra chi tiết + đổi mức. */
function renderRow(store, entry, refill) {
  const state = store.states.get(entry.id);
  const level = state?.triaged ? state.level : null;
  const open = openId === entry.id;

  const head = el('button', {
    class: open ? 'word-head open' : 'word-head',
    'aria-expanded': String(open),
    onClick: () => { openId = open ? null : entry.id; refill(); },
  }, [
    el('span', { class: 'wh-main' }, [
      el('strong', { text: entry.word }),
      state?.bookmarked ? el('span', { class: 'star', text: '★' }) : '',
      el('span', {
        class: level ? `lvl ${LEVEL_CLASS[level]}` : 'lvl none',
        text: level ? LEVEL_INFO[level].label : 'chưa phân loại',
      }),
    ]),
    el('small', { text: entry.vi }),
  ]);

  return el('div', { class: 'word-row' }, open ? [head, renderDetail(store, entry, state, level)] : [head]);
}

/** Phần mở rộng: nội dung thẻ, chọn lại mức, đánh dấu. */
function renderDetail(store, entry, state, level) {
  return el('div', { class: 'word-detail' }, [
    entry.ipa || entry.pos?.length
      ? el('div', { class: 'pos', text: [entry.ipa, (entry.pos ?? []).join(' · ')].filter(Boolean).join('  ') })
      : '',
    renderWordBack(entry),
    el('div', { class: 'gaps-title', text: 'Bạn dùng được từ này tới mức nào?' }),
    el('div', { class: 'level-picker' }, LEVEL_ORDER.map((option) => el('button', {
      class: `grade ${LEVEL_CLASS[option]}${option === level ? ' chosen' : ''}`,
      onClick: () => setLevel(store, entry, level, option),
    }, [
      el('span', { text: LEVEL_INFO[option].label }),
      el('small', { text: LEVEL_INFO[option].hint }),
    ]))),
    el('div', { class: 'actions' }, [
      el('button', {
        class: state?.bookmarked ? 'link active' : 'link',
        text: state?.bookmarked ? '★ Bỏ đánh dấu' : '☆ Đánh dấu từ này',
        onClick: () => store.record('vocab.bookmarked', { wordId: entry.id, bookmarked: !state?.bookmarked }),
      }),
    ]),
  ]);
}

/**
 * Đổi mức của một từ. Ghi thêm một sự kiện phân loại mới (sự kiện sau thắng); nhật ký cũ
 * không bị sửa. Chọn lại đúng mức đang có thì không ghi gì để nhật ký khỏi phình vô ích.
 */
async function setLevel(store, entry, current, next) {
  if (current === next) return;
  await store.record('vocab.triaged', payloadForLevel(entry.id, next));
}

/** Đặt lại khi rời màn. */
export function resetWords() {
  filter = null;
  query = '';
  shown = PAGE_SIZE;
  openId = null;
}
