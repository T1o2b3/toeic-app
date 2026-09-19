/**
 * Màn chính: cho biết hôm nay có gì để học, tốn bao lâu (RESEARCH.md R1, R2).
 */
import { el, goTo } from './dom.js';
import { triageQueue, reviewQueue, weakWords } from '../logic/vocab-state.js';
import { estimateSessionTime, summarizeQueue } from '../logic/format.js';
import { quizQueue, accuracyByErrorType } from '../logic/quiz.js';
import { planToday, describePlan } from '../logic/today.js';
import { buildExport, exportFileName } from '../logic/export.js';
import { isSupabaseConfigured } from '../data/supabase.js';
import { getRoundSize, setRoundSize } from '../data/prefs.js';
import { ROUND_SIZES } from '../logic/prefs.js';

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderHome(store) {
  const states = store.states;
  const queue = reviewQueue(store.entries, states, {});
  const { total, fresh, due } = summarizeQueue(queue);
  const untriaged = triageQueue(store.entries, states).length;
  const weak = weakWords(states);
  const learning = [...states.values()].filter((s) => s.triaged && !s.known).length;

  const stat = (value, label) =>
    el('div', { class: 'stat' }, [
      el('div', { class: 'stat-value', text: String(value) }),
      el('div', { class: 'stat-label', text: label }),
    ]);

  const sections = [
    el('h1', { text: 'Hôm nay học gì' }),
    el('p', { class: 'subtitle', text: `Deck ${store.deck.deck} · ${store.entries.length} từ` }),
    el('div', { class: 'stats' }, [
      stat(due, 'đến hạn ôn'),
      stat(fresh, 'từ mới'),
      stat(learning, 'đang học'),
    ]),
  ];

  const plan = planToday({
    entries: store.entries, states, questions: store.questions, quizStates: store.quizStates,
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
        el('span', { text: 'Phân loại từ đã biết / chưa biết' }),
        el('small', { text: `còn ${untriaged} từ · làm ${batch} từ · ~${Math.max(1, Math.round(batch * 4 / 60))} phút` }),
      ]),
    );
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
    el('p', { class: 'footnote', text: `${store.eventCount} sự kiện đã ghi trên máy này` }),
  );

  return el('div', {}, sections);
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
