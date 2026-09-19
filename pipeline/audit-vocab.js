/**
 * Soi chất lượng deck từ vựng trước khi Huy duyệt.
 * Chạy: npm run audit:vocab          -> báo cáo + 30 từ ngẫu nhiên để duyệt
 *       npm run audit:vocab -- 10    -> lấy 10 từ ngẫu nhiên
 *
 * Không sửa gì, chỉ đọc và báo cáo. Mục đích: phát hiện lô kém để gỡ theo gen.model (D13).
 */
import { readFileSync } from 'node:fs';

const DECK = new URL('../public/content/vocab-toeic-tsl.json', import.meta.url).pathname;
const sampleSize = Number.parseInt(process.argv[2], 10) || 30;

const deck = JSON.parse(readFileSync(DECK, 'utf8'));
const entries = deck.entries;

console.log(`Deck "${deck.deck}": ${entries.length} mục — ${deck.attribution.license}\n`);

const byModel = {};
for (const entry of entries) byModel[entry.gen.model] = (byModel[entry.gen.model] ?? 0) + 1;
console.log('Sinh bởi model:');
for (const [model, count] of Object.entries(byModel)) console.log(`  ${model}: ${count} mục`);

const stats = {
  'thiếu IPA': entries.filter((e) => !e.ipa).length,
  'thiếu note (bẫy TOEIC)': entries.filter((e) => !e.note).length,
  'thiếu collocation': entries.filter((e) => !e.collocations?.length).length,
  'chỉ có 1 ví dụ': entries.filter((e) => e.examples.length < 2).length,
  'nghĩa Việt dài quá 15 chữ': entries.filter((e) => e.vi.split(/\s+/).length > 15).length,
  'ví dụ ngắn dưới 8 chữ': entries.filter((e) => e.examples.some((ex) => ex.en.split(/\s+/).length < 8)).length,
  'ví dụ không chứa chính từ đó': entries.filter(
    (e) => !e.examples.some((ex) => new RegExp(e.word.slice(0, Math.max(4, e.word.length - 3)), 'i').test(ex.en)),
  ).length,
};

console.log('\nDấu hiệu cần để mắt:');
for (const [label, count] of Object.entries(stats)) {
  const percent = ((count / entries.length) * 100).toFixed(1);
  console.log(`  ${count === 0 ? '✓' : '!'} ${label}: ${count} (${percent}%)`);
}

// Câu ví dụ lặp lại giữa các từ là dấu hiệu AI sinh cho có.
const sentences = new Map();
for (const entry of entries) {
  for (const example of entry.examples) {
    const key = example.en.toLowerCase();
    sentences.set(key, (sentences.get(key) ?? 0) + 1);
  }
}
const repeated = [...sentences.entries()].filter(([, count]) => count > 1);
console.log(`  ${repeated.length === 0 ? '✓' : '!'} câu ví dụ bị dùng lại cho nhiều từ: ${repeated.length}`);
for (const [sentence, count] of repeated.slice(0, 3)) console.log(`      (${count}×) ${sentence.slice(0, 70)}...`);

console.log(`\n${'='.repeat(70)}\n${sampleSize} TỪ NGẪU NHIÊN ĐỂ DUYỆT\n${'='.repeat(70)}`);
const shuffled = [...entries].sort(() => Math.random() - 0.5).slice(0, sampleSize);
for (const entry of shuffled.sort((a, b) => a.rank - b.rank)) {
  console.log(`\n▸ ${entry.word} ${entry.ipa ?? ''} [${entry.pos.join('/')}] — hạng ${entry.rank}`);
  console.log(`  nghĩa: ${entry.vi}`);
  for (const example of entry.examples) console.log(`  · ${example.en}\n    ${example.vi}`);
  if (entry.collocations?.length) console.log(`  cụm: ${entry.collocations.join(' | ')}`);
  if (entry.note) console.log(`  bẫy: ${entry.note}`);
}
