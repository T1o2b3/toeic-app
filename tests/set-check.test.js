import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  isWellFormedQuestion, isWellFormedSet, setKey, crossCheckSets, moveOptionTo, voicesForScript,
  assembleSet, MALE_VOICES, FEMALE_VOICES,
} from '../pipeline/lib/set-check.js';
import {
  buildSetPrompt, buildSetVerifyPrompt, materialText, SET_TYPES, SET_TYPE_DEFINITIONS, configKey,
} from '../pipeline/lib/prompt-sets.js';
import { removeOrphanAudio, usedAudio } from '../pipeline/lib/audio-files.js';
import { createValidator } from '../pipeline/lib/validate-deck.js';

const question = (over = {}) => ({
  stem: 'What is the conversation mainly about?',
  options: { A: 'A late delivery', B: 'A hiring plan', C: 'A budget cut', D: 'A new office' },
  answer: 'A', errorType: 'gist',
  explanation: 'Hai người bàn về việc lô hàng bị giao trễ và cách xử lý.', trap: 'Các phương án khác nghe liên quan đến công việc.',
  ...over,
});
const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');
const conversation = (over = {}) => ({
  title: 'Delayed shipment',
  script: [
    { speaker: 'Woman', text: `Hi Tom, ${words(15)}` }, { speaker: 'Man', text: `Well, ${words(15)}` },
    { speaker: 'Woman', text: `Okay, ${words(15)}` }, { speaker: 'Man', text: `Right, ${words(15)}` },
  ],
  questions: [question(), question({ answer: 'B' }), question({ answer: 'C' })],
  ...over,
});
const reading = (n, over = {}) => ({
  title: 'Email',
  passages: Array.from({ length: n }, (_, i) => ({ label: `Doc ${i + 1}`, text: words(40) })),
  questions: [question(), question(), question(), question(), question()].slice(0, 4),
  ...over,
});
const blanks = (text = `Dear all, [1] ${words(30)} [2] ${words(10)} [3] and [4] end.`) => reading(1, { passages: [{ label: 'Email', text }] });

describe('isWellFormedQuestion', () => {
  it('câu đủ cấu trúc thì qua', () => expect(isWellFormedQuestion(question())).toBe(true));

  it.each([
    ['thiếu đề', { stem: '' }], ['đáp án ngoài A-D', { answer: 'E' }],
    ['hai phương án giống nhau', { options: { A: 'x', B: 'X', C: 'y', D: 'z' } }],
    ['phương án kiểu "all of the above"', { options: { A: 'a1', B: 'b1', C: 'c1', D: 'All of the above' } }],
    ['lời giải quá ngắn', { explanation: 'ngắn' }],
    ['lời giải nhắc chữ cái', { explanation: 'Đáp án B đúng vì nói về giờ giao hàng trễ.' }],
    ['bẫy nhắc chữ cái', { trap: 'Câu A hấp dẫn vì có từ giống.' }],
    ['lời giải bằng tiếng Anh (flash-lite từng làm thế)', { explanation: 'The text states that the delivery was late by two days.' }],
    ['bẫy bằng tiếng Anh', { trap: 'It repeats a word from the passage but changes the meaning.' }],
  ])('loại: %s', (_n, over) => expect(isWellFormedQuestion(question(over))).toBe(false));
});

