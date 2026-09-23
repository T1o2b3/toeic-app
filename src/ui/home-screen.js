/**
 * Tổng quan (dashboard): hôm nay làm gì, tuần này đã làm bao nhiêu, đang tiến tới đâu (D36).
 *
 * Trả lời ba câu hỏi theo thứ tự người học hay hỏi:
 *   1. Bây giờ nên làm gì?            → thẻ "Hôm nay" với một nút chính (RESEARCH.md R1, R2)
 *   2. Mình có đều đặn không?        → số việc 7 ngày, số ngày có học, chuỗi ngày, biểu đồ 14 ngày
 *   3. Mình đang tiến bộ ở đâu? → tiến độ từ vựng; độ chính xác từng phần thi + lỗ hổng
 * Nút chi tiết (ôn thẻ, phân loại, luyện câu...) nằm ở mục Từ vựng và Bài thi, không ở đây.
 */
import { el, goTo } from './dom.js';
import { toggleTheme } from './app.js';
import { SKILL_LABEL } from '../logic/exam-time.js';
import { countUntriaged } from '../logic/vocab-state.js';
import { planToday, describePlan, planTarget } from '../logic/today.js';
import {
  activityByDay, activeWeeks, examOverview, vocabProgress, weakestTypes,
  estimateStudyMinutes, matureTrend, combinedExam, WEEKLY_GOAL_MINUTES, MATURE_DAYS,
} from '../logic/dashboard.js';
import { buildExport, exportFileName } from '../logic/export.js';
import { questionsBySkill } from '../logic/sets.js';
import { isSupabaseConfigured } from '../data/supabase.js';
import { getTier } from '../data/prefs.js';
import { TIER_ORDER, filterByTier } from '../logic/deck-tiers.js';
import { renderActivityChart, renderLevelBar, renderAccuracyBars } from './dashboard-charts.js';

/** Thời điểm build, do Vite nhúng vào (xem vite.config.js). */
const BUILD_TIME = typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : 'dev';

/** Khung một khối của dashboard: tiêu đề (bấm được nếu có `to`) + nội dung. */
function panel(title, to, children) {
  const head = to
    ? el('button', { class: 'panel-head link-row', onClick: () => goTo(to) }, [
        el('span', { text: title }), el('span', { class: 'panel-more', text: 'Xem ›' }),
      ])
    : el('div', { class: 'panel-head' }, [el('span', { text: title })]);
  return el('section', { class: 'panel' }, [head, ...children]);
}

/**
 * @param {object} store
 * @returns {HTMLElement}
 */
export function renderHome(store) {
  const now = Date.now();
  const events = store.events;
  const activity = activityByDay(events, { now, days: 14 });
  const weeks = activeWeeks(events, now);
  const theme = document.documentElement.getAttribute('data-theme') || 'light';

  // Thứ tự: VIỆC CẦN LÀM trước, số liệu tiến bộ sau, phân tích chi tiết xuống cuối.
  // Huy mở app lúc rảnh 10 phút — thứ đầu tiên chạm mắt phải là nút bắt đầu, không phải biểu đồ.
  return el('div', {}, [
    el('div', { class: 'dash-title' }, [
      el('div', { class: 'dash-title-main' }, [
        el('h1', { text: 'Tổng quan' }),
        el('button', {
          class: 'theme-toggle',
          'aria-label': theme === 'light' ? 'Chuyển sang nền tối' : 'Chuyển sang nền sáng',
          onClick: () => { toggleTheme(); store.refresh(); },
          text: theme === 'light' ? '🌙' : '☀️',
        }),
      ]),
      renderWeeksBadge(weeks),
    ]),
    renderToday(store),
    renderKpis(store, events, now),
    renderVocabPanel(store),
    renderExamsPanel(store, events, now),
    el('details', { class: 'more-panel' }, [
      el('summary', { text: 'Xem hoạt động 14 ngày gần đây' }),
      renderActivityChart(activity),
    ]),
    el('button', { class: 'secondary', onClick: () => goTo('/sync') }, [
      el('span', { text: 'Đồng bộ giữa các máy' }),
      el('small', { text: isSupabaseConfigured() ? 'Mac ↔ iPhone' : 'chưa cấu hình — dữ liệu chỉ ở máy này' }),
    ]),
    el('div', { class: 'actions' }, [
      el('button', { class: 'link', text: '⬇ Xuất dữ liệu ra file', onClick: () => downloadBackup(store) }),
    ]),
    el('p', { class: 'footnote', text: `${store.eventCount} sự kiện đã ghi trên máy này · bản ${BUILD_TIME}` }),
  ]);
}

/**
 * Huy hiệu góc phải: **số tuần đã học, cộng dồn** — thay cho "chuỗi N ngày" trước đây.
 *
 * Chuỗi ngày đứt mỗi khi nghỉ một hôm, mà nhịp của Huy là 1–2 giờ/tuần nên nó đứt gần như liên tục:
 * mỗi lần mở app là một lời nhắc vừa thất bại. RESEARCH.md xếp streak vào mục "cố ý không lấy" vì
 * đúng lý do này. Con số cộng dồn thì nghỉ bao lâu cũng không mất gì.
 */
