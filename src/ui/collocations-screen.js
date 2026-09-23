/**
 * Màn Collocations: Xem lại các cụm từ cố định trong toàn bộ deck.
 * Thiết kế mới: Chia theo chủ đề và làm nổi bật các cụm từ thiết yếu (Essential).
 */
import { el, goTo } from './dom.js';
import { backLink } from './blocks.js';
import { 
  getAllCollocations, 
  filterCollocations, 
  groupCollocationsByTheme, 
  getEssentialCollocations 
} from '../logic/collocations.js';

let query = '';
let activeTheme = null;

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderCollocations(store) {
  const all = getAllCollocations(store);

  const content = el('div', {});   // hộp chứa để vẽ lại riêng phần nội dung
  const fill = () => {
    const matches = filterCollocations(all, query);
    const themes = groupCollocationsByTheme(matches);
    content.replaceChildren(activeTheme
      ? renderThemeDetail(themes, activeTheme, fill)
      : renderThemeList(themes, getEssentialCollocations(matches), fill));
  };
  fill();

  // Gõ tìm kiếm chỉ vẽ lại phần nội dung, KHÔNG vẽ lại cả màn — vẽ lại cả màn dựng ô nhập mới nên
  // con trỏ nhảy ra ngoài và chỉ gõ được một chữ cái mỗi lần.
  const search = el('input', {
    class: 'field', type: 'search', placeholder: 'Tìm cụm từ hoặc từ chính…', value: query,
    'aria-label': 'Tìm cụm từ',
  });
  search.addEventListener('input', () => {
    query = search.value;
    activeTheme = null;
    fill();
  });

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      backLink('vocab'),
      el('span', { class: 'progress', text: `${all.length} cụm từ` }),
    ]),
    el('h1', { text: 'Collocations' }),
    search,
    content,
  ]);
}

/** Màn chính: Danh sách chủ đề + Top Essential */
function renderThemeList(themes, essential, fill) {
  const sections = [];

  // 1. Phần Essential (Lọc ra những cụm cực kỳ quan trọng)
  if (essential.length > 0) {
    sections.push(el('div', { class: 'section' }, [
      el('div', { class: 'section-label', text: '🔥 Cụm từ thiết yếu' }),
      el('div', { class: 'chips' }, essential.slice(0, 12).map((c) => 
        renderCollocChip(c)
      )),
    ]));
  }

  // 2. Danh sách chủ đề
  sections.push(el('div', { class: 'section' }, [
    el('div', { class: 'section-label', text: 'Theo chủ đề' }),
    el('div', { class: 'colloc-categories' }, 
      [...themes.keys()].sort().map((theme) => {
        const count = themes.get(theme).length;
        return el('button', { 
          class: 'cat-btn', 
          // Gán `location.hash` bằng đúng giá trị đang có thì trình duyệt KHÔNG phát sự kiện
          // hashchange, nên màn không vẽ lại và bấm chủ đề trông như hỏng. Vẽ lại thẳng tay.
          onClick: () => { activeTheme = theme; fill(); },
        }, [
          el('span', { text: theme }),
          el('span', { class: 'cat-count', text: `${count} cụm` }),
        ]);
      })
    ),
  ]));

  return el('div', {}, sections);
}

/** Màn chi tiết: Tất cả cụm từ trong một chủ đề */
function renderThemeDetail(themes, theme, fill) {
  const collocations = themes.get(theme) || [];
  
  return el('div', { class: 'colloc-detail' }, [
    el('button', { 
      class: 'link', 
      text: '← Quay lại danh sách chủ đề', 
      onClick: () => { activeTheme = null; fill(); },
    }),
    el('h2', { text: `Chủ đề: ${theme}` }),
    el('div', { class: 'colloc-list' }, collocations.map((c) => 
      renderCollocItem(c)
    )),
  ]);
}

/** Render một chip nhỏ cho phần Essential */
function renderCollocChip(c) {
  return el('span', { 
    class: 'chip', 
    onClick: () => goTo(`/words?open=${c.entryId}`),
    style: 'cursor:pointer' 
  }, [
    el('span', { 
      style: 'font-weight:700; margin-right:4px', 
      text: c.word 
    }),
    el('span', { text: c.collocation }),
  ]);
}

/** Render một dòng cụm từ chi tiết */
function renderCollocItem(c) {
  return el('div', { 
    class: 'colloc-item', 
    onClick: () => goTo(`/words?open=${c.entryId}`) 
  }, [
    el('div', { class: 'colloc-main' }, [
      el('span', { class: 'colloc-word', text: c.word }),
      el('span', { class: 'colloc-phrase', text: c.collocation }),
    ]),
    el('span', { class: 'colloc-badge', text: 'Xem từ ›' }),
  ]);
}

export function resetCollocations() {
  query = '';
  activeTheme = null;
}
