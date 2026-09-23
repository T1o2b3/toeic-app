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
    /** Bản sao nông toàn bộ cache, để duyệt qua mà không sửa nhầm dữ liệu gốc. */
    snapshot: () => ({ ...data }),
    save() {
      if (!dirty) return;
      mkdirSync(dirname(filePath), { recursive: true });
      writeFileSync(filePath, JSON.stringify(data, null, 2));
      dirty = false;
    },
  };
}

/**
 * Mở cache làm việc của một pipeline sinh nội dung, NẠP TRƯỚC nội dung đã phát hành (D62).
 *
 * File đã phát hành (`public/content/*.json`, nằm trong git) là nguồn chuẩn; cache chỉ là kho nháp của máy đang
 * chạy (nằm trong .gitignore — máy khác không có). Không nạp trước thì:
 *   - máy KHÔNG có cache: id đánh lại từ 1, ghi đè câu cũ (nhật ký học trỏ nhầm câu — ràng buộc #6) và
 *     bước dọn âm thanh xoá luôn MP3 của chúng;
 *   - máy CÓ cache: mất chỗ sửa tay trên file phát hành (lời giải đã dịch D60, câu đánh dấu retired).
 *
 * @param {string} cachePath
 * @param {string} publishedPath
 * @returns {{cache: ReturnType<typeof openCache>, published: Set<string>}} `published`: id đã phát hành —
 *   lúc ghi file giữ NGUYÊN các mục này, không lắp ráp/lọc lại
 */
export function openWorkCache(cachePath, publishedPath) {
  const cache = openCache(cachePath);
  const published = new Set();
  if (existsSync(publishedPath)) {
    // File hỏng thì để lỗi nổi lên: coi như rỗng rồi ghi đè là mất sạch nội dung đã phát hành.
    for (const entry of JSON.parse(readFileSync(publishedPath, 'utf8')).entries ?? []) {
      cache.set(entry.id, entry);
      published.add(entry.id);
    }
  }
  return { cache, published };
}

/**
 * Id kế tiếp = số lớn nhất đang dùng + 1. Không dùng số lượng: lệch ngay khi có id bị bỏ, sinh ra id trùng.
 * @param {string} prefix - vd "p5-", "l2-", "p3-"
 * @param {Iterable<string>} ids
 * @returns {string}
 */
export function nextId(prefix, ids) {
  let max = 0;
  for (const id of ids) {
    if (!id.startsWith(prefix)) continue;
    const n = Number(id.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
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
