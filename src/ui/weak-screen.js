/**
 * Danh sách từ hay sai — chỗ Huy nhìn thấy lỗ hổng của mình.
 */
import { el, goTo } from './dom.js';
import { weakWords } from '../logic/vocab-state.js';

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderWeak(store) {
  const weak = weakWords(store.states, 50);
  const byId = new Map(store.entries.map((entry) => [entry.id, entry]));

  if (weak.length === 0) {
    return el('div', {}, [
      el('h1', { text: 'Từ hay sai' }),
      el('p', { class: 'empty', text: 'Chưa có từ nào bị quên. Ôn thêm vài phiên rồi quay lại.' }),
      el('button', { class: 'secondary', onClick: () => goTo('/') }, [el('span', { text: 'Về màn chính' })]),
    ]);
  }

  return el('div', {}, [
    el('div', { class: 'topbar' }, [
      el('button', { class: 'link', text: '← Về màn chính', onClick: () => goTo('/') }),
      el('span', { class: 'progress', text: `${weak.length} từ` }),
    ]),
    el('h1', { text: 'Từ hay sai' }),
    el('p', { class: 'subtitle', text: 'Xếp theo số lần bấm "Quên". Đây là lỗ hổng cần vá trước.' }),
    el('ul', { class: 'weak-list' }, weak.map((state) => {
      const entry = byId.get(state.wordId);
      return el('li', {}, [
        el('div', { class: 'weak-word' }, [
          el('strong', { text: entry?.word ?? state.wordId }),
          el('span', { class: 'badge', text: `quên ${state.lapses}×` }),
        ]),
        el('div', { class: 'weak-meaning', text: entry?.vi ?? '' }),
      ]);
    })),
  ]);
}
