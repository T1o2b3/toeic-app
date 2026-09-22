/**
 * Kho từ vựng: xem lại mọi từ theo mức đã chấm, tìm kiếm, và đổi mức khi chấm nhầm (D32).
 * 
 * UI Overhaul: Sử dụng cấu trúc Master-Detail. 
 * Danh sách bên trái (hoặc trên), chi tiết bên phải (hoặc dưới) để tránh nhảy trang.
 */
import { el } from './dom.js';
import { backLink } from './blocks.js';
import { LEVEL_ORDER, LEVEL_INFO, payloadForLevel } from '../logic/vocab-levels.js';
import {
  FILTERS, FILTER_ORDER, normalizeFilter, filterWords, countByFilter, fold,
} from '../logic/word-library.js';
import { splitCaptured } from '../logic/capture.js';
import { renderWordDetail } from './word-detail.js';

const PAGE_SIZE = 40;

const FILTER_LABEL = {
  [FILTERS.ALL]: 'Tất cả',
  [FILTERS.UNTRIAGED]: 'Chưa phân loại',
  [FILTERS.BOOKMARKED]: '★ Đánh dấu',
  [FILTERS.CAPTURED]: 'Đã gạt',
  ...Object.fromEntries(LEVEL_ORDER.map((level) => [level, LEVEL_INFO[level].label])),
};

let filter = null;
let query = '';
let shown = PAGE_SIZE;
let openId = null;

export function renderWords(store, params) {
  if (filter === null) filter = normalizeFilter(params?.get('f'));
  
  // Xử lý tự động mở một từ nếu có param ?open=ID
  const openParam = params?.get('open');
  if (openParam) openId = openParam;

  const counts = countByFilter(store.entries, store.states, { capturedTotal: store.captured?.size ?? 0 });

  const search = el('input', {
    class: 'field', type: 'search', placeholder: 'Tìm từ hoặc nghĩa…', value: query,
  });
  search.addEventListener('input', () => {
    query = search.value;
    shown = PAGE_SIZE;
    openId = null;
    store.refresh();
  });

  const listContainer = el('div', { class: 'vocab-main' });
  const list = el('div', { class: 'word-list' });
  const summary = el('p', { class: 'subtitle' });
  
  const fill = () => {
    const { entryIds, unmatched } = splitCaptured(store.captured ?? new Map(), store.wordIndex);
    const matches = filterWords(store.entries, store.states, { filter, query, capturedIds: entryIds });
    const visible = matches.slice(0, shown);
    const orphans = filter === FILTERS.CAPTURED ? unmatchedRows(unmatched) : [];

    summary.textContent = query.trim() === ''
      ? 'Bấm vào một từ để xem chi tiết và đổi mức.'
      : `${matches.length + orphans.length} từ khớp “${query.trim()}”.`;

    const rows = visible.map((entry) => renderRow(store, entry));
    rows.push(...orphans.map(renderOrphanRow));

    if (matches.length === 0 && orphans.length === 0) {
      rows.push(el('p', { class: 'empty', text: emptyText() }));
    } else if (matches.length > visible.length) {
      rows.push(el('button', { class: 'secondary', onClick: () => { shown += PAGE_SIZE; fill(); } }, [
        el('span', { text: `Hiện thêm ${Math.min(PAGE_SIZE, matches.length - visible.length)} từ` }),
        el('small', { text: `đang hiện ${visible.length}/${matches.length}` }),
      ]));
    }
    list.replaceChildren(...rows);
  };

  fill();

  const detailPanel = el('div', { class: 'word-detail-panel' });
  const updateDetail = () => {
    if (!openId) {
      detailPanel.innerHTML = '';
      return;
    }
    const entry = store.entries.find(e => e.id === openId);
    if (!entry) return;
    const state = store.states.get(entry.id);
    const level = state?.triaged ? state.level : null;
    
    detailPanel.replaceChildren(renderWordDetail(store, entry, state, level));
  };
  updateDetail();

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      backLink('vocab'),
      el('span', { class: 'progress', text: `${counts[FILTERS.ALL]} từ trong kho` }),
    ]),
    el('h1', { text: 'Kho từ vựng' }),
    search,
    summary,
    el('div', { class: 'filters' }, FILTER_ORDER.map((key) => el('button', {
      class: key === filter ? 'chip-btn active' : 'chip-btn',
      text: `${FILTER_LABEL[key]} ${counts[key]}`,
      onClick: () => { filter = key; shown = PAGE_SIZE; openId = null; store.refresh(); },
    }))),
    el('div', { class: 'vocab-layout' }, [
      el('div', { class: 'vocab-list-wrap' }, list),
      detailPanel,
    ]),
  ]);
}

function unmatchedRows(unmatched) {
  const needle = fold(query);
  return unmatched
    .filter((item) => needle === '' || fold(item.word).includes(needle))
    .sort((a, b) => b.count - a.count || b.lastTs - a.lastTs);
}

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

function renderRow(store, entry) {
  const state = store.states.get(entry.id);
  const level = state?.triaged ? state.level : null;
  const open = openId === entry.id;

  const head = el('button', {
    class: open ? 'word-head open' : 'word-head',
    onClick: () => { openId = open ? null : entry.id; store.refresh(); },
  }, [
    el('span', { class: 'wh-main' }, [
      el('strong', { text: entry.word }),
      state?.bookmarked ? el('span', { class: 'star', text: '★' }) : '',
      el('span', {
        class: level ? `lvl ${LEVEL_INFO[level].css}` : 'lvl none',
        text: level ? LEVEL_INFO[level].label : 'chưa phân loại',
      }),
    ]),
    el('small', { text: entry.vi }),
  ]);

  return el('div', { class: 'word-row' }, [head]);
}

export function resetWords() {
  filter = null;
  query = '';
  shown = PAGE_SIZE;
  openId = null;
}