function renderWeeksBadge({ total, thisWeek }) {
  if (total === 0) return '';
  return el('span', {
    class: thisWeek ? 'weeks-badge done' : 'weeks-badge',
    title: 'Số tuần từng có học — chỉ tăng, không bao giờ tụt',
    text: thisWeek ? `${total} tuần đã học ✓` : `${total} tuần đã học`,
  });
}

/**
 * Ba con số trang, mỗi số trả lời một câu người học thật sự hỏi:
 *   - Học tuần này: đã học bao nhiêu phút so với mục tiêu tuần?
 *   - Từ nhớ vững:  thật sự nhớ được bao nhiêu từ?
 *   - Đúng ở bài thi: làm bài đúng bao nhiêu, đang lên hay xuống?
 */
function renderKpis(store, events, now) {
  const minutes = estimateStudyMinutes(events, { now });
  const goalMet = minutes >= WEEKLY_GOAL_MINUTES;
  const mature = matureTrend(events, store.states, now);
  const exam = combinedExam(events, now);

  let matureNote = `ôn cách ≥ ${MATURE_DAYS} ngày`;
  if (mature.delta > 0) matureNote = `▲ +${mature.delta} so với tuần trước`;
  else if (mature.delta < 0) matureNote = `▼ ${mature.delta} so với tuần trước`;

  let examNote = 'chưa làm câu nào tuần này';
  if (exam.recent.attempts > 0) {
    examNote = `${exam.recent.attempts} câu · 7 ngày qua`;
    if (exam.delta > 0) examNote = `▲ +${exam.delta} điểm so với tuần trước`;
    else if (exam.delta < 0) examNote = `▼ ${exam.delta} điểm so với tuần trước`;
    else if (exam.delta === 0) examNote = '＝ như tuần trước';
  }

  return el('div', { class: 'kpis' }, [
    el('div', { class: 'kpi', title: 'Ước tính từ số việc đã làm × thời gian trung bình mỗi việc, không phải đồng hồ bấm giờ' }, [
      el('div', { class: 'kpi-label', text: 'Học tuần này' }),
      el('div', { class: 'kpi-value' }, [`${minutes}`, el('span', { class: 'kpi-unit', text: ' phút' })]),
      el('div', {
        class: 'meter', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(WEEKLY_GOAL_MINUTES),
        'aria-valuenow': String(Math.min(minutes, WEEKLY_GOAL_MINUTES)), 'aria-label': 'Tiến độ mục tiêu học tuần',
      }, [el('div', { class: 'meter-fill', style: `width:${Math.min(100, (minutes / WEEKLY_GOAL_MINUTES) * 100)}%` })]),
      el('div', { class: 'kpi-note', text: goalMet ? `✓ đạt mục tiêu ${WEEKLY_GOAL_MINUTES} phút` : `mục tiêu ${WEEKLY_GOAL_MINUTES} phút` }),
    ]),
    el('div', { class: 'kpi', title: `Từ có lần ôn kế tiếp cách từ ${MATURE_DAYS} ngày trở lên — thuật toán FSRS thấy bạn thật sự nhớ` }, [
      el('div', { class: 'kpi-label', text: 'Từ nhớ vững'}),
      el('div', { class: 'kpi-value', text: String(mature.now) }),
      el('div', { class: 'kpi-note', text: matureNote }),
    ]),
    el('div', { class: 'kpi', title: 'Độ chính xác gộp Part 5 và luyện nghe trong 7 ngày gần nhất' }, [
      el('div', { class: 'kpi-label', text: 'Đúng ở bài thi' }),
      el('div', { class: 'kpi-value', text: exam.recent.accuracy === null ? '—' : `${Math.round(exam.recent.accuracy * 100)}%` }),
      el('div', { class: 'kpi-note', text: examNote }),
    ]),
  ]);
}

