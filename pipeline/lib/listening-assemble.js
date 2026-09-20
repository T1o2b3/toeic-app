/**
 * Lắp ráp câu nghe hoàn chỉnh từ bản thảo đã qua kiểm định. Hàm thuần, không gọi mạng.
 */
import { audioPath, voicesFor } from './tts.js';

const LETTERS = ['A', 'B', 'C'];

/**
 * Đưa đáp án đúng về chữ cái `target` mà không đụng thứ tự tương đối của hai câu đáp còn lại.
 *
 * AI ra đề hay dồn đáp án vào B. Với Part 2 xoay được vì ba câu đáp là ba đoạn âm thanh rời nhau,
 * không câu nào nhắc tới "phương án trên" — nên đổi chỗ không đổi nội dung câu nào.
 *
 * @param {{responses: Record<string, string>, answer: string}} item
 * @param {string} target - 'A' | 'B' | 'C'
 * @returns {{responses: Record<string, string>, answer: string}}
 */
export function moveAnswerTo(item, target) {
  const correct = item.responses[item.answer];
  const others = LETTERS.filter((l) => l !== item.answer).map((l) => item.responses[l]);
  const responses = {};
  let next = 0;
  for (const letter of LETTERS) responses[letter] = letter === target ? correct : others[next++];
  return { responses, answer: target };
}

/**
 * Chữ cái đáp án đích cho câu thứ `index`: xoay A, B, C nên cả bộ chia đều.
 * @param {number} index
 * @returns {string}
 */
export function targetLetter(index) {
  return LETTERS[index % LETTERS.length];
}

/**
 * Dựng bản ghi cuối cùng: cân bằng đáp án, gán giọng, tính đường dẫn âm thanh.
 * @param {object} cached - bản thảo trong cache (question, responses, answer, errorType, explanation, trap, gen, verify)
 * @param {number} index - thứ tự 0-based của câu trong bộ (quyết định giọng và chữ cái đáp án)
 * @returns {{entry: object, clips: Array<{text: string, voice: string, path: string}>}}
 */
export function assembleEntry(cached, index) {
  const { responses, answer } = moveAnswerTo(cached, targetLetter(index));
  const voices = voicesFor(index);
  const audio = {
    question: audioPath(cached.question, voices.question),
    A: audioPath(responses.A, voices.responses),
    B: audioPath(responses.B, voices.responses),
    C: audioPath(responses.C, voices.responses),
  };
  const entry = {
    ...cached,
    responses,
    answer,
    audio,
    voices,
    // Người giải độc lập đã đồng ý về NỘI DUNG câu đúng; chữ cái đổi theo khi xoay chỗ.
    verify: { ...cached.verify, answer },
  };
  const clips = [
    { text: cached.question, voice: voices.question, path: audio.question },
    ...LETTERS.map((l) => ({ text: responses[l], voice: voices.responses, path: audio[l] })),
  ];
  return { entry, clips };
}
