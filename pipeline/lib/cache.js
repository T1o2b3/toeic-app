/**
 * Bộ nhớ đệm dạng file JSON, khoá theo từ.
 * Mục đích: pipeline chạy lại được nhiều lần mà không gọi lại AI cho từ đã có —
 * free tier có giới hạn tốc độ nên gần như chắc chắn phải chạy làm nhiều đợt.
 * Thư mục pipeline/.cache/ nằm trong .gitignore.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Mở (hoặc tạo mới) một file cache.
 * @param {string} filePath
 * @returns {{get: (key: string) => unknown, has: (key: string) => boolean,
 *            set: (key: string, value: unknown) => void, size: () => number, save: () => void}}
 */
export function openCache(filePath) {
  let data = {};
  if (existsSync(filePath)) {
    try {
      data = JSON.parse(readFileSync(filePath, 'utf8'));
    } catch {
      // Cache hỏng thì bỏ qua và làm lại từ đầu — không đáng để dừng pipeline.
      data = {};
    }
  }
  let dirty = false;

  return {
    has: (key) => Object.hasOwn(data, key),
    get: (key) => data[key],
    set(key, value) {
      data[key] = value;
      dirty = true;
    },
    size: () => Object.keys(data).length,
    save() {
      if (!dirty) return;
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(data, null, 2));
      dirty = false;
    },
  };
}

/**
 * Chia một mảng thành các lô nhỏ.
 * @template T
 * @param {T[]} items
 * @param {number} size
 * @returns {T[][]}
 */
export function chunk(items, size) {
  if (!Number.isInteger(size) || size < 1) throw new Error(`Kích thước lô không hợp lệ: ${size}`);
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Đọc một mục cache về dạng chuẩn { ai, model, promptVersion, date }.
 * Cache đời đầu chỉ lưu thẳng object AI, chưa kèm thông tin model — những mục đó
 * được gắn thông tin dự phòng để `gen` của mỗi từ vẫn đúng với model đã sinh ra nó (D13).
 * @param {unknown} value
 * @param {{model: string, promptVersion: string, date: string}} fallback
 * @returns {{ai: object, model: string, promptVersion: string, date: string}|null}
 */
export function readCachedAi(value, fallback) {
  if (!value || typeof value !== 'object') return null;
  if (value.ai && typeof value.ai === 'object') {
    return {
      ai: value.ai,
      model: value.model ?? fallback.model,
      promptVersion: value.promptVersion ?? fallback.promptVersion,
      date: value.date ?? fallback.date,
    };
  }
  return { ai: value, ...fallback };
}
