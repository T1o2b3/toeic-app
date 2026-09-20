/**
 * Mục Từ vựng (D36): mọi thứ liên quan đến học từ ở một chỗ — ôn thẻ, phân loại, ôn chủ động, kho từ, từ hay sai.
 * Trước đây các nút này nằm lẫn với bài thi ở màn chính.
 */
import { el, goTo } from './dom.js';
import { countUntriaged, reviewQueue, weakWords } from '../logic/vocab-state.js';
import { LEVEL_ORDER, LEVEL_INFO, countByLevel } from '../logic/vocab-levels.js';
import { estimateSessionTime, summarizeQueue } from '../logic/format.js';
import { getTier, setTier } from '../data/prefs.js';
import { TIER_ORDER, TIER_INFO, ALL_TIERS, filterByTier, untriagedByTier } from '../logic/deck-tiers.js';

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderVocab(store) {
  const states = store.states;
  const tier = getTier(TIER_ORDER);
  // Mọi con số ở màn này tính theo tầng đang chọn, để khớp với thứ màn học sẽ đưa ra.
  const entries = filterByTier(store.entries, tier);
  const { total, fresh, due } = summarizeQueue(reviewQueue(entries, states, {}));
  const untriaged = countUntriaged(entries, states);
  const weak = weakWords(states);
  const learning = [...states.values()].filter((s) => s.triaged && !s.known).length;
  const byLevel = countByLevel(states);
  const triagedCount = Object.values(byLevel).reduce((sum, count) => sum + count, 0);

  const stat = (value, label) => el('div', { class: 'stat' }, [
    el('div', { class: 'stat-value', text: String(value) }),
    el('div', { class: 'stat-label', text: label }),
  ]);
  const nav = (title, note, path, cls = 'secondary') => el('button', { class: cls, onClick: () => goTo(path) }, [
    el('span', { text: title }),
    el('small', { text: note }),
  ]);

  const sections = [
    el('h1', { text: 'Từ vựng' }),
    el('p', { class: 'subtitle', text: tier === ALL_TIERS
      ? `${store.entries.length} từ · ${(store.decks ?? [store.deck]).map((d) => d.deck).join(' + ')}`
      : `Tầng ${TIER_INFO[tier].label.toLowerCase()} · ${entries.length}/${store.entries.length} từ` }),
    renderSearchShortcut(),
    renderTierChooser(store, tier),
    el('div', { class: 'stats' }, [stat(due, 'đến hạn ôn'), stat(fresh, 'từ mới'), stat(learning, 'đang học')]),
  ];

  if (total > 0) {
    sections.push(nav('Ôn tập từ vựng', `${total} thẻ · ${estimateSessionTime(due, fresh)}`, '/review', 'primary'));
  } else if (untriaged > 0) {
    sections.push(el('p', { class: 'empty', text: 'Chưa có thẻ nào đến hạn. Phân loại thêm từ để bắt đầu học.' }));
  } else {
    sections.push(el('p', { class: 'empty', text: 'Xong hết rồi. Quay lại sau nhé.' }));
  }

  if (untriaged > 0) {
    const batch = Math.min(untriaged, 20);
    sections.push(nav('Phân loại từ vựng',
      `còn ${untriaged} từ · làm ${batch} từ · ~${Math.max(1, Math.round(batch * 4 / 60))} phút`, '/triage'));
  }
  if (triagedCount > 0) sections.push(nav('Ôn chủ động', 'tự chọn nhóm từ để kiểm tra lại trí nhớ', '/practice'));
  sections.push(nav('Kho từ vựng', triagedCount > 0
    ? `${triagedCount} từ đã phân loại · xem lại, lọc, đổi mức`
    : 'xem, lọc và đổi mức từng từ', '/words'));
  if (weak.length > 0) sections.push(nav('Từ hay sai', `${weak.length} từ cần để mắt`, '/weak'));
  if (store.captured.size > 0) {
    sections.push(nav('Từ đã gạt lúc làm bài', `${store.captured.size} từ gặp khi luyện Part 5 / nghe`, '/words?f=captured'));
  }

  if (triagedCount > 0) {
    // Mỗi dòng bấm được: nhảy thẳng tới danh sách từ ở mức đó trong kho.
    sections.push(el('div', { class: 'gaps' }, [
      el('div', { class: 'gaps-title', text: 'Đã phân loại tới đâu' }),
      ...LEVEL_ORDER.map((level) => el('button', {
        class: 'gap-row gap-link', onClick: () => goTo(`/words?f=${level}`),
      }, [
        el('span', { text: LEVEL_INFO[level].label }),
        el('span', { class: 'gap-value', text: `${byLevel[level]} từ ›` }),
      ])),
    ]));
  }
  return el('div', {}, sections);
}

/** Ô tìm nhanh: gõ rồi Enter để sang màn Tra từ với chuỗi đã gõ. */
function renderSearchShortcut() {
  const input = el('input', {
    class: 'field', type: 'search', placeholder: 'Tra một từ (tiếng Anh hoặc nghĩa tiếng Việt)…', 'aria-label': 'Tra từ',
  });
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || input.value.trim() === '') return;
    event.preventDefault();
    goTo(`/lookup?q=${encodeURIComponent(input.value.trim())}`);
  });
  return input;
}

/**
 * Chọn tầng từ vựng. Deck xếp theo tần suất nên mặc định màn phân loại bắt đầu từ từ dễ nhất;
 * ai đã ở mức 850 thì chọn thẳng tầng trên để khỏi cày lại 400 từ đã biết (xem deck-tiers.js).
 */
function renderTierChooser(store, current) {
  const counts = untriagedByTier(store.entries, store.states);
  const option = (value, label, note) => el('button', {
    class: value === current ? 'chip-btn active' : 'chip-btn',
    title: note,
    text: label,
    onClick: () => { setTier(value, TIER_ORDER); store.refresh(); },
  });

  return el('div', { class: 'chooser' }, [
    el('span', { class: 'chooser-label', text: 'Tầng từ' }),
    option(ALL_TIERS, 'Tất cả', 'không lọc gì'),
    ...TIER_ORDER.map((value) => option(
      value,
      `${TIER_INFO[value].label} (${counts[value]})`,
      `${TIER_INFO[value].hint} — còn ${counts[value]} từ chưa phân loại`,
    )),
  ]);
}
