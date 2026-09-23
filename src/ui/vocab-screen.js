/**
 * Mục Từ vựng (D36): mọi thứ liên quan đến học từ ở một chỗ — ôn thẻ, phân loại, ôn chủ động, kho từ, từ hay sai.
 * Trước đây các nút này nằm lẫn với bài thi ở màn chính.
 */
import { el, goTo } from './dom.js';
import { navGroup } from './blocks.js';
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
  if (!store || !store.entries) return el('div', { class: 'empty' }, [el('span', { text: 'Không có dữ liệu từ vựng.' })]);

  const states = store.states ?? new Map();
  const tier = getTier(TIER_ORDER);
  const entries = filterByTier(store.entries, tier);
  const collocCards = store.collocationCards ?? [];
  const { total, fresh, due } = summarizeQueue(reviewQueue([...entries, ...collocCards], states, {}));
  const untriaged = countUntriaged(entries, states);
  const weak = weakWords(states);
  const learning = [...states.values()].filter((s) => s.triaged && !s.known).length;
  const byLevel = countByLevel(states);
  const triagedCount = Object.values(byLevel).reduce((sum, count) => sum + count, 0);

  const stat = (value, label) => el('div', { class: 'stat' }, [
    el('div', { class: 'stat-value', text: String(value) }),
    el('div', { class: 'stat-label', text: label }),
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

  const batch = Math.min(untriaged, 20);
  // Cụm từ là thẻ học riêng, dùng chung lịch ôn với từ vựng nhưng học MỚI thì tách hẳn.
  const colloc = collocCards;
  const collocLeft = countUntriaged(colloc, states);
  const collocBatch = Math.min(collocLeft, 20);

  // Gộp theo VIỆC LÀM GÌ, không liệt kê phẳng: "Học" là thứ tốn công và tính vào tiến độ,
  // "Tra cứu" là thứ mở ra xem rồi đóng. Trước đây 8 nút to xếp dọc, trên điện thoại phải cuộn mãi.
  const hoc = [
    total > 0 && { title: 'Ôn tập', note: `${total} thẻ (từ + cụm) · ${estimateSessionTime(due, fresh)}`, path: '/review', primary: true },
    untriaged > 0 && { title: 'Phân loại từ vựng', note: `còn ${untriaged} · làm ${batch} từ · ~${Math.max(1, Math.round(batch * 4 / 60))} phút`, path: '/triage' },
    collocLeft > 0 && { title: 'Học cụm từ mới', note: `còn ${collocLeft} cụm · làm ${collocBatch} · ~${Math.max(1, Math.round(collocBatch * 5 / 60))} phút`, path: '/triage?kind=colloc' },
    triagedCount > 0 && { title: 'Ôn chủ động', note: 'tự chọn nhóm để kiểm tra lại trí nhớ', path: '/practice' },
  ];
  const traCuu = [
    { title: 'Kho từ vựng', note: triagedCount > 0 ? `${triagedCount} từ đã phân loại` : 'xem, lọc, đổi mức', path: '/words' },
    { title: 'Tra cụm từ', note: `${colloc.length} cụm TOEIC tuyển chọn`, path: '/collocations' },
    weak.length > 0 && { title: 'Từ hay sai', note: `${weak.length} từ cần để mắt`, path: '/weak' },
    store.captured?.size > 0 && { title: 'Từ đã gạt', note: `${store.captured.size} từ gặp khi làm bài`, path: '/words?f=captured' },
  ];

  if (total === 0) {
    sections.push(el('p', { class: 'empty', text: untriaged > 0
      ? 'Chưa có thẻ nào đến hạn. Phân loại thêm từ để bắt đầu học.'
      : 'Xong hết rồi. Quay lại sau nhé.' }));
  }
  sections.push(navGroup('Học', hoc), navGroup('Tra cứu & xem lại', traCuu));

  if (triagedCount > 0) {
    sections.push(el('details', { class: 'more-panel' }, [
      el('summary', { text: `Đã phân loại tới đâu (${triagedCount} từ)` }),
      el('div', { class: 'gaps' }, LEVEL_ORDER.map((level) => el('button', {
        class: 'gap-row gap-link', onClick: () => goTo(`/words?f=${level}`),
      }, [
        el('span', { text: LEVEL_INFO[level].label }),
        el('span', { class: 'gap-value', text: `${byLevel[level]} từ ›` }),
      ]))),
    ]));
  }
  return el('div', {}, sections);
}

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