describe('isWellFormedSet', () => {
  it('Part 3 hợp lệ; thiếu câu hoặc quá ít lượt nói thì loại', () => {
    expect(isWellFormedSet(3, undefined, conversation())).toBe(true);
    expect(isWellFormedSet(3, undefined, conversation({ questions: [question(), question()] }))).toBe(false);
    expect(isWellFormedSet(3, undefined, conversation({ script: conversation().script.slice(0, 2) }))).toBe(false);
  });

  it('Part 4 chỉ cần một lượt nói dài đủ', () => {
    const talk = { title: 'Announcement', script: [{ speaker: 'Speaker', text: words(80) }], questions: conversation().questions };
    expect(isWellFormedSet(4, undefined, talk)).toBe(true);
    expect(isWellFormedSet(4, undefined, { ...talk, script: [{ speaker: 'Speaker', text: 'quá ngắn thôi' }] })).toBe(false);
  });

  it('Part 6 cần đúng 4 chỗ trống [1]..[4], mỗi chỗ một lần', () => {
    expect(isWellFormedSet(6, undefined, blanks())).toBe(true);
    expect(isWellFormedSet(6, undefined, blanks(`Dear all, [1] ${words(40)} [2] [3]`))).toBe(false);
    expect(isWellFormedSet(6, undefined, blanks(`[1] [1] [2] [3] [4] ${words(40)}`))).toBe(false);
  });

  it('Part 7: số tài liệu và số câu đúng theo dạng', () => {
    expect(isWellFormedSet(7, 'single', reading(1, { questions: [question(), question()] }))).toBe(true);
    expect(isWellFormedSet(7, 'single', reading(1, { questions: [question()] }))).toBe(false);
    expect(isWellFormedSet(7, 'double', reading(2, { questions: Array(5).fill(question()) }))).toBe(true);
    expect(isWellFormedSet(7, 'double', reading(1, { questions: Array(5).fill(question()) }))).toBe(false);
    expect(isWellFormedSet(7, 'triple', reading(3, { questions: Array(5).fill(question()) }))).toBe(true);
    expect(isWellFormedSet(7, 'triple', reading(2, { questions: Array(5).fill(question()) }))).toBe(false);
  });
});

describe('crossCheckSets', () => {
  const items = [conversation(), conversation({ title: 'Other' })];
  it('chỉ nhận bộ mà MỌI câu đều khớp; lệch một câu là loại cả bộ', () => {
    const { agreed, rejected } = crossCheckSets(items, [
      { index: 1, answers: ['A', 'B', 'C'] },
      { index: 2, answers: ['A', 'B', 'D'] },
    ]);
    expect(agreed).toHaveLength(1);
    expect(rejected).toEqual([{ item: items[1], reason: 'lệch đáp án' }]);
  });

  it('thiếu câu trả lời hoặc không có kết quả thì "không giải được"', () => {
    const { rejected } = crossCheckSets(items, [{ index: 1, answers: ['A', 'B'] }]);
    expect(rejected.map((r) => r.reason)).toEqual(['không giải được', 'không giải được']);
  });

  it('chịu được chữ thường, có khoảng trắng, và phản hồi rác', () => {
    expect(crossCheckSets(items.slice(0, 1), [{ index: 1, answers: [' a', 'b ', 'C.'] }]).agreed).toHaveLength(1);
    expect(crossCheckSets(items, undefined).agreed).toHaveLength(0);
    expect(crossCheckSets(items, [null, { index: 'x' }]).agreed).toHaveLength(0);
  });
});

describe('moveOptionTo', () => {
  it.each(['A', 'B', 'C', 'D'])('đưa đáp án đúng về %s, không mất/nhân đôi phương án, giữ thứ tự 3 phương án còn lại', (target) => {
    const q = question({ answer: 'B' });
    const moved = moveOptionTo(q, target);
    expect(moved.answer).toBe(target);
    expect(moved.options[target]).toBe(q.options.B);
    expect(Object.values(moved.options).sort()).toEqual(Object.values(q.options).sort());
    const others = Object.entries(moved.options).filter(([k]) => k !== target).map(([, v]) => v);
    expect(others).toEqual(['A', 'C', 'D'].map((k) => q.options[k]));
  });
});

describe('voicesForScript', () => {
  const script = [{ speaker: 'Woman' }, { speaker: 'Man' }, { speaker: 'Woman' }, { speaker: 'Man 2' }];
  it('nam/nữ theo nhãn; hai người nam khác giọng nhau', () => {
    for (let i = 0; i < 12; i += 1) {
      const v = voicesForScript(script, i);
      expect(FEMALE_VOICES).toContain(v.Woman);
      expect(MALE_VOICES).toContain(v.Man);
      expect(MALE_VOICES).toContain(v['Man 2']);
      expect(v.Man).not.toBe(v['Man 2']);
    }
  });

  it('nhãn "Speaker" xen kẽ nam/nữ theo thứ tự bộ, và xoay vòng nhiều giọng', () => {
    const genders = [0, 1].map((i) => voicesForScript([{ speaker: 'Speaker' }], i).Speaker);
    expect(MALE_VOICES).toContain(genders[0]);
    expect(FEMALE_VOICES).toContain(genders[1]);
    expect(new Set(Array.from({ length: 6 }, (_, i) => voicesForScript([{ speaker: 'Man' }], i).Man)).size).toBe(MALE_VOICES.length);
  });
});

