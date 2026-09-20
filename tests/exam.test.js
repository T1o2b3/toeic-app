import { describe, it, expect } from 'vitest';
import {
  EXAM_SPEC, PART7_SPLIT, PART_ORDER, EXAM_MODES, SKILL_MINUTES, shuffle, pickSets, buildExamForm, formUnits,
  timeLimitSeconds, scoreExam, formatClock, examSummaryPayload, availability, modeStatus,
} from '../src/logic/exam.js';

/** Bộ giả với n câu; câu có đáp án cố định 'A' để dễ chấm. */
const makeSet = (id, n, kind) => ({
  id, status: 'active', ...(kind ? { kind } : {}),
  questions: Array.from({ length: n }, (_, i) => ({ id: `${id}-${i + 1}`, answer: 'A', errorType: 'detail' })),
});
const many = (prefix, count, n, kind) => Array.from({ length: count }, (_, i) => makeSet(`${prefix}-${String(i + 1).padStart(4, '0')}`, n, kind));
const flat = (prefix, count) => Array.from({ length: count }, (_, i) => ({ id: `${prefix}-${String(i + 1).padStart(4, '0')}`, status: 'active', answer: 'A', errorType: 'detail' }));

/** Số ngẫu nhiên có hạt giống để test lặp lại được. */
const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

const banks = {
  part2: flat('l2', 72), part5: flat('p5', 200),
  sets: {
    3: many('p3', 13, 3), 4: many('p4', 10, 3), 6: many('p6', 4, 4),
    7: [...many('p7s', 15, 2, 'single'), ...many('p7d', 3, 5, 'double'), ...many('p7t', 4, 5, 'triple')],
  },
};

describe('quy cách', () => {
  it('tổng đúng 194 câu = 200 trừ 6 câu Part 1 cần ảnh', () => {
    expect(Object.values(EXAM_SPEC).reduce((s, x) => s + x.questions, 0)).toBe(194);
    expect(PART7_SPLIT.single + PART7_SPLIT.double + PART7_SPLIT.triple).toBe(EXAM_SPEC.part7.questions);
  });

  it('Nghe 94 câu (Part 2+3+4), Đọc 100 câu (Part 5+6+7), 45 + 75 phút', () => {
    const by = (skill) => Object.values(EXAM_SPEC).filter((x) => x.skill === skill).reduce((s, x) => s + x.questions, 0);
    expect(by('listening')).toBe(94);
    expect(by('reading')).toBe(100);
    expect(SKILL_MINUTES).toEqual({ listening: 45, reading: 75 });
  });

  it('mỗi chế độ trỏ tới các phần hợp lệ', () => {
    for (const mode of Object.values(EXAM_MODES)) for (const part of mode.parts) expect(PART_ORDER).toContain(part);
    expect(EXAM_MODES.full.parts).toHaveLength(6);
    expect(EXAM_MODES.part3.parts).toEqual(['part3']);
  });
});

describe('shuffle', () => {
  it('giữ nguyên tập phần tử, không sửa mảng gốc, ra thứ tự khác với hạt giống khác', () => {
    const list = [1, 2, 3, 4, 5, 6, 7, 8];
    const a = shuffle(list, seeded(1));
    expect([...a].sort()).toEqual(list);
    expect(list).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(shuffle(list, seeded(2))).not.toEqual(a);
    expect(shuffle(list, seeded(1))).toEqual(a);
  });

  it('không thiên lệch rõ rệt: mỗi phần tử rơi vào mỗi vị trí đều nhau', () => {
    const counts = Array.from({ length: 4 }, () => Array(4).fill(0));
    const random = seeded(7);
    for (let n = 0; n < 4000; n += 1) shuffle([0, 1, 2, 3], random).forEach((v, pos) => { counts[v][pos] += 1; });
    for (const row of counts) for (const c of row) expect(Math.abs(c - 1000)).toBeLessThan(150);
  });
});