/** Thẻ "Hôm nay": MỘT nút chính. Hết việc đến hạn thì gợi ý việc kế tiếp thay vì để trống. */
function renderToday(store) {
  const entries = filterByTier(store.entries, getTier(TIER_ORDER));
  const plan = planToday({ entries, states: store.states, questions: store.questions, quizStates: store.quizStates });

  const newcomer = ![...store.states.values()].some((state) => state.triaged);

  let action;
  if (newcomer && countUntriaged(entries, store.states) > 0) {
    action = el('button', { class: 'primary', onClick: () => goTo('/triage') }, [
      el('span', { text: 'Bắt đầu: phân loại từ vựng' }),
      el('small', { text: 'chấm 20 từ đầu tiên (~2 phút) để app biết bạn cần học gì' }),
    ]);
  } else if (!plan.empty) {
    action = el('button', { class: 'primary', onClick: () => goTo(planTarget(plan)) }, [
      el('span', { text: '15 phút hôm nay' }),
      el('small', { text: describePlan(plan) }),
    ]);
  } else if (countUntriaged(entries, store.states) > 0) {
    action = el('button', { class: 'primary', onClick: () => goTo('/triage') }, [
      el('span', { text: 'Phân loại thêm từ vựng' }),
      el('small', { text: 'chưa có thẻ nào đến hạn — thêm từ để có gì học' }),
    ]);
  } else {
    // KHÔNG để màn này thành ngõ cụt. Đây đúng là lúc Huy đang rảnh và sẵn sàng học — đưa một câu
    // chữ xám rồi bắt tự đi tìm mục khác là cách chắc chắn nhất để mất một phiên học.
    action = el('div', {}, [
      el('p', { class: 'empty', text: 'Không còn thẻ nào đến hạn — ôn dồn không giúp nhớ lâu hơn. Còn sức thì luyện đề:' }),
      el('button', { class: 'primary', onClick: () => goTo('/exams') }, [
        el('span', { text: 'Luyện đề' }),
        el('small', { text: 'Part 5–7 và luyện nghe · chọn lượt 10–30 câu' }),
      ]),
      el('button', { class: 'secondary', onClick: () => goTo('/collocations') }, [
        el('span', { text: 'Xem cụm từ TOEIC' }),
        el('small', { text: '142 cụm tuyển chọn · đọc lướt cũng vào' }),
      ]),
    ]);
  }
  return el('section', { class: 'panel today' }, [el('div', { class: 'panel-head' }, [el('span', { text: 'Hôm nay' })]), action]);
}

/** Tiến độ từ vựng: một thanh xếp chồng theo mức + chú thích, bấm dòng để mở đúng danh sách trong kho. */
function renderVocabPanel(store) {
  const progress = vocabProgress(store.entries, store.states);
  const percent = progress.total === 0 ? 0 : Math.round((progress.triaged / progress.total) * 100);
  return panel('Từ vựng', '/vocab', [
    el('div', { class: 'hero' }, [
      el('span', { class: 'hero-value', text: String(progress.triaged) }),
      el('span', { class: 'hero-label', text: ` / ${progress.total} từ đã phân loại (${percent}%)` }),
      el('div', { class: 'hero-sub', text: `${progress.mastered} thành thạo · ${progress.learning} đang học` }),
    ]),
    renderLevelBar(progress, (key) => goTo(`/words?f=${key}`)),
  ]);
}

/** Độ chính xác hai kỹ năng Đọc / Nghe (ô số lớn) + các dạng câu yếu nhất gộp cả hai. */
function renderExamsPanel(store, events, now) {
  const bank = questionsBySkill(store);
  const tiles = [
    examTile('Đọc (Part 5–7)', examOverview(events, 'reading', now), bank.reading.length),
    examTile('Nghe (Part 2–4)', examOverview(events, 'listening', now), bank.listening.length),
  ];
  const weak = [
    ...weakestTypes(bank.reading, store.quizStates).map((row) => ({ ...row, part: SKILL_LABEL.reading })),
    ...weakestTypes(bank.listening, store.quizStates).map((row) => ({ ...row, part: SKILL_LABEL.listening })),
  ].sort((a, b) => a.accuracy - b.accuracy).slice(0, 4);

  return panel('Bài thi', '/exams', [
    el('div', { class: 'tiles' }, tiles),
    weak.length > 0
      ? el('div', {}, [el('div', { class: 'gaps-title', text: 'Dạng câu yếu nhất (đã làm ≥ 3 câu)' }), renderAccuracyBars(weak)])
      : el('p', { class: 'empty small', text: 'Làm thêm vài câu mỗi dạng để thấy chỗ nào còn yếu.' }),
  ]);
}

function examTile(label, overview, available) {
  const recent = overview.recent.attempts > 0;
  const basis = recent ? overview.recent : overview.all;
  let trend = '';
  if (overview.delta !== null) {
    if (overview.delta > 0) trend = `▲ ${overview.delta} điểm so với tuần trước`;
    else if (overview.delta < 0) trend = `▼ ${overview.delta} điểm so với tuần trước`;
    else if (overview.delta === 0) trend = '＝ như tuần trước';
  }
  return el('div', { class: 'tile' }, [
    el('div', { class: 'tile-label', text: label }),
    el('div', { class: 'tile-value', text: basis.accuracy === null ? '—' : `${Math.round(basis.accuracy * 100)}%` }),
    el('div', { class: 'tile-note', text: available === 0
      ? 'chưa có câu hỏi'
      : basis.attempts === 0 ? 'chưa làm câu nào' : `${basis.attempts} câu · ${recent ? '7 ngày qua' : 'tổng cộng'}` }),
    trend ? el('div', { class: 'tile-note', text: trend }) : '',
  ]);
}

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
