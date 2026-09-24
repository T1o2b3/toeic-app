/**
 * Kiểm tra file nội dung theo schema (schemas/*.schema.json) và ghi file khi đã đạt.
 * Dùng cả trong pipeline (trước khi ghi file) lẫn trong test.
 */
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname } from 'node:path';

const vocabSchemaPath = new URL('../../schemas/vocab.schema.json', import.meta.url);

/**
 * Tạo hàm kiểm tra theo một schema bất kỳ.
 * @param {string|URL} schemaPath
 * @returns {(data: unknown) => {valid: boolean, errors: string[]}}
 */
export function createValidator(schemaPath) {
  const ajv = addFormats(new Ajv({ allErrors: true }));
  const validate = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));

  return (data) => {
    const valid = validate(data);
    const errors = (validate.errors ?? []).map((e) => `${e.instancePath || '(gốc)'} ${e.message}`);
    return { valid, errors };
  };
}

/**
 * Tạo hàm kiểm tra deck từ vựng.
 * @returns {(deck: unknown) => {valid: boolean, errors: string[]}}
 */
export const createDeckValidator = () => createValidator(vocabSchemaPath);

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

/**
 * Kiểm rồi mới ghi một file nội dung: sai schema hoặc trùng id thì KHÔNG ghi (in lỗi, đặt mã thoát 1) — file nội dung
 * hỏng lên app là mất bài. Năm script build-* từng chép tay khối "kiểm → in lỗi → tạo thư mục → ghi" này.
 * @param {string} file - đường dẫn tuyệt đối
 * @param {object} bank
 * @param {string|URL|null} schemaPath - null khi file không có schema (vd narration.json)
 * @param {{error: Function}} [log]
 * @returns {boolean} đã ghi hay chưa
 */
export function writeBank(file, bank, schemaPath, log = console) {
  const { valid, errors } = schemaPath ? createValidator(schemaPath)(bank) : { valid: true, errors: [] };
  const duplicates = findDuplicateIds(bank);
  if (!valid || duplicates.length > 0) {
    log.error(`${basename(file)} KHÔNG hợp lệ, không ghi file:`);
    for (const error of errors.slice(0, 20)) log.error('  -', error);
    if (duplicates.length > 0) log.error('  - id trùng:', duplicates.join(', '));
    process.exitCode = 1;
    return false;
  }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(bank, null, 2)}\n`);
  return true;
}