describe('pickSets', () => {
  it('lấy bộ cho tới đủ số câu, ưu tiên bộ vừa khít số còn thiếu', () => {
    const pool = [makeSet('a', 3), makeSet('b', 3), makeSet('c', 2), makeSet('d', 4)];
    const picked = pickSets(pool, 5);
    expect(picked.reduce((s, u) => s + u.questions.length, 0)).toBe(5);
  });

  it('chỉ có bộ lớn hơn phần thiếu thì chấp nhận vượt tối đa `slack` câu, hơn nữa thì dừng', () => {
    const total = (pool, target, slack) => pickSets(pool, target, slack).reduce((s, u) => s + u.questions.length, 0);
    expect(total([makeSet('a', 3), makeSet('b', 3)], 5, 1)).toBe(6);       // thiếu 2, bộ 3 vượt 1 câu: chấp nhận
    expect(total([makeSet('a', 3), makeSet('b', 4)], 5, 1)).toBe(3);       // thiếu 2, bộ 4 vượt 2 câu: từ chối
    expect(total([makeSet('a', 3), makeSet('b', 4)], 5, 2)).toBe(7);       // nới slack thì nhận
    expect(total([makeSet('a', 2), makeSet('b', 2), makeSet('c', 2)], 5, 1)).toBe(6);
  });

  it('kho không đủ thì lấy hết, không lỗi', () => {
    expect(pickSets([makeSet('a', 2)], 10)).toHaveLength(1);
    expect(pickSets([], 10)).toEqual([]);
  });
});

