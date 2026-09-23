/**
 * Collocation TOEIC: học theo CỤM, không phải theo từng từ.
 *
 * Vì sao có file riêng thay vì dùng trường `collocations` của mỗi từ trong deck: trường đó do AI sinh
 * theo từng từ nên 95% ra tổ hợp tính từ + danh từ mô tả (`textile industry`, `corporate campus`) —
 * đó là từ vựng, không phải cụm đáng học. Thứ TOEIC thật sự hỏi là cụm mà chọn sai động từ / giới từ là
 * sai cả câu: `pay attention` chứ không phải `give attention`. Bộ này tuyển thủ công, có kèm dạng sai
 * hay mắc, nằm ở `public/content/collocations.json`.
 */
import { fold } from './word-library.js';

/**
 * Lọc theo từ khoá. Tìm cả trong nghĩa tiếng Việt (không cần gõ dấu) và trong dạng SAI —
 * gõ "give attention" phải ra được "pay attention to" thì mới sửa được lỗi mình đang mắc.
 * @param {object[]} list
 * @param {string} query
 * @returns {object[]}
 */
export function filterCollocations(list, query) {
  const needle = fold(query ?? '');
  if (needle === '') return list;
  return list.filter((c) => fold(`${c.chunk} ${c.vi} ${c.wrong ?? ''} ${c.example ?? ''}`).includes(needle));
}

/**
 * Nhóm theo `theme` có sẵn trong dữ liệu, giữ nguyên thứ tự xuất hiện trong file
 * (đã xếp từ nhóm hay gặp nhất xuống) — không sắp xếp lại theo bảng chữ cái.
 * @param {object[]} list
 * @returns {Map<string, object[]>}
 */
export function groupByTheme(list) {
  const groups = new Map();
  for (const c of list) {
    if (!groups.has(c.theme)) groups.set(c.theme, []);
    groups.get(c.theme).push(c);
  }
  return groups;
}
