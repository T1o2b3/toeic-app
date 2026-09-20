/**
 * Biểu đồ của màn Tổng quan, dựng bằng HTML/CSS thuần (không thư viện, không phụ thuộc mạng).
 *
 * Chọn dạng theo việc của dữ liệu:
 *   - việc đã làm mỗi ngày, 3 nhóm      → cột xếp chồng, 3 màu đầu của bảng đã kiểm định (xanh / cam / ngọc);
 *   - tiến độ từ vựng (thang có thứ tự) → MỘT thanh xếp chồng, một màu xanh đậm dần theo mức thành thạo,
 *                                          "chưa phân loại" là xám trung tính;
 *   - độ chính xác theo dạng câu        → thanh ngang một màu, xếp yếu nhất trước.
 * Màu chỉ để phân biệt; mọi con số đều in thành chữ nên không bao giờ chỉ dựa vào màu. Chữ dùng màu chữ
 * thường, không dùng màu của chuỗi. Màu khai báo trong style.css (--viz-*).
 */
import { el } from './dom.js';
import { SKILL_LABEL } from '../logic/exam-time.js';
import { LEVEL_INFO } from '../logic/vocab-levels.js';

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/** Ba chuỗi của biểu đồ hoạt động: khoá trong dữ liệu, nhãn, biến màu. Thứ tự cố định, không xoay vòng. */
const SERIES = Object.freeze([
  { key: 'vocab', label: 'Từ vựng', color: 'var(--viz-s1)' },
  { key: 'reading', label: SKILL_LABEL.reading, color: 'var(--viz-s2)' },
  { key: 'listening', label: SKILL_LABEL.listening, color: 'var(--viz-s3)' },
]);