describe('buildExamForm — đề đủ', () => {
  const form = buildExamForm(banks, 'full', { random: seeded(3) });
  const count = (part) => form.sections.find((s) => s.part === part).questionCount;

  it('đủ 6 phần theo thứ tự đề thật và số câu đúng quy cách', () => {
    expect(form.sections.map((s) => s.part)).toEqual(PART_ORDER);
    expect(count('part2')).toBe(25);
    expect(count('part3')).toBe(39);
    expect(count('part4')).toBe(30);
    expect(count('part5')).toBe(30);
    expect(count('part6')).toBe(16);
  });

  it('Part 7: 54 câu (±1 do bộ 2 câu), xếp bộ đơn → đôi → ba', () => {
    expect(count('part7')).toBeGreaterThanOrEqual(54);
    expect(count('part7')).toBeLessThanOrEqual(55);
    const kinds = form.sections.find((s) => s.part === 'part7').units.map((u) => u.item.kind);
    const order = { single: 0, double: 1, triple: 2 };
    expect(kinds.map((k) => order[k])).toEqual([...kinds.map((k) => order[k])].sort());
    expect(kinds.filter((k) => k === 'double')).toHaveLength(2);
    expect(kinds.filter((k) => k === 'triple')).toHaveLength(3);
  });

  it('tổng khoảng 194 câu, không thiếu phần nào', () => {
    expect(form.questionCount).toBeGreaterThanOrEqual(194);
    expect(form.questionCount).toBeLessThanOrEqual(195);
    expect(form.shortage).toEqual([]);
  });

  it('không câu nào xuất hiện hai lần trong cùng đề', () => {
    const ids = formUnits(form).flatMap((u) => u.questions.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cùng hạt giống thì cùng đề; khác hạt giống thì đề khác', () => {
    const idsOf = (f) => formUnits(f).map((u) => u.id);
    expect(idsOf(buildExamForm(banks, 'full', { random: seeded(3) }))).toEqual(idsOf(form));
    expect(idsOf(buildExamForm(banks, 'full', { random: seeded(4) }))).not.toEqual(idsOf(form));
  });
});

describe('buildExamForm — thiếu nội dung và chế độ khác', () => {
  it('ngân hàng chưa đủ thì báo thiếu phần nào, không sập; phần rỗng bị bỏ', () => {
    const thin = { part2: flat('l2', 10), part5: flat('p5', 5), sets: { 3: many('p3', 2, 3), 4: [], 6: [], 7: [] } };
    const form = buildExamForm(thin, 'full', { random: seeded(1) });
    expect(form.sections.map((s) => s.part)).toEqual(['part2', 'part3', 'part5']);
    expect(form.shortage.find((x) => x.part === 'part2')).toEqual({ part: 'part2', have: 10, need: 25 });
    expect(form.shortage.map((x) => x.part)).toEqual(expect.arrayContaining(['part4', 'part6', 'part7']));
  });

  it('Part 7 thiếu bộ ba/đôi thì dồn số câu thiếu sang bộ đơn', () => {
    const noMulti = { ...banks, sets: { ...banks.sets, 7: many('p7s', 40, 2, 'single') } };
    const p7 = buildExamForm(noMulti, 'part7', { random: seeded(1) }).sections[0];
    expect(p7.questionCount).toBeGreaterThanOrEqual(54);
    expect(p7.units.every((u) => u.item.kind === 'single')).toBe(true);
  });

  it('chế độ Nghe / Đọc / từng Part chỉ dựng đúng các phần đó', () => {
    expect(buildExamForm(banks, 'listening', { random: seeded(1) }).sections.map((s) => s.part)).toEqual(['part2', 'part3', 'part4']);
    expect(buildExamForm(banks, 'reading', { random: seeded(1) }).sections.map((s) => s.part)).toEqual(['part5', 'part6', 'part7']);
    expect(buildExamForm(banks, 'part6', { random: seeded(1) }).questionCount).toBe(16);
  });

  it('bỏ mục đã gỡ và mục trong `exclude`; chế độ lạ thì báo lỗi', () => {
    const retired = { ...banks, part2: [{ ...banks.part2[0], status: 'retired' }, ...banks.part2.slice(1)] };
    const ids = formUnits(buildExamForm(retired, 'part2', { random: seeded(1) })).map((u) => u.id);
    expect(ids).not.toContain(banks.part2[0].id);
    const exclude = new Set(banks.part2.slice(1, 60).map((q) => q.id));
    const left = formUnits(buildExamForm(banks, 'part2', { random: seeded(1), exclude })).map((u) => u.id);
    expect(left.every((id) => !exclude.has(id))).toBe(true);
    expect(() => buildExamForm(banks, 'nope')).toThrow(/không hợp lệ/);
  });
});

describe('timeLimitSeconds', () => {
  it('đề đủ = 120 phút; chỉ Nghe = 45; chỉ Đọc = 75', () => {
    expect(timeLimitSeconds(buildExamForm(banks, 'full', { random: seeded(1) }))).toBe(120 * 60);
    expect(timeLimitSeconds(buildExamForm(banks, 'listening', { random: seeded(1) }))).toBe(45 * 60);
    expect(timeLimitSeconds(buildExamForm(banks, 'reading', { random: seeded(1) }))).toBe(75 * 60);
  });

  it('Part 7 vượt 1 câu (bộ 2 câu) thì giờ làm bài vẫn không dài hơn đề thật', () => {
    // Bộ đơn 2 câu × 15 = 30 (mục tiêu 29) + 10 + 15 → Part 7 có 55 câu, cả phần Đọc 101 câu.
    const form = buildExamForm(banks, 'reading', { random: seeded(2) });
    expect(form.questionCount).toBe(101);
    expect(timeLimitSeconds(form)).toBe(75 * 60);
  });

  it('một phần riêng tính theo tỉ lệ số câu (Part 5: 30/100 × 75 phút)', () => {
    expect(timeLimitSeconds(buildExamForm(banks, 'part5', { random: seeded(1) }))).toBe(Math.round(75 * 60 * 0.3));
  });
});

describe('scoreExam', () => {
  const form = buildExamForm(banks, 'full', { random: seeded(3) });
  const allQuestions = formUnits(form).flatMap((u) => u.questions);

  it('đúng hết → điểm tối đa; bỏ trống tính là chưa trả lời chứ không phải đúng', () => {
    const perfect = scoreExam(form, Object.fromEntries(allQuestions.map((q) => [q.id, 'A'])));
    expect(perfect).toMatchObject({ correct: form.questionCount, answered: form.questionCount, total: form.questionCount });
    expect(perfect.wrong).toEqual([]);
    const empty = scoreExam(form, {});
    expect(empty).toMatchObject({ correct: 0, answered: 0, total: form.questionCount });
    expect(empty.wrong).toHaveLength(form.questionCount);
  });

  it('tách theo phần và theo kỹ năng; tổng các phần = tổng đề', () => {
    const answers = Object.fromEntries(allQuestions.filter((q) => q.id.startsWith('l2-')).map((q) => [q.id, 'A']));
    const score = scoreExam(form, answers);
    expect(score.byPart.part2).toEqual({ correct: 25, answered: 25, total: 25 });
    expect(score.byPart.part5.correct).toBe(0);
    expect(score.bySkill.listening.correct).toBe(25);
    expect(score.bySkill.listening.total + score.bySkill.reading.total).toBe(form.questionCount);
    expect(Object.values(score.byPart).reduce((s, x) => s + x.total, 0)).toBe(form.questionCount);
  });

  it('chọn sai được ghi lại kèm đáp án đã chọn để xem lại', () => {
    const q = allQuestions[0];
    const score = scoreExam(form, { [q.id]: 'D' });
    expect(score.wrong.find((w) => w.question.id === q.id)).toMatchObject({ picked: 'D' });
  });
});

describe('formatClock / examSummaryPayload', () => {
  it('mm:ss và h:mm:ss, không âm', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(45 * 60)).toBe('45:00');
    expect(formatClock(120 * 60)).toBe('2:00:00');
    expect(formatClock(-5)).toBe('00:00');
    expect(formatClock(59.9)).toBe('00:59');
  });

  it('payload tóm tắt gọn, đủ để lưu vào nhật ký', () => {
    const form = buildExamForm(banks, 'part2', { random: seeded(1) });
    const payload = examSummaryPayload(scoreExam(form, {}), { mode: 'part2', seconds: 100, timedOut: false });
    expect(payload).toMatchObject({ mode: 'part2', seconds: 100, timedOut: false, correct: 0, total: 25 });
    expect(payload.byPart).toEqual({ part2: { correct: 0, total: 25 } });
  });
});

