/**
 * Thi thử (M15): dựng một đề từ các ngân hàng câu hỏi, chấm bài, và định dạng giờ. Hàm thuần, không đụng DOM.
 *
 * Đề TOEIC Listening & Reading đủ bộ có 200 câu; app bỏ 6 câu Part 1 (cần ảnh) nên còn 194:
 *   Nghe (45 phút): Part 2 = 25 câu · Part 3 = 13 bộ (39 câu) · Part 4 = 10 bộ (30 câu)
 *   Đọc  (75 phút): Part 5 = 30 câu · Part 6 = 4 bộ (16 câu) · Part 7 = 54 câu (đơn 29 + đôi 10 + ba 15)
 *
 * CHỈ chấm số câu đúng — KHÔNG quy đổi ra điểm 10–990: bảng quy đổi thay đổi theo từng đề chuẩn hoá và câu hỏi
 * của app do AI ra nên độ khó không hiệu chuẩn; một con số điểm sẽ là số bịa (D36).
 */

import { shuffle, shuffleChoices } from './shuffle.js';
import { composeRound } from './part5.js';

export { shuffle };

/** Quy cách từng phần: số câu mục tiêu, kỹ năng. Part 7 tách 3 dạng vì đề thật chia như vậy. */
export const EXAM_SPEC = Object.freeze({
  part2: { skill: 'listening', questions: 25 },
  part3: { skill: 'listening', questions: 39 },
  part4: { skill: 'listening', questions: 30 },
  part5: { skill: 'reading', questions: 30 },
  part6: { skill: 'reading', questions: 16 },
  part7: { skill: 'reading', questions: 54 },
});

/** Với Part 7: số câu mục tiêu của từng dạng bộ. */
export const PART7_SPLIT = Object.freeze({ single: 29, double: 10, triple: 15 });

export const PART_ORDER = Object.freeze(['part2', 'part3', 'part4', 'part5', 'part6', 'part7']);

/** Các chế độ chọn ở màn thi thử. */
export const EXAM_MODES = Object.freeze({
  full: { label: 'Đề đủ', parts: PART_ORDER },
  listening: { label: 'Chỉ phần Nghe', parts: ['part2', 'part3', 'part4'] },
  reading: { label: 'Chỉ phần Đọc', parts: ['part5', 'part6', 'part7'] },
  ...Object.fromEntries(PART_ORDER.map((p) => [p, { label: `Riêng Part ${p.slice(4)}`, parts: [p] }])),
});


/** Số câu hỏi của một đơn vị (một câu lẻ hoặc một bộ). */
const sizeOf = (unit) => unit.questions.length;

/**
 * Chọn các đơn vị (bộ) cho tới khi đủ `target` câu, trong ngân hàng đã xáo. Nếu thêm nguyên một bộ làm vượt mục tiêu
 * thì thử tìm bộ nhỏ vừa khít; không có thì chấp nhận vượt tối đa `slack` câu (đề thật cũng chia theo bộ).
 * @param {Array<{questions: Array}>} pool - đã xáo
 * @param {number} target
 * @param {number} [slack]
 * @returns {Array<object>}
 */
export function pickSets(pool, target, slack = 1) {
  const picked = [];
  const rest = [...pool];
  let total = 0;
  while (total < target && rest.length > 0) {
    const remaining = target - total;
    // Ưu tiên bộ vừa khít số câu còn thiếu, để không vượt mục tiêu vô cớ.
    let at = rest.findIndex((u) => sizeOf(u) === remaining);
    if (at === -1) at = rest.findIndex((u) => sizeOf(u) <= remaining);
    if (at === -1) at = rest.findIndex((u) => sizeOf(u) <= remaining + slack);
    if (at === -1) break;
    const [unit] = rest.splice(at, 1);
    picked.push(unit);
    total += sizeOf(unit);
  }
  return picked;
}

/** Biến một câu lẻ (Part 2, Part 5) thành một đơn vị chuẩn: {kind, part, id, questions: [câu]}. */
const single = (part, item) => ({ kind: 'single', part, id: item.id, item, questions: [item] });
const setUnit = (part, item) => ({ kind: 'set', part, id: item.id, item, questions: item.questions });

