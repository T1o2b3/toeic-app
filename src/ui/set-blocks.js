/**
 * Các khối hiển thị của màn luyện bộ đề (Part 3, 4, 6, 7). Tách khỏi sets-screen.js cho gọn.
 *
 * **Chấm cả bộ một lượt (D42).** Bộ có nhiều câu dựa trên CÙNG một tài liệu, nên chấm ngay từng câu sẽ
 * lộ bài: biết câu 1 sai là đoán được câu 2, 3 nói về gì. Vì vậy chọn đáp án chỉ tô lại (đổi lại được),
 * tới khi trả lời hết cả bộ mới hiện đúng/sai và giải thích — giống thi thật, và đúng ý Huy.
 */
import { el } from './dom.js';
import { gradeSetAnswer } from '../logic/sets.js';
import { pace, targetFor } from '../logic/pace.js';
import { formatClock } from '../logic/exam-time.js';
import { renderStem } from './capture-tray.js';
import { optionList, noticeCard, questionLabel, verdictLine, explanationCard } from './blocks.js';

const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Một câu hỏi của bộ.
 * @param {object} store
 * @param {object} question
 * @param {number} index - vị trí trong bộ (0-based)
 * @param {string|null} picked - chữ cái đã chọn
 * @param {(letter: string) => void} onPick
 * @param {boolean} revealed - đã trả lời hết bộ chưa (mới hiện đúng/sai + giải thích)
 * @returns {HTMLElement}
 */
export function renderQuestion(store, question, index, picked, onPick, revealed) {
  const result = revealed && picked ? gradeSetAnswer(question, picked) : null;
  const blocks = [
    questionLabel(question, index + 1),
    // Chưa chấm thì đổi đáp án thoải mái; chấm rồi thì khoá và mới lộ đúng/sai.
    optionList({
      letters: LETTERS, textOf: (l) => question.options[l], picked,
      answer: revealed ? question.answer : null, locked: revealed, onPick,
      // Chấm xong thì từng từ trong phương án gạt được như chữ trong tài liệu (Huy đề nghị 2026-09-20).
      // KHÔNG làm chip mỗi từ như Part 5: phương án Part 3/4/7 là cả câu — đo trên nội dung thật ra
      // 19–21 từ khác nhau mỗi câu, thành ra cả trăm chip một bộ.
      renderText: (l) => renderStem(store, { stem: question.options[l] }),
    }),
  ];
  if (result) {
    blocks.push(verdictLine(result, question.answer), explanationCard(question));
  }
  return el('section', { class: 'set-q' }, blocks);
}

/** Khoảng chênh so với chuẩn, đọc bằng mắt cho nhanh: dưới một phút thì nói thẳng số giây. */
const gapText = (seconds) => (seconds < 60 ? `${seconds} giây` : formatClock(seconds));

/**
 * Đồng hồ nhịp của bộ đang làm (Huy đề nghị 2026-09-20): ĐO để biết nên tăng tốc hay còn dư giờ,
 * không khoá gì khi quá giờ. Muốn làm bài có đếm ngược thật thì vào màn Thi thử.
 *
 * @param {object} config
 * @param {number} config.part
 * @param {number} config.count - số câu của bộ
 * @param {number|null} config.seconds - đã dùng bao lâu; null = chưa bấm giờ (bộ nghe chưa nghe xong)
 * @param {boolean} config.done - đã chấm xong chưa
 * @returns {HTMLElement}
 */
export function renderPace({ part, count, seconds, done }) {
  const target = targetFor(part, count);
  if (!target) return el('div');
  const goal = `chuẩn ${formatClock(target)} cho ${count} câu`;

  // Phần nghe: nhịp do băng quyết định, nên chỉ đo khoảng TRẢ LỜI sau khi băng dứt (xem logic/pace.js).
  if (seconds === null) return el('div', { class: 'pace', text: `⏱ bấm giờ chạy sau khi nghe xong · ${goal}` });

  if (!done) {
    return el('div', { class: 'pace' }, [
      el('span', { text: '⏱ ' }),
      el('span', { class: 'pace-clock', text: formatClock(seconds) }),
      el('span', { text: ` · ${goal}` }),
    ]);
  }

  const result = pace(seconds, target);
  return el('div', {
    class: result.onPace ? 'pace ok' : 'pace slow',
    text: `⏱ ${formatClock(result.seconds)} · ${goal} — ${result.onPace ? 'nhanh hơn' : 'chậm hơn'} ${gapText(result.diff)}`,
  });
}

/** Nhắc còn mấy câu nữa mới được xem giải thích — để không ai tưởng app quên chấm. */
export function renderHold(left) {
  return noticeCard(`Còn ${left} câu nữa. Trả lời hết cả bộ rồi mới hiện đáp án và giải thích — chấm từng câu sẽ lộ bài cho các câu sau.`);
}

/** Chữ của đoạn vừa nghe, chỉ hiện sau khi trả lời hết. Từng từ gạt được. */
export function renderTranscript(store, set, nowTurn) {
  return el('div', { class: 'card back' }, [
    el('div', { class: 'gaps-title', text: 'Chữ của đoạn vừa nghe' }),
    ...set.script.map((turn, i) => el('div', { class: nowTurn === i ? 'transcript-line now' : 'transcript-line' }, [
      el('span', { class: 'letter', text: shortSpeaker(turn.speaker) }),
      renderStem(store, { stem: turn.text }),
    ])),
  ]);
}

const shortSpeaker = (name) => (name.startsWith('Man') ? 'M' : name.startsWith('Woman') ? 'W' : name[0]);
