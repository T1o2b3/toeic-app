import { describe, it, expect } from 'vitest';
import { shuffle, seededRandom, seededOrder, shuffleChoices, originalLetter, mentionsChoiceLetter } from '../src/logic/shuffle.js';
import { mentionsChoiceLetter as pipelineMentions } from '../pipeline/lib/prompt-listening.js';

const ids = (list) => list.map((x) => x.id);

describe('seededOrder — thứ tự ngẫu nhiên nhưng cố định trong một lượt', () => {
  const list = Array.from({ length: 50 }, (_, i) => ({ id: `tsl-${String(i).padStart(4, '0')}` }));

  it('cùng hạt giống → cùng thứ tự; khác hạt giống → thứ tự khác; không mất phần tử', () => {
    expect(ids(seededOrder(list, 7))).toEqual(ids(seededOrder(list, 7)));
    expect(ids(seededOrder(list, 7))).not.toEqual(ids(seededOrder(list, 8)));
    expect(ids(seededOrder(list, 7)).sort()).toEqual(ids(list));
    expect(ids(seededOrder(list, 7))).not.toEqual(ids(list));          // không còn đi tuyến tính
  });

  it('bỏ bớt phần tử (vừa chấm xong) thì thứ tự phần còn lại KHÔNG đổi — từ đang hiện không nhảy', () => {
    const full = ids(seededOrder(list, 3));
    const without = ids(seededOrder(list.filter((x) => x.id !== full[0]), 3));
    expect(without).toEqual(full.slice(1));
  });

  it('trộn đều: 3 nhóm cỡ bằng nhau thì 30 phần tử đầu có đủ cả 3 nhóm', () => {
    const mixed = ['core', 'mid', 'col'].flatMap((g) => Array.from({ length: 100 }, (_, i) => ({ id: `${g}-${i}` })));
    const head = seededOrder(mixed, 11).slice(0, 30).map((x) => x.id.split('-')[0]);
    expect(new Set(head)).toEqual(new Set(['core', 'mid', 'col']));
  });
});

describe('shuffleChoices — xáo phương án mỗi lần câu hiện ra', () => {
  const p5 = {
    id: 'p5-0001', stem: 'The ---- report.', answer: 'A', explanation: 'Cần tính từ.',
    options: { A: 'annual', B: 'annually', C: 'annuity', D: 'annualize' },
  };

  it('đáp án đúng đi theo NỘI DUNG; quy được chữ cái hiển thị về chữ cái gốc để ghi nhật ký', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const view = shuffleChoices(p5, seededRandom(seed));
      expect(view.options[view.answer]).toBe('annual');
      expect(Object.values(view.options).sort()).toEqual(Object.values(p5.options).sort());
      for (const letter of ['A', 'B', 'C', 'D']) expect(p5.options[originalLetter(view, letter)]).toBe(view.options[letter]);
    }
  });

  it('nhiều lần xáo thì đáp án rơi vào đủ 4 vị trí (hết lệch A)', () => {
    const seen = new Set(Array.from({ length: 40 }, (_, s) => shuffleChoices(p5, seededRandom(s + 1)).answer));
    expect(seen).toEqual(new Set(['A', 'B', 'C', 'D']));
  });

  it('Part 2: câu đáp và file âm thanh đổi chỗ CÙNG NHAU; file câu hỏi giữ nguyên', () => {
    const p2 = {
      id: 'l2-0001', question: 'Where?', answer: 'B', explanation: 'x',
      responses: { A: 'ra', B: 'rb', C: 'rc' }, audio: { question: 'q.mp3', A: 'a.mp3', B: 'b.mp3', C: 'c.mp3' },
    };
    const view = shuffleChoices(p2, seededRandom(5));
    const fileOf = { ra: 'a.mp3', rb: 'b.mp3', rc: 'c.mp3' };
    for (const letter of ['A', 'B', 'C']) expect(view.audio[letter]).toBe(fileOf[view.responses[letter]]);
    expect(view.audio.question).toBe('q.mp3');
    expect(view.responses[view.answer]).toBe('rb');
  });

  it('lời giải nhắc chữ cái ("Phương án B…") thì KHÔNG xáo — xáo là lời giải nói sai', () => {
    const view = shuffleChoices({ ...p5, trap: 'Phương án B sai vì là trạng từ.' }, seededRandom(1));
    expect(view.options).toEqual(p5.options);
    expect(originalLetter(view, 'C')).toBe('C');
  });

  it('câu gốc không bị sửa', () => {
    const before = JSON.stringify(p5);
    shuffleChoices(p5, seededRandom(9));
    expect(JSON.stringify(p5)).toBe(before);
  });
});

describe('mentionsChoiceLetter — bản của app phải khớp bản của pipeline', () => {
  it.each([
    'Phương án B sai.', "Người học dễ chọn 'Having exhausted' (D).", 'Câu B và C đều sai.', 'Correct answer B is indirect.',
    'Người học không dịch nghĩa toàn câu dễ bị sập bẫy.', 'Đây là câu bị động.', 'A manager may approve it.', '',
  ])('%s', (text) => {
    expect(mentionsChoiceLetter(text)).toBe(pipelineMentions(text));
  });
});

describe('shuffle (có sẵn)', () => {
  it('giữ đủ phần tử', () => {
    expect(shuffle([1, 2, 3, 4], seededRandom(1)).sort()).toEqual([1, 2, 3, 4]);
  });
});