/**
 * Dựng một đề.
 * @param {object} banks
 * @param {object[]} banks.part2 - câu nghe Part 2
 * @param {object[]} banks.part5 - câu Part 5
 * @param {Record<number, object[]>} banks.sets - bộ theo Part: {3, 4, 6, 7}
 * @param {string} mode - khoá trong EXAM_MODES
 * @param {{random?: () => number, exclude?: Set<string>}} [options]
 * @returns {{mode: string, sections: Array<{part: string, skill: string, target: number, units: object[], questionCount: number}>, questionCount: number, shortage: Array<{part: string, have: number, need: number}>}}
 */
export function buildExamForm(banks, mode, { random = Math.random, exclude = new Set() } = {}) {
  const config = EXAM_MODES[mode];
  if (!config) throw new Error(`Chế độ thi không hợp lệ: ${mode}`);
  const active = (list) => (list ?? []).filter((x) => x.status !== 'retired' && !exclude.has(x.id));
  const pool = (list) => shuffle(active(list), random);

  const sections = config.parts.map((part) => {
    const spec = EXAM_SPEC[part];
    let units;
    if (part === 'part2') units = pool(banks.part2).slice(0, spec.questions).map((q) => single('part2', q));
    else if (part === 'part5') {
      // Part 5 lấy theo MẶT CẮT của đề thật (từ loại / từ vựng / ngữ pháp mỗi nhóm ~1/3), không lấy ngẫu nhiên
      // đều tay — ngân hàng có 12 dạng gần bằng nhau nên lấy đều sẽ ra 2/3 số câu là ngữ pháp (D39).
      // Xáo TRƯỚC khi chia hạn mức để mỗi lần thi ra câu khác nhau (trong đề thi không có ưu tiên câu từng sai).
      units = composeRound(pool(banks.part5), new Map(), { size: spec.questions, random })
        .map((q) => single('part5', q));
    }
    else if (part === 'part7') {
      const sets = pool(banks.sets?.[7]).map((s) => setUnit('part7', s));
      // Đề thật chia Part 7 thành bộ đơn / đôi / ba; nếu thiếu dạng nào thì dồn số câu thiếu sang bộ đơn.
      units = [];
      let carry = 0;
      for (const kind of ['triple', 'double', 'single']) {
        const want = PART7_SPLIT[kind] + (kind === 'single' ? carry : 0);
        const got = pickSets(sets.filter((u) => u.item.kind === kind), want);
        units.push(...got);
        if (kind !== 'single') carry += want - got.reduce((s, u) => s + sizeOf(u), 0);
      }
      // Đọc theo thứ tự đề thật: đơn → đôi → ba.
      const order = { single: 0, double: 1, triple: 2 };
      units.sort((a, b) => order[a.item.kind] - order[b.item.kind]);
    } else {
      const partNumber = Number(part.slice(4));
      units = pickSets(pool(banks.sets?.[partNumber]).map((s) => setUnit(part, s)), spec.questions);
    }
    return {
      part, skill: spec.skill, target: spec.questions, units,
      questionCount: units.reduce((s, u) => s + sizeOf(u), 0),
    };
  }).filter((section) => section.units.length > 0);

  // Xáo phương án từng câu (D65) SAU KHI đã rút đủ đề: thứ tự rút câu giữ y như cũ, và cùng `random` có hạt
  // giống nên khôi phục bài làm dở vẫn ra đúng thứ tự phương án đã thấy.
  for (const section of sections) {
    section.units = section.units.map((unit) => (unit.kind === 'single'
      ? single(unit.part, shuffleChoices(unit.item, random))
      : setUnit(unit.part, { ...unit.item, questions: unit.item.questions.map((q) => shuffleChoices(q, random)) })));
  }

  const shortage = config.parts
    .map((part) => ({ part, have: sections.find((s) => s.part === part)?.questionCount ?? 0, need: EXAM_SPEC[part].questions }))
    .filter((x) => x.have < x.need);
  return { mode, sections, questionCount: sections.reduce((s, x) => s + x.questionCount, 0), shortage };
}

/**
 * Dãy phẳng mọi đơn vị theo thứ tự làm bài.
 * @param {{sections: Array<{units: object[]}>}} form
 * @returns {object[]}
 */
export function formUnits(form) {
  return form.sections.flatMap((section) => section.units);
}

