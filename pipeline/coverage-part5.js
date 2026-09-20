/**
 * Đo mức phủ của các deck từ vựng lên các câu Part 5 loại "vocabulary".
 * Chạy: npm run audit:coverage
 *
 * Câu hỏi cần trả lời: khi làm Part 5, bao nhiêu phương án (đúng và sai) nằm trong thứ Huy học?
 * Đây là phép đo GIÁ TRỊ THẬT của một deck (D30b) — đếm số từ trong deck không nói lên điều đó.
 * Không sửa gì, chỉ đọc và báo cáo.
 */
import { readFileSync, existsSync } from 'node:fs';
import { projectPath } from './lib/cli.js';

const CONTENT = projectPath('public/content/');
const read = (name) => JSON.parse(readFileSync(`${CONTENT}${name}`, 'utf8'));

const questions = read('questions-part5.json').entries
  .filter((q) => q.status !== 'retired' && q.errorType === 'vocabulary');

const decks = ['tsl', 'bsl']
  .filter((name) => existsSync(`${CONTENT}vocab-toeic-${name}.json`))
  .map((name) => ({ name, words: new Set(read(`vocab-toeic-${name}.json`).entries.map((e) => e.word.toLowerCase())) }));

const inDeck = (word, deckNames) => decks
  .filter((d) => deckNames.includes(d.name))
  .some((d) => d.words.has(String(word).toLowerCase().trim()));

const report = (label, deckNames) => {
  let options = 0; let hit = 0; let answers = 0; let answerHit = 0; let fullSets = 0;
  for (const q of questions) {
    const entries = Object.entries(q.options);
    const hits = entries.map(([letter, text]) => inDeck(text, deckNames));
    options += entries.length;
    hit += hits.filter(Boolean).length;
    answers += 1;
    if (inDeck(q.options[q.answer], deckNames)) answerHit += 1;
    if (hits.every(Boolean)) fullSets += 1;
  }
  const pct = (n, total) => `${((n / total) * 100).toFixed(0)}%`;
  console.log(`${label.padEnd(12)} phương án ${hit}/${options} (${pct(hit, options)}) · đáp án đúng ${answerHit}/${answers} (${pct(answerHit, answers)}) · câu có đủ 4 phương án ${fullSets}/${questions.length}`);
};

console.log(`${questions.length} câu Part 5 loại vocabulary. Deck có mặt: ${decks.map((d) => `${d.name} (${d.words.size})`).join(', ')}\n`);
report('chỉ TSL', ['tsl']);
if (decks.some((d) => d.name === 'bsl')) {
  report('chỉ BSL', ['bsl']);
  report('TSL + BSL', ['tsl', 'bsl']);
}
console.log('\nDự đoán ở D30: 32% (chỉ TSL) → 53% (TSL + BSL). Phần còn thiếu chủ yếu là từ NGSL và dạng phái sinh.');