describe('assembleSet', () => {
  const cached = { id: 'p3-0001', part: 3, ...conversation() };

  it('đánh id câu, xoay đáp án theo số thứ tự câu toàn cục, không sửa bản thảo gốc', () => {
    const { entry } = assembleSet(cached, { part: 3, index: 0, questionOffset: 1 });
    expect(entry.questions.map((q) => q.id)).toEqual(['p3-0001-1', 'p3-0001-2', 'p3-0001-3']);
    expect(entry.questions.map((q) => q.answer)).toEqual(['B', 'C', 'D']);
    expect(cached.questions[0].answer).toBe('A');
  });

  it('Part 3/4: một đoạn âm thanh cho mỗi lượt nói, đường dẫn đúng mẫu, người nói khác giọng nhau', () => {
    const { entry, clips } = assembleSet(cached, { part: 3, index: 2, questionOffset: 0 });
    expect(clips).toHaveLength(cached.script.length);
    expect(entry.audio.clips).toEqual(clips.map((c) => c.path));
    for (const c of clips) expect(c.path).toMatch(/^audio\/[0-9a-f]{16}\.mp3$/);
    expect(entry.audio.voices.Woman).not.toBe(entry.audio.voices.Man);
  });

  it('Part 6/7: không có âm thanh', () => {
    const { entry, clips } = assembleSet({ id: 'p6-0001', part: 6, ...blanks() }, { part: 6, index: 0, questionOffset: 0 });
    expect(clips).toEqual([]);
    expect(entry.audio).toBeUndefined();
  });

  it('kết quả qua schema set.schema.json (Part 3 và Part 6)', () => {
    const validate = createValidator(new URL('../schemas/set.schema.json', import.meta.url).pathname);
    const base = { set: 'x-core', status: 'active', gen: { model: 'm', promptVersion: 'sets-v1', batch: 'b', date: '2026-09-20' }, verify: { model: 'n', agreed: true } };
    const p3 = assembleSet({ id: 'p3-0001', part: 3, kind: 'conversation', ...conversation(), ...base }, { part: 3, index: 0, questionOffset: 0 }).entry;
    expect(validate({ set: 'part3-core', part: 3, version: 1, entries: [p3] }).valid).toBe(true);
    const p6 = assembleSet({ id: 'p6-0001', part: 6, kind: 'text-completion', ...blanks(), ...base }, { part: 6, index: 0, questionOffset: 0 }).entry;
    expect(validate({ set: 'part6-core', part: 6, version: 1, entries: [p6] }).valid).toBe(true);
    // Part 4 (bài nói MỘT người): script một lượt vẫn hợp lệ — lỗi thật đã gặp khi schema đòi tối thiểu 2 lượt
    const talk = assembleSet({ id: 'p4-0001', part: 4, kind: 'talk', title: 'Announcement', script: [{ speaker: 'Speaker', text: words(80) }], questions: conversation().questions, ...base }, { part: 4, index: 0, questionOffset: 0 }).entry;
    expect(validate({ set: 'part4-core', part: 4, version: 1, entries: [talk] }).valid).toBe(true);
    // Part 3 mà thiếu âm thanh, hoặc Part 6 mà có script: schema phải từ chối
    expect(validate({ set: 'part3-core', part: 3, version: 1, entries: [{ ...p3, audio: undefined }] }).valid).toBe(false);
    expect(validate({ set: 'part6-core', part: 6, version: 1, entries: [{ ...p6, script: p3.script }] }).valid).toBe(false);
  });
});

describe('setKey', () => {
  it('cùng tiêu đề và mở đầu thì trùng; khác thì không', () => {
    expect(setKey(conversation())).toBe(setKey(conversation()));
    expect(setKey(conversation({ title: 'Different' }))).not.toBe(setKey(conversation()));
  });
});