/** Nhãn ngắn "T3 20/9" cho một cột. */
function dayLabel(ts) {
  const d = new Date(ts);
  return `${WEEKDAY[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

/** Nội dung gợi ý khi rê chuột / đọc bằng trình đọc màn hình. */
function dayTitle(day) {
  const parts = SERIES.filter((s) => day[s.key] > 0).map((s) => `${day[s.key]} ${s.label}`);
  return `${dayLabel(day.ts)}: ${day.total === 0 ? 'không học' : `${day.total} việc (${parts.join(', ')})`}`;
}

/**
 * Cột xếp chồng: việc đã làm mỗi ngày.
 * @param {ReturnType<import('../logic/dashboard.js').activityByDay>} activity - cũ → mới
 * @returns {HTMLElement}
 */
export function renderActivityChart(activity) {
  const peak = Math.max(...activity.map((d) => d.total));
  if (peak === 0) {
    return el('p', { class: 'empty', text: 'Chưa có hoạt động nào trong 14 ngày qua. Bắt đầu bằng phiên 15 phút ở trên.' });
  }
  // Trần tối thiểu 4: hôm nào chỉ làm 1–2 việc thì cột không phình to giả tạo.
  const scale = Math.max(peak, 4);

  const columns = activity.map((day, index) => {
    const isToday = index === activity.length - 1;
    // Từ dưới lên theo thứ tự chuỗi; chỉ đoạn TRÊN CÙNG được bo góc (4px) như quy cách mark.
    const filled = SERIES.filter((s) => day[s.key] > 0);
    const segments = filled.map((s, i) => el('div', {
      class: i === filled.length - 1 ? 'viz-seg top' : 'viz-seg',
      style: `flex-grow:${day[s.key]};background:${s.color}`,
    }));
    return el('div', { class: isToday ? 'viz-col today' : 'viz-col', title: dayTitle(day) }, [
      // Chỉ ghi số trên hôm nay và ngày cao nhất: không ghi số lên mọi cột.
      el('div', { class: 'viz-val', text: day.total > 0 && (isToday || day.total === peak) ? String(day.total) : '' }),
      el('div', { class: 'viz-stack', style: `height:${(day.total / scale) * 100}%` }, segments),
      el('div', { class: 'viz-x', text: WEEKDAY[new Date(day.ts).getDay()] }),
    ]);
  });

  const legend = el('div', { class: 'viz-legend' }, SERIES.map((s) => el('span', { class: 'viz-key' }, [
    el('i', { class: 'viz-swatch', style: `background:${s.color}` }),
    el('span', { text: s.label }),
  ])));

  const table = el('details', { class: 'viz-table' }, [
    el('summary', { text: 'Xem dạng bảng' }),
    el('table', {}, [
      el('thead', {}, [el('tr', {}, ['Ngày', ...SERIES.map((s) => s.label), 'Tổng'].map((h) => el('th', { text: h })))]),
      el('tbody', {}, [...activity].reverse().map((day) => el('tr', {}, [
        el('td', { text: dayLabel(day.ts) }),
        ...SERIES.map((s) => el('td', { text: String(day[s.key]) })),
        el('td', { text: String(day.total) }),
      ]))),
    ]),
  ]);

  return el('div', {}, [
    el('div', { class: 'viz-cols', role: 'img', 'aria-label': `Việc đã làm mỗi ngày trong ${activity.length} ngày gần nhất. ${activity.map(dayTitle).join('. ')}` }, columns),
    legend,
    table,
  ]);
}

/** Màu từng đoạn của thanh tiến độ, theo khoá nhóm. */
const LEVEL_COLOR = Object.freeze({
  untriaged: 'var(--viz-l0)', unknown: 'var(--viz-l1)', context: 'var(--viz-l2)', spelling: 'var(--viz-l3)', fluent: 'var(--viz-l4)',
});

const LEVEL_LABEL = Object.freeze({
  untriaged: 'Chưa phân loại',
  ...Object.fromEntries(Object.entries(LEVEL_INFO).map(([key, info]) => [key, info.label])),
});

/**
 * Thanh xếp chồng: mức đã chấm của các từ ĐÃ PHÂN LOẠI + chú thích có số.
 *
 * Thanh chỉ vẽ 4 mức, KHÔNG gồm "chưa phân loại": deck có ~2400 từ mà mới phân loại vài trăm thì đoạn xám
 * chiếm hết thanh và 4 mức còn lại chỉ còn vạch li ti không đọc được. "Chưa phân loại" là một dòng riêng bên dưới.
 * @param {ReturnType<import('../logic/dashboard.js').vocabProgress>} progress
 * @param {(key: string) => void} [onPick] - bấm một dòng chú thích
 * @returns {HTMLElement}
 */
export function renderLevelBar(progress, onPick) {
  const levels = progress.segments.filter((s) => s.key !== 'untriaged');
  const untriaged = progress.segments.find((s) => s.key === 'untriaged');
  const pctOfTriaged = (count) => (progress.triaged === 0 ? 0 : Math.round((count / progress.triaged) * 100));

  const bar = el('div', {
    class: 'viz-bar', role: 'img',
    'aria-label': levels.map((s) => `${LEVEL_LABEL[s.key]} ${s.count}`).join(', '),
  }, levels.filter((s) => s.count > 0).map((s) => el('div', {
    class: 'viz-bar-seg',
    style: `flex-grow:${s.count};background:${LEVEL_COLOR[s.key]}`,
    title: `${LEVEL_LABEL[s.key]}: ${s.count} từ (${pctOfTriaged(s.count)}% số từ đã phân loại)`,
  })));

  const row = (segment, value) => el(onPick ? 'button' : 'div', {
    class: onPick ? 'viz-row link-row' : 'viz-row',
    onClick: onPick ? () => onPick(segment.key) : undefined,
  }, [
    el('i', { class: 'viz-swatch', style: `background:${LEVEL_COLOR[segment.key]}` }),
    el('span', { class: 'viz-row-label', text: LEVEL_LABEL[segment.key] }),
    el('span', { class: 'viz-row-value', text: value }),
  ]);

  return el('div', {}, [
    el('div', { class: 'viz-caption', text: progress.triaged === 0
      ? 'Chưa phân loại từ nào — mỗi từ chấm xong sẽ hiện ở đây.'
      : `Mức đã chấm của ${progress.triaged} từ đã phân loại` }),
    bar,
    el('div', { class: 'viz-rows' }, [
      ...levels.map((s) => row(s, `${s.count} · ${pctOfTriaged(s.count)}%`)),
      row(untriaged, `${untriaged.count}`),
    ]),
  ]);
}

/**
 * Thanh ngang độ chính xác theo dạng câu, yếu nhất trước.
 * @param {Array<{errorType: string, attempts: number, accuracy: number, part?: string}>} rows
 * @returns {HTMLElement}
 */
export function renderAccuracyBars(rows) {
  return el('div', { class: 'viz-hbars' }, rows.map((row) => {
    const percent = Math.round(row.accuracy * 100);
    return el('div', { class: 'viz-hbar', title: `${row.part ? `${row.part} · ` : ''}${row.errorType}: ${percent}% đúng trên ${row.attempts} câu` }, [
      el('div', { class: 'viz-hbar-label', text: `${row.part ? `${row.part} · ` : ''}${row.errorType}` }),
      el('div', { class: 'viz-track' }, [el('div', { class: 'viz-fill', style: `width:${Math.max(percent, 2)}%` })]),
      el('div', { class: 'viz-hbar-value', text: `${percent}%` }),
    ]);
  }));
}
