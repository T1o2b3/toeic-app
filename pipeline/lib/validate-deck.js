/**
 * Kiểm tra một deck từ vựng theo schemas/vocab.schema.json.
 * Dùng cả trong pipeline (trước khi ghi file) lẫn trong test.
 */
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';

const schemaPath = new URL('../../schemas/vocab.schema.json', import.meta.url);

/**
 * Tạo hàm kiểm tra deck.
 * @returns {(deck: unknown) => {valid: boolean, errors: string[]}}
 */
export function createDeckValidator() {
  const ajv = addFormats(new Ajv({ allErrors: true }));
  const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));

  return (deck) => {
    const valid = validate(deck);
    const errors = (validate.errors ?? []).map(
      (e) => `${e.instancePath || '(gốc)'} ${e.message}`,
    );
    return { valid, errors };
  };
}

/**
 * Tìm id trùng nhau — schema JSON không kiểm tra được việc này.
 * @param {{entries: Array<{id: string}>}} deck
 * @returns {string[]} danh sách id bị lặp
 */
export function findDuplicateIds(deck) {
  const seen = new Set();
  const duplicates = new Set();
  for (const entry of deck?.entries ?? []) {
    if (seen.has(entry.id)) duplicates.add(entry.id);
    seen.add(entry.id);
  }
  return [...duplicates];
}