describe('availability / modeStatus', () => {
  it('đếm số câu có sẵn của từng phần (bộ đếm theo số câu, bỏ mục đã gỡ)', () => {
    const avail = availability({ ...banks, part2: [{ ...banks.part2[0], status: 'retired' }, ...banks.part2.slice(1)] });
    expect(avail.part2).toEqual({ have: 71, need: 25 });
    expect(avail.part3).toEqual({ have: 39, need: 39 });
    expect(avail.part6).toEqual({ have: 16, need: 16 });
    expect(avail.part7.have).toBe(15 * 2 + 3 * 5 + 4 * 5);
  });

  it('chế độ đủ nội dung: làm được, không thiếu', () => {
    expect(modeStatus('full', availability(banks))).toEqual({ playable: true, missing: 0, total: 194 });
  });

  it('thiếu nội dung: vẫn làm được nếu có ít nhất một phần, báo thiếu bao nhiêu; không có gì thì không làm được', () => {
    const thin = availability({ part2: flat('l2', 10), part5: [], sets: { 3: [], 4: [], 6: [], 7: [] } });
    expect(modeStatus('full', thin)).toEqual({ playable: true, missing: 194 - 10, total: 194 });
    expect(modeStatus('part5', thin).playable).toBe(false);
    expect(modeStatus('listening', thin).missing).toBe(94 - 10);
  });
});