describe('prompt', () => {
  it('nêu số bộ, chủ đề, định nghĩa dạng câu và cấm nhắc chữ cái', () => {
    const prompt = buildSetPrompt({ part: 6, count: 3, topics: ['a budget approval'] });
    expect(prompt).toContain('3');
    expect(prompt).toContain('a budget approval');
    expect(prompt).toContain('sentence-insertion:');
    expect(prompt).toMatch(/KHÔNG nhắc chữ cái A, B, C, D/);
    expect(prompt).toMatch(/không chép lại|không chép/i);
  });

  it('mỗi Part/dạng có prompt riêng; Part không hỗ trợ thì báo lỗi', () => {
    for (const [part, variant] of [[3], [4], [6], [7, 'single'], [7, 'double'], [7, 'triple']]) {
      expect(buildSetPrompt({ part, variant, count: 1 }).length).toBeGreaterThan(300);
    }
    expect(() => buildSetPrompt({ part: 5, count: 1 })).toThrow();
    expect(configKey(7, 'double')).toBe('7-double');
    expect(configKey(3)).toBe(3);
  });

  it('mọi dạng câu đều có định nghĩa và khớp enum schema', () => {
    const schema = JSON.parse(readSchema());
    expect([...SET_TYPES].sort()).toEqual([...schema.$defs.question.properties.errorType.enum].sort());
    for (const type of SET_TYPES) expect(SET_TYPE_DEFINITIONS[type].length).toBeGreaterThan(10);
  });

  it('prompt kiểm định KHÔNG lộ đáp án và đánh số bộ + số câu', () => {
    const prompt = buildSetVerifyPrompt([conversation()]);
    expect(prompt).toContain('#1');
    expect(prompt).toContain('Q3.');
    expect(prompt).not.toContain('"answer"');
    expect(materialText(conversation())).toContain('Woman: Hi Tom');
    expect(() => buildSetVerifyPrompt([])).toThrow();
  });
});

describe('dọn âm thanh mồ côi dùng chung mọi phần nghe', () => {
  let dir;
  const touch = (name) => writeFileSync(join(dir, 'audio', name), 'x');
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'pub-'));
    mkdirSync(join(dir, 'audio')); mkdirSync(join(dir, 'content'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('giữ file được BẤT KỲ bộ nghe nào (Part 2, 3, 4) dùng, chỉ xoá file không ai dùng', () => {
    writeFileSync(join(dir, 'content', 'listening-part2.json'), '{"a":"audio/aaaaaaaaaaaaaaaa.mp3"}');
    writeFileSync(join(dir, 'content', 'sets-part3.json'), '{"a":["audio/bbbbbbbbbbbbbbbb.mp3"]}');
    for (const n of ['aaaaaaaaaaaaaaaa.mp3', 'bbbbbbbbbbbbbbbb.mp3', 'cccccccccccccccc.mp3']) touch(n);
    expect(removeOrphanAudio(`${dir}/`)).toEqual(['cccccccccccccccc.mp3']);
    expect(existsSync(join(dir, 'audio', 'aaaaaaaaaaaaaaaa.mp3'))).toBe(true);
    expect(existsSync(join(dir, 'audio', 'bbbbbbbbbbbbbbbb.mp3'))).toBe(true);
  });

  it('không có file nội dung nào thì xoá hết, thư mục audio không có thì không lỗi', () => {
    touch('dddddddddddddddd.mp3');
    expect(usedAudio(`${dir}/`).size).toBe(0);
    expect(removeOrphanAudio(`${dir}/`)).toHaveLength(1);
    rmSync(join(dir, 'audio'), { recursive: true });
    expect(removeOrphanAudio(`${dir}/`)).toEqual([]);
  });

  it('không đụng file không phải .mp3', () => {
    touch('keep.txt');
    removeOrphanAudio(`${dir}/`);
    expect(existsSync(join(dir, 'audio', 'keep.txt'))).toBe(true);
  });
});

import { readFileSync } from 'node:fs';
function readSchema() { return readFileSync(new URL('../schemas/set.schema.json', import.meta.url), 'utf8'); }
