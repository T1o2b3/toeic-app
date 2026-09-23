/**
 * Chọn việc nên học BÂY GIỜ dựa trên chỗ đang yếu, thay cho nút "15 phút hôm nay" trỏ cứng vào một phần.
 *
 * Vì sao cần: trước đây nút luôn dẫn về ôn thẻ rồi mới tới Part 5, bất kể Huy đang hổng Part 7 hay chưa
 * đụng Part 4 bao giờ. Nhịp 1–2 giờ/tuần thì mỗi phiên là tài nguyên hiếm — phải tiêu vào chỗ yếu nhất.
 *
 * Trả về DANH SÁCH đã xếp theo mức cần, màn chính lấy HAI mục đầu. Hai chứ không một, vì "cần nhất theo
 * số liệu" chưa chắc là thứ Huy làm được lúc đó: đang ở chỗ ồn thì không luyện nghe được, còn 5 phút thì
 * không mở nổi một bộ Part 7.
 */
import { reviewQueue, countUntriaged } from './vocab-state.js';
import { quizQueue } from './quiz.js';
import { examOverview } from './dashboard.js';
import { summarizeQueue, estimateSessionTime } from './format.js';
import { PART5_TARGET_SECONDS } from './part5.js';
import { LISTEN_ROUND_SIZE, estimateMinutes } from './listen.js';
import { SET_PARTS, PART_LABEL, SET_ROUND_SIZE, setQueue, estimateSetMinutes } from './sets.js';

/**
 * Thang điểm "cần tới mức nào", 0–100. Để thành một bảng tra được thay vì rải công thức khắp nơi:
 * mỗi lần đổi thứ tự ưu tiên chỉ phải sửa ở đây, và giải thích được cho người học vì sao ra thứ tự đó.
 */
const NEED = Object.freeze({
  /**
   * Thẻ quá hạn. Tăng theo SỐ LƯỢNG chứ không phải một mức cố định:
   *   1–5 thẻ  → việc vặt, để phần thi đang yếu đi trước;
   *   ~25 thẻ  → vượt mọi thứ khác, vì hàng đợi tồn đọng là thứ làm người học bỏ app (RESEARCH.md R6),
   *              và quên một từ đã học tốn công hơn nhiều so với học chậm một từ mới (D03).
   */
  overdue: (count) => Math.min(98, 45 + count * 2),
  /** Phần thi CHƯA ĐỤNG bao giờ — lỗ hổng lớn nhất, vì không biết mình yếu tới đâu. */
  neverTried: 70,
  /** Đã làm nhưng quá ít để kết luận (< MIN_ATTEMPTS câu): nên lấy thêm mẫu. */
  thinData: 55,
  /** Đã có đủ số liệu: càng sai nhiều càng cần. Đúng 100% → 30, đúng 0% → 90. */
  byAccuracy: (accuracy) => Math.round(30 + (1 - accuracy) * 60),
  /** Từ mới: cần, nhưng nhường chỗ cho việc đến hạn. */
  newVocab: 45,
  /** Phân loại: chỉ đáng làm khi hàng đợi học sắp cạn. */
  triage: (queueEmpty) => (queueEmpty ? 65 : 25),
  /** Cụm từ mới: cao hơn phân loại từ đơn vì mỗi cụm chặn một lỗi cụ thể hay gặp trong đề. */
  newColloc: 50,
});

/** Dưới ngần này câu thì tỉ lệ đúng chưa nói lên điều gì. */
const MIN_ATTEMPTS = 5;

/**
 * Chấm một phần thi theo số liệu đã có.
 * @returns {{need: number, reason: string}}
 */
function scorePart(overview) {
  const basis = overview.all;
  if (basis.attempts === 0) return { need: NEED.neverTried, reason: 'chưa làm câu nào — chỗ hổng lớn nhất' };
  if (basis.attempts < MIN_ATTEMPTS) {
    return { need: NEED.thinData, reason: `mới làm ${basis.attempts} câu, chưa đủ để biết mạnh yếu` };
  }
  const percent = Math.round(basis.accuracy * 100);
  return { need: NEED.byAccuracy(basis.accuracy), reason: `đang đúng ${percent}% (${basis.attempts} câu)` };
}

/**
 * Xếp hạng mọi việc học đang làm được, cần nhất lên đầu.
 *
 * @param {object} input
 * @param {Array<object>} input.entries - deck từ vựng đã lọc theo tầng
 * @param {Map<string, object>} input.states
 * @param {Array<object>} input.questions - ngân hàng Part 5
 * @param {Array<object>} input.listening - ngân hàng Part 2
 * @param {Record<number, object[]>} input.sets - bộ đề theo Part
 * @param {Map<string, object>} input.quizStates
 * @param {Array<object>} input.events - nhật ký, để đo độ chính xác từng phần
 * @param {Array<object>} [input.collocationCards] - cụm từ dưới dạng thẻ học (logic/collocations.js)
 * @param {Date|number} [input.now]
 * @returns {Array<{key: string, title: string, note: string, reason: string, path: string, need: number}>}
 */
