/**
 * Màn chính: cho biết hôm nay có gì để học, tốn bao lâu (RESEARCH.md R1, R2).
 */
import { el, goTo } from './dom.js';
import { countUntriaged, reviewQueue, weakWords } from '../logic/vocab-state.js';
import { LEVEL_ORDER, LEVEL_INFO, countByLevel } from '../logic/vocab-levels.js';
import { estimateSessionTime, summarizeQueue } from '../logic/format.js';
import { quizQueue, accuracyByErrorType } from '../logic/quiz.js';
import { LISTEN_ROUND_SIZE, estimateMinutes } from '../logic/listen.js';
import { planToday, describePlan } from '../logic/today.js';
import { buildExport, exportFileName } from '../logic/export.js';
import { isSupabaseConfigured } from '../data/supabase.js';
import { getRoundSize, setRoundSize, getTier, setTier } from '../data/prefs.js';
import { TIER_ORDER, TIER_INFO, ALL_TIERS, filterByTier, untriagedByTier } from '../logic/deck-tiers.js';
import { ROUND_SIZES } from '../logic/prefs.js';

/** Thời điểm build, do Vite nhúng vào (xem vite.config.js). */
const BUILD_TIME = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : 'dev';

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderHome(store) {
  const states = store.states;
  const tier = getTier(TIER_ORDER);
  // Mọi con số ở màn này tính theo tầng đang chọn, để khớp với thứ màn học sẽ đưa ra.
  const entries = filterByTier(store.entries, tier);
  const queue = reviewQueue(entries, states, {});
  const { total, fresh, due } = summarizeQueue(queue);
  const untriaged = countUntriaged(entries, states);
  const weak = weakWords(states);
  const learning = [...states.values()].filter((s) => s.triaged && !s.known).length;

  const stat = (value, label) =>
    el('div', { class: 'stat' }, [
      el('div', { class: 'stat-value', text: String(value) }),
      el('div', { class: 'stat-label', text: label }),
    ]);

  const sections = [
    el('h1', { text: 'Hôm nay học gì' }),
    el('p', { class: 'subtitle', text: tier === ALL_TIERS
      ? `${store.entries.length} từ · ${(store.decks ?? [store.deck]).map((d) => d.deck).join(' + ')}`
      : `Tầng ${TIER_INFO[tier].label.toLowerCase()} · ${entries.length}/${store.entries.length} từ` }),
    renderTierChooser(store, tier),
    el('div', { class: 'stats' }, [
      stat(due, 'đến hạn ôn'),
      stat(fresh, 'từ mới'),
      stat(learning, 'đang học'),
    ]),
  ];

  const plan = planToday({
    entries, states, questions: store.questions, quizStates: store.quizStates,
  });

  if (!plan.empty) {
    sections.push(
      el('button', { class: 'primary', onClick: () => goTo('/review') }, [
        el('span', { text: '15 phút hôm nay' }),
        el('small', { text: describePlan(plan) }),
      ]),
    );
  }

  if (total > 0) {
    sections.push(
      el('button', { class: 'secondary', onClick: () => goTo('/review') }, [
        el('span', { text: 'Ôn tập từ vựng' }),
        el('small', { text: `${total} thẻ · ${estimateSessionTime(due, fresh)}` }),
      ]),
    );
  } else if (untriaged > 0) {
    sections.push(el('p', { class: 'empty', text: 'Chưa có thẻ nào đến hạn. Phân loại thêm từ để bắt đầu học.' }));
  } else {
    sections.push(el('p', { class: 'empty', text: 'Xong hết rồi. Quay lại sau nhé.' }));
  }

  if (untriaged > 0) {
    const batch = Math.min(untriaged, 20);
    sections.push(
      el('button', { class: 'secondary', onClick: () => goTo('/triage') }, [
        el('span', { text: 'Phân loại từ vựng' }),
        el('small', { text: `còn ${untriaged} từ · làm ${batch} từ · ~${Math.max(1, Math.round(batch * 4 / 60))} phút` }),
      ]),
    );
  }

  const byLevel = countByLevel(states);
  const triagedCount = Object.values(byLevel).reduce((sum, count) => sum + count, 0);

  // Kho từ vựng + ôn chủ động (D32): chỗ nhìn lại và tự kiểm tra, tách khỏi luồng lướt một chiều.
  sections.push(
    el('button', { class: 'secondary', onClick: () => goTo('/words') }, [
      el('span', { text: 'Kho từ vựng' }),
      el('small', { text: triagedCount > 0
        ? `${triagedCount} từ đã phân loại · xem lại, tìm kiếm, đổi mức`
        : 'xem, tìm kiếm và đổi mức từng từ' }),
    ]),
  );
  if (triagedCount > 0) {
    sections.push(
      el('button', { class: 'secondary', onClick: () => goTo('/practice') }, [
        el('span', { text: 'Ôn chủ động' }),
        el('small', { text: 'tự chọn nhóm từ để kiểm tra lại trí nhớ' }),
      ]),
    );
  }

  if (triagedCount > 0) {
    // Mỗi dòng bấm được: nhảy thẳng tới danh sách từ ở mức đó trong kho.
    sections.push(el('div', { class: 'gaps' }, [
      el('div', { class: 'gaps-title', text: 'Đã phân loại tới đâu' }),
      ...LEVEL_ORDER.map((level) => el('button', {
        class: 'gap-row gap-link',
        onClick: () => goTo(`/words?f=${level}`),
      }, [
        el('span', { text: LEVEL_INFO[level].label }),
        el('span', { class: 'gap-value', text: `${byLevel[level]} từ ›` }),
      ])),
    ]));
  }

  if (weak.length > 0) {
    sections.push(
      el('button', { class: 'secondary', onClick: () => goTo('/weak') }, [
        el('span', { text: 'Từ hay sai' }),
        el('small', { text: `${weak.length} từ cần để mắt` }),
      ]),
    );
  }

  if (store.questions.length > 0) {
    const size = getRoundSize();
    const quiz = quizQueue(store.questions, store.quizStates, { size });
    sections.push(
      el('button', { class: 'secondary', onClick: () => goTo('/quiz') }, [
        el('span', { text: 'Luyện Part 5' }),
        el('small', { text: `${quiz.length} câu · ~${Math.max(1, Math.round(quiz.length * 25 / 60))} phút` }),
      ]),
      el('div', { class: 'chooser' }, [
        el('span', { class: 'chooser-label', text: 'Mỗi lượt' }),
        ...ROUND_SIZES.map((option) => el('button', {
          class: option === size ? 'chip-btn active' : 'chip-btn',
          text: String(option),
          onClick: () => { setRoundSize(option); store.refresh(); },
        })),
        el('span', { class: 'chooser-label', text: 'câu' }),
      ]),
    );

    const weakTypes = accuracyByErrorType(store.questions, store.quizStates)
      .filter((row) => row.attempts >= 3 && row.accuracy < 0.8)
      .slice(0, 3);
    if (weakTypes.length > 0) {
      sections.push(el('div', { class: 'gaps' }, [
        el('div', { class: 'gaps-title', text: 'Lỗ hổng theo loại kiến thức' }),
        ...weakTypes.map((row) => el('div', { class: 'gap-row' }, [
          el('span', { text: row.errorType }),
          el('span', { class: 'gap-value', text: `${Math.round(row.accuracy * 100)}% đúng (${row.attempts} câu)` }),
        ])),
      ]));
    }
  }

  if (store.listening.length > 0) {
    const round = quizQueue(store.listening, store.quizStates, { size: LISTEN_ROUND_SIZE });
    sections.push(
      el('button', { class: 'secondary', onClick: () => goTo('/listen') }, [
        el('span', { text: 'Luyện nghe Part 2' }),
        el('small', { text: `${round.length} câu · ~${estimateMinutes(round.length)} phút · nên đeo tai nghe` }),
      ]),
    );
    const weakListening = accuracyByErrorType(store.listening, store.quizStates)
      .filter((row) => row.attempts >= 3 && row.accuracy < 0.8)
      .slice(0, 3);
    if (weakListening.length > 0) {
      sections.push(el('div', { class: 'gaps' }, [
        el('div', { class: 'gaps-title', text: 'Lỗ hổng phần nghe' }),
        ...weakListening.map((row) => el('div', { class: 'gap-row' }, [
          el('span', { text: row.errorType }),
          el('span', { class: 'gap-value', text: `${Math.round(row.accuracy * 100)}% đúng (${row.attempts} câu)` }),
        ])),
      ]));
    }
  }

  sections.push(
    el('button', { class: 'secondary', onClick: () => goTo('/sync') }, [
      el('span', { text: 'Đồng bộ giữa các máy' }),
      el('small', { text: isSupabaseConfigured() ? 'Mac ↔ iPhone' : 'chưa cấu hình — dữ liệu chỉ ở máy này' }),
    ]),
    el('div', { class: 'actions' }, [
      el('button', {
        class: 'link',
        text: '⬇ Xuất dữ liệu ra file',
        onClick: () => downloadBackup(store),
      }),
    ]),
    el('p', { class: 'footnote', text: `${store.eventCount} sự kiện đã ghi trên máy này · bản ${BUILD_TIME}` }),
  );

  return el('div', {}, sections);
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

/** Tải nhật ký sự kiện về máy dưới dạng JSON (D25: tự sao lưu vì free tier không có backup). */
function downloadBackup(store) {
  const data = buildExport({ events: store.exportEvents(), deviceId: store.deviceId });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName();
  link.click();
  URL.revokeObjectURL(url);
}
