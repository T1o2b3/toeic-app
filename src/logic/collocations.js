/**
 * Quản lý Collocations (Cụm từ cố định) trích xuất từ kho từ vựng.
 * Collocation là một trong những phần khó nhất của TOEIC vì nó không tuân theo quy tắc ngữ pháp đơn thuần.
 */

/**
 * Trích xuất toàn bộ Collocations từ kho từ vựng.
 * @param {object} store
 * @returns {Array<{word: string, collocation: string, entryId: string}>}
 */
export function getAllCollocations(store) {
  const collocations = [];
  for (const entry of store.entries) {
    if (entry.collocations?.length) {
      for (const coll of entry.collocations) {
        collocations.push({
          word: entry.word,
          collocation: coll,
          entryId: entry.id,
        });
      }
    }
  }
  return collocations;
}

/**
 * Lọc Collocations theo từ khóa hoặc từ chính.
 * @param {Array} collocations
 * @param {string} query
 * @returns {Array}
 */
export function filterCollocations(collocations, query) {
  if (!query) return collocations;
  const needle = query.toLowerCase();
  return collocations.filter((c) => 
    c.word.toLowerCase().includes(needle) || 
    c.collocation.toLowerCase().includes(needle)
  );
}

/**
 * Nhóm Collocations theo từ chính (Primary Word).
 * @param {Array} collocations
 * @returns {Map<string, Array>}
 */
export function groupCollocations(collocations) {
  const groups = new Map();
  for (const c of collocations) {
    if (!groups.has(c.word)) groups.set(c.word, []);
    groups.get(c.word).push(c);
  }
  return groups;
}
