/**
 * Quản lý Collocations (Cụm từ cố định) trích xuất từ kho từ vựng.
 * Giúp người học nhận diện các "pattern" xuất hiện thường xuyên trong TOEIC.
 */

/**
 * Bản đồ chủ đề cơ bản cho TOEIC.
 * Sử dụng từ khóa trong cụm từ để phân loại tự động.
 */
const THEME_MAP = {
  'Văn phòng & Công việc': ['office', 'work', 'meeting', 'schedule', 'appointment', 'report', 'colleague', 'staff', 'employee', 'manager', 'deadline'],
  'Nhân sự & Tuyển dụng': ['hire', 'recruit', 'apply', 'resume', 'interview', 'candidate', 'position', 'salary', 'benefit', 'promotion'],
  'Tài chính & Kinh doanh': ['bank', 'payment', 'invoice', 'cost', 'price', 'budget', 'profit', 'tax', 'finance', 'account', 'investment', 'market'],
  'Du lịch & Vận chuyển': ['flight', 'hotel', 'ticket', 'travel', 'trip', 'airport', 'delay', 'reservation', 'destination', 'transit'],
  'Dịch vụ & Khách hàng': ['customer', 'service', 'client', 'complaint', 'refund', 'warranty', 'order', 'delivery', 'support'],
};

/**
 * Xác định chủ đề của một cụm từ dựa trên từ khóa.
 * @param {string} phrase
 * @returns {string} Tên chủ đề hoặc 'Khác'
 */
function getTheme(phrase) {
  const text = phrase.toLowerCase();
  for (const [theme, keywords] of Object.entries(THEME_MAP)) {
    if (keywords.some(kw => text.includes(kw))) return theme;
  }
  return 'Khác';
}

/**
 * Trích xuất toàn bộ Collocations từ kho từ vựng.
 * @param {object} store
 * @returns {Array<{word: string, collocation: string, entryId: string, theme: string}>}
 */
export function getAllCollocations(store) {
  const collocations = [];
  for (const entry of store.entries ?? []) {
    if (entry.collocations?.length) {
      for (const coll of entry.collocations) {
        collocations.push({
          word: entry.word,
          collocation: coll,
          entryId: entry.id,
          theme: getTheme(coll),
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
 * Nhóm Collocations theo chủ đề.
 * @param {Array} collocations
 * @returns {Map<string, Array>}
 */
export function groupCollocationsByTheme(collocations) {
  const groups = new Map();
  for (const c of collocations) {
    if (!groups.has(c.theme)) groups.set(c.theme, []);
    groups.get(c.theme).push(c);
  }
  return groups;
}

/**
 * Lọc ra các cụm từ "Essential" (thường gặp nhất trong TOEIC).
 * Trong thực tế sẽ dựa trên tần suất, ở đây ta dùng một danh sách mẫu curated.
 */
export function getEssentialCollocations(collocations) {
  const essentialKeywords = ['highly', 'deeply', 'strictly', 'strongly', 'strongly', 'take advantage of', 'in accordance with', 'be responsible for', 'regardless of'];
  return collocations.filter(c => 
    essentialKeywords.some(kw => c.collocation.toLowerCase().includes(kw))
  );
}