export function suggestSessions({
  entries, states, questions, listening, sets, quizStates, events,
  collocationCards = [], now = new Date(),
}) {
  const out = [];
  const queue = reviewQueue(entries ?? [], states ?? new Map(), { now, maxNew: 9999, maxTotal: 9999 });
  const { due, fresh } = summarizeQueue(queue);

  if (due > 0) {
    out.push({
      key: 'review', path: '/review', title: 'Ôn thẻ đến hạn',
      note: `${due} thẻ · ${estimateSessionTime(due, 0)}`,
      reason: `${due} thẻ đã tới lúc ôn — để lâu là quên hẳn`,
      need: NEED.overdue(due),
    });
  } else if (fresh > 0) {
    out.push({
      key: 'review', path: '/review', title: 'Học từ mới',
      note: `${Math.min(fresh, 10)} từ · ${estimateSessionTime(0, Math.min(fresh, 10))}`,
      reason: 'không còn thẻ đến hạn, tiến tiếp bằng từ mới',
      need: NEED.newVocab,
    });
  }

  const untriaged = countUntriaged(entries ?? [], states ?? new Map());
  if (untriaged > 0) {
    const batch = Math.min(untriaged, 20);
    out.push({
      key: 'triage', path: '/triage', title: 'Phân loại từ vựng',
      note: `${batch} từ · ~${Math.max(1, Math.round((batch * 4) / 60))} phút`,
      reason: queue.length === 0
        ? 'hàng đợi học đã cạn — phân loại để có cái mà học'
        : `còn ${untriaged} từ chưa biết mình đã thuộc hay chưa`,
      need: NEED.triage(queue.length === 0),
    });
  }

  const collocLeft = countUntriaged(collocationCards, states ?? new Map());
  if (collocLeft > 0) {
    const batch = Math.min(collocLeft, 20);
    out.push({
      key: 'colloc', path: '/triage?kind=colloc', title: 'Học cụm từ mới',
      note: `${batch} cụm · ~${Math.max(1, Math.round((batch * 5) / 60))} phút`,
      reason: `còn ${collocLeft} cụm chưa học — mỗi cụm chặn một lỗi hay gặp trong đề`,
      need: NEED.newColloc,
    });
  }

  if ((questions ?? []).length > 0) {
    const round = quizQueue(questions, quizStates ?? new Map(), { size: 20 });
    const { need, reason } = scorePart(examOverview(events ?? [], 'part5', +now));
    out.push({
      key: 'part5', path: '/quiz', title: `Luyện ${PART_LABEL[5]}`,
      note: `${round.length} câu · ~${Math.max(1, Math.round((round.length * PART5_TARGET_SECONDS) / 60))} phút`,
      reason, need,
    });
  }

  if ((listening ?? []).length > 0) {
    const round = quizQueue(listening, quizStates ?? new Map(), { size: LISTEN_ROUND_SIZE });
    const { need, reason } = scorePart(examOverview(events ?? [], 'part2', +now));
    out.push({
      key: 'part2', path: '/listen', title: `Luyện ${PART_LABEL[2]}`,
      note: `${round.length} câu · ~${estimateMinutes(round.length)} phút · nên đeo tai nghe`,
      reason, need,
    });
  }

  for (const part of SET_PARTS) {
    const bank = sets?.[part] ?? [];
    if (bank.length === 0) continue;
    const round = setQueue(bank, quizStates ?? new Map(), { size: SET_ROUND_SIZE[part] });
    if (round.length === 0) continue;
    const { need, reason } = scorePart(examOverview(events ?? [], `part${part}`, +now));
    const listen = part === 3 || part === 4;
    out.push({
      key: `part${part}`, path: `/sets?part=${part}`, title: `Luyện ${PART_LABEL[part]}`,
      note: `${round.length} bộ · ~${estimateSetMinutes(part, round)} phút${listen ? ' · nên đeo tai nghe' : ''}`,
      reason, need,
    });
  }

  // Cần bằng nhau thì giữ nguyên thứ tự dựng ở trên (từ vựng trước, rồi Part 5 → 7):
  // sort của JS ổn định, nên không cần thêm tiêu chí phụ.
  return out.sort((a, b) => b.need - a.need);
}

/**
 * Hai lựa chọn cho nút "hôm nay". Cố ý không lấy hai việc cùng một loại
 * (vd hai phần nghe) — đưa ra hai thứ giống nhau thì coi như chỉ có một lựa chọn.
 * @param {Array<object>} ranked - kết quả suggestSessions
 * @returns {Array<object>} nhiều nhất 2 mục
 */
export function pickTwo(ranked) {
  if (ranked.length <= 1) return ranked.slice(0, 1);
  const [first] = ranked;
  const different = ranked.slice(1).find((s) => kindOf(s.key) !== kindOf(first.key));
  return different ? [first, different] : ranked.slice(0, 2);
}

/** Nhóm việc: từ vựng / đọc / nghe. Dùng để hai lựa chọn không trùng loại. */
function kindOf(key) {
  // Cụm từ là loại RIÊNG, không gộp vào "vocab": học `pay attention to` khác hẳn việc ôn thẻ từ đơn,
  // nên ghép "Ôn thẻ" với "Học cụm từ mới" vẫn là hai lựa chọn thật sự khác nhau.
  if (key === 'colloc') return 'colloc';
  if (key === 'review' || key === 'triage') return 'vocab';
  if (key === 'part2' || key === 'part3' || key === 'part4') return 'listening';
  return 'reading';
}