/**
 * Chấm bài.
 * @param {ReturnType<typeof buildExamForm>} form
 * @param {Record<string, string>} answers - id câu → chữ cái đã chọn
 * @returns {{correct: number, answered: number, total: number, byPart: Record<string, {correct: number, answered: number, total: number}>, bySkill: Record<string, {correct: number, total: number}>, wrong: Array<{part: string, question: object, picked: string|null}>}}
 */
export function scoreExam(form, answers) {
  const byPart = {};
  const bySkill = { listening: { correct: 0, total: 0 }, reading: { correct: 0, total: 0 } };
  const wrong = [];
  let correct = 0; let answered = 0; let total = 0;

  for (const section of form.sections) {
    const part = (byPart[section.part] = { correct: 0, answered: 0, total: 0 });
    for (const unit of section.units) {
      for (const question of unit.questions) {
        const picked = answers[question.id] ?? null;
        part.total += 1; total += 1; bySkill[section.skill].total += 1;
        if (picked) { part.answered += 1; answered += 1; }
        if (picked === question.answer) {
          part.correct += 1; correct += 1; bySkill[section.skill].correct += 1;
        } else {
          wrong.push({ part: section.part, question, picked });
        }
      }
    }
  }
  return { correct, answered, total, byPart, bySkill, wrong };
}

/**
 * Sự kiện tóm tắt một bài thi để lưu vào nhật ký.
 *
 * Có lưu cả ĐIỂM ƯỚC LƯỢNG (D39) để sau này vẽ được đường tiến bộ mà không phải tính lại từ đầu —
 * và để nếu bảng quy đổi sau này đổi thì con số Huy đã thấy hôm đó vẫn còn nguyên trong nhật ký.
 * Nhật ký là append-only (ràng buộc #5) nên thêm trường mới là an toàn: bản app cũ chỉ bỏ qua.
 *
 * @param {ReturnType<typeof scoreExam>} score
 * @param {{mode: string, seconds: number, timedOut: boolean, estimate?: object}} meta
 * @returns {object} payload cho `exam.finished`
 */
export function examSummaryPayload(score, { mode, seconds, timedOut, estimate }) {
  const payload = {
    mode, seconds, timedOut, correct: score.correct, answered: score.answered, total: score.total,
    byPart: Object.fromEntries(Object.entries(score.byPart).map(([p, x]) => [p, { correct: x.correct, total: x.total }])),
  };
  if (estimate) {
    payload.estimate = {
      complete: estimate.complete,
      total: estimate.total,
      sections: estimate.sections.map((x) => ({ skill: x.skill, point: x.point, low: x.low, high: x.high, projected: x.projected })),
    };
  }
  return payload;
}

/**
 * Mỗi phần hiện có bao nhiêu câu so với đề thật — cho màn chọn chế độ biết chế độ nào làm được và thiếu bao nhiêu.
 * @param {{part2: object[], part5: object[], sets: Record<number, object[]>}} banks
 * @returns {Record<string, {have: number, need: number}>}
 */
export function availability(banks) {
  const live = (list) => (list ?? []).filter((x) => x.status !== 'retired');
  const countSets = (list) => live(list).reduce((sum, set) => sum + set.questions.length, 0);
  return {
    part2: { have: live(banks.part2).length, need: EXAM_SPEC.part2.questions },
    part3: { have: countSets(banks.sets?.[3]), need: EXAM_SPEC.part3.questions },
    part4: { have: countSets(banks.sets?.[4]), need: EXAM_SPEC.part4.questions },
    part5: { have: live(banks.part5).length, need: EXAM_SPEC.part5.questions },
    part6: { have: countSets(banks.sets?.[6]), need: EXAM_SPEC.part6.questions },
    part7: { have: countSets(banks.sets?.[7]), need: EXAM_SPEC.part7.questions },
  };
}

/**
 * Một chế độ có làm được không (có ít nhất một câu ở một phần) và còn thiếu bao nhiêu câu so với đề thật.
 * @param {string} mode
 * @param {ReturnType<typeof availability>} avail
 * @returns {{playable: boolean, missing: number, total: number}}
 */
export function modeStatus(mode, avail) {
  const parts = EXAM_MODES[mode].parts;
  const total = parts.reduce((s, p) => s + Math.min(avail[p].have, avail[p].need), 0);
  const need = parts.reduce((s, p) => s + avail[p].need, 0);
  return { playable: total > 0, missing: need - total, total: need };
}
