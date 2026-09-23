/**
 * Màn Collocations: học theo CỤM. Mỗi cụm hiện nghĩa, câu ví dụ, và dạng SAI hay mắc
 * (`pay attention to` ✓ / `give attention to` ✗) — chỗ TOEIC thật sự bẫy.
 */
import { el } from './dom.js';
import { backLink } from './blocks.js';
import { filterCollocations, groupByTheme } from '../logic/collocations.js';

let query = '';
let activeTheme = null;

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderCollocations(store) {
  const all = store.collocations ?? [];

  const content = el('div', {});
  const fill = () => {
    const themes = groupByTheme(filterCollocations(all, query));
    content.replaceChildren(...renderBody(themes, fill));
  };
  fill();

  // Gõ tìm kiếm chỉ vẽ lại phần nội dung: vẽ lại cả màn sẽ dựng ô nhập mới và con trỏ nhảy ra ngoài.
  const search = el('input', {
    class: 'field', type: 'search', 'aria-label': 'Tìm cụm từ',
    placeholder: 'Tìm cụm, nghĩa, hoặc dạng sai đang mắc…', value: query,
  });
  search.addEventListener('input', () => {
    query = search.value;
    activeTheme = null;
    fill();
  });

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      backLink('vocab'),
      el('span', { class: 'progress', text: `${all.length} cụm tuyển chọn` }),
    ]),
    el('h1', { text: 'Collocations' }),
    el('p', { class: 'subtitle', text: 'Học nguyên cụm. Nhớ cụm thì không phải đoán động từ hay giới từ nào đi với nhau.' }),
    search,
    content,
  ]);
}

function renderBody(themes, fill) {
  if (themes.size === 0) {
    return [el('p', { class: 'empty', text: query.trim() === '' ? 'Chưa có nội dung cụm từ.' : `Không có cụm nào khớp “${query.trim()}”.` })];
  }
  // Đang tìm kiếm thì bày thẳng kết quả, không bắt bấm qua một lớp chủ đề nữa.
  const searching = query.trim() !== '';
  const current = searching ? null : activeTheme;

  if (current) {
    return [
      el('button', { class: 'link', text: '← Mọi nhóm', onClick: () => { activeTheme = null; fill(); } }),
      el('h2', { text: current }),
      el('div', { class: 'colloc-list' }, (themes.get(current) ?? []).map(renderCollocItem)),
    ];
  }
  if (searching) {
    return [...themes].flatMap(([theme, items]) => [
      el('div', { class: 'section-label', text: theme }),
      el('div', { class: 'colloc-list' }, items.map(renderCollocItem)),
    ]);
  }
  return [el('div', { class: 'colloc-categories' }, [...themes].map(([theme, items]) => el('button', {
    class: 'cat-btn',
    // Gán location.hash bằng đúng giá trị đang có thì trình duyệt KHÔNG phát hashchange,
    // nên màn không vẽ lại. Gọi thẳng hàm vẽ lại.
    onClick: () => { activeTheme = theme; fill(); },
  }, [
    el('span', { text: theme }),
    el('span', { class: 'cat-count', text: `${items.length} cụm` }),
  ])))];
}

/** Một cụm: cụm đúng, nghĩa, dạng sai hay mắc, và câu ví dụ. */
function renderCollocItem(c) {
  return el('div', { class: 'colloc-item' }, [
    el('div', { class: 'colloc-main' }, [
      el('span', { class: 'colloc-word', text: c.chunk }),
      el('span', { class: 'colloc-phrase', text: c.vi }),
      c.wrong ? el('span', { class: 'colloc-wrong', text: `✗ không dùng: ${c.wrong}` }) : '',
      c.example ? el('span', { class: 'colloc-ex', text: c.example }) : '',
    ]),
  ]);
}

export function resetCollocations() {
  query = '';
  activeTheme = null;
}
