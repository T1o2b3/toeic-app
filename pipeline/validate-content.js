/**
 * Kiểm tra mọi file nội dung trong public/content/ theo schema.
 * Chạy: npm run validate:content
 * Dùng trước khi commit nội dung mới, và bất cứ khi nào nghi ngờ file bị sửa tay.
 */
import { readFileSync, existsSync } from 'node:fs';
import { createDeckValidator, findDuplicateIds } from './lib/validate-deck.js';

const ROOT = new URL('..', import.meta.url);
const DECKS = ['public/content/vocab-toeic-tsl.json'];

const validate = createDeckValidator();
let failed = false;
let checked = 0;

for (const relative of DECKS) {
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

  if (valid && duplicates.length === 0) {
    console.log(`✓ ${relative}: ${deck.entries.length} mục, hợp lệ (${deck.attribution.license})`);
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
