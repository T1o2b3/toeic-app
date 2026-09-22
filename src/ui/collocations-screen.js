/**
 * Màn Collocations: Xem lại các cụm từ cố định trong toàn bộ deck.
 * Giúp người học nhận diện các "pattern" xuất hiện thường xuyên trong TOEIC.
 */
import { el } from './dom.js';
import { backLink } from './blocks.js';
import { getAllCollocations, filterCollocations, groupCollocations } from '../logic/collocations.js';

let query = '';
let selectedWord = null;

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderCollocations(store) {
  const all = getAllCollocations(store);
  const matches = filterCollocations(all, query);
  const groups = groupCollocations(matches);

  const search = el('input', {
    class: 'field', type: 'search', placeholder: 'Tìm cụm từ hoặc từ chính…', value: query,
  });
  search.addEventListener('input', () => {
    query = search.value;
    selectedWord = null;
    store.refresh();
  });

  const content = selectedWord 
    ? renderWordCollocations(groups, selectedWord)
    : renderGroups(groups);

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

/** Danh sách các từ chính có collocation. */
function renderGroups(groups) {
  if (groups.size === 0) return el('p', { class: 'empty', text: 'Không tìm thấy cụm từ nào.' });

  const rows = [...groups.keys()].sort((a, b) => a.localeCompare(b)).map((word) => {
    const count = groups.get(word).length;
    return el('div', { 
      class: 'word-row', 
      onClick: () => { selectedWord = word; window.location.hash = '#/collocations'; } // Trigger refresh
    }, [
      el('div', { class: 'word-head static' }, [
        el('strong', { text: word }),
        el('span', { class: 'lvl none', text: `${count} cụm` }),
      ]),
    ]);
  });

  return el('div', { class: 'colloc-list' }, rows);
}

/** Danh sách Collocations của một từ cụ thể. */
function renderWordCollocations(groups, word) {
  const collocations = groups.get(word) || [];
  
  return el('div', { class: 'colloc-detail' }, [
    el('button', { 
      class: 'link', 
      text: '← Quay lại danh sách', 
      onClick: () => { selectedWord = null; window.location.hash = '#/collocations'; } 
    }),
    el('h2', { text: `Cụm từ với "${word}"` }),
    el('div', { class: 'chips' }, collocations.map((c) => el('span', { class: 'chip', text: c.collocation }))),
    el('p', { class: 'footnote', text: 'Collocations giúp bạn hiểu nhanh ý nghĩa câu mà không cần phân tích từng từ.' }),
  ]);
}

export function resetCollocations() {
  query = '';
  selectedWord = null;
}
