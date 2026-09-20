/**
 * Kiểm tra mọi file nội dung trong public/content/ theo schema.
 * Chạy: npm run validate:content
 * Dùng trước khi commit nội dung mới, và bất cứ khi nào nghi ngờ file bị sửa tay.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createValidator, findDuplicateIds } from './lib/validate-deck.js';

const ROOT = new URL('..', import.meta.url);
const FILES = [
  { file: 'public/content/vocab-toeic-tsl.json', schema: 'schemas/vocab.schema.json', label: 'từ vựng' },
  { file: 'public/content/vocab-toeic-bsl.json', schema: 'schemas/vocab.schema.json', label: 'từ vựng' },
  { file: 'public/content/questions-part5.json', schema: 'schemas/question.schema.json', label: 'câu hỏi Part 5' },
  { file: 'public/content/listening-part2.json', schema: 'schemas/listening.schema.json', label: 'câu nghe Part 2' },
];
/** Các đường dẫn âm thanh được câu nghe tham chiếu nhưng không có trong public/. */
function missingAudioFiles(bank) {
  const paths = bank.entries.flatMap((entry) => Object.values(entry.audio));
  return [...new Set(paths)].filter((p) => !existsSync(new URL(`public/${p}`, ROOT).pathname));
}

let failed = false;
let checked = 0;

for (const { file: relative, schema, label } of FILES) {
  const validate = createValidator(new URL(schema, ROOT));
  const filePath = new URL(relative, ROOT).pathname;
  if (!existsSync(filePath)) {
    console.log(`- ${relative}: chưa có (bỏ qua)`);
    continue;
  }
  checked += 1;

  let deck;
  try {
    deck = JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`✗ ${relative}: không đọc được JSON — ${error.message}`);
    failed = true;
    continue;
  }

  const { valid, errors } = validate(deck);
  const duplicates = findDuplicateIds(deck);

  // Câu nghe: mọi file âm thanh được tham chiếu phải tồn tại, nếu không app có câu không ra tiếng.
  const missingAudio = valid && deck.part === 2 ? missingAudioFiles(deck) : [];
  if (missingAudio.length > 0) {
    failed = true;
    console.error(`✗ ${relative}: thiếu ${missingAudio.length} file âm thanh (vd ${missingAudio.slice(0, 3).join(', ')})`);
    continue;
  }

  if (valid && duplicates.length === 0) {
    const extra = deck.attribution ? ` (${deck.attribution.license})` : '';
    console.log(`✓ ${relative}: ${deck.entries.length} mục ${label}, hợp lệ${extra}`);
  } else {
    failed = true;
    console.error(`✗ ${relative}: KHÔNG hợp lệ`);
    for (const error of errors.slice(0, 20)) console.error('   ', error);
    if (errors.length > 20) console.error(`    ...và ${errors.length - 20} lỗi nữa`);
    if (duplicates.length) console.error('    id trùng:', duplicates.join(', '));
  }
}

if (checked === 0) console.log('Chưa có file nội dung nào để kiểm tra.');
process.exitCode = failed ? 1 : 0;
