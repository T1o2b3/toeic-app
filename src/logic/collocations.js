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

/**
 * Biến cụm từ thành THẺ HỌC dùng chung bộ máy từ vựng (FSRS, phân loại, nhật ký).
 *
 * Cố ý không dựng một hệ thống học song song: `reduceVocabState` chỉ khoá theo `wordId` và mọi hàm
 * hàng đợi (`reviewQueue`, `countUntriaged`, `reviewCounts`) đều nhận `entries` từ bên ngoài. Nên chỉ
 * cần cho cụm từ một hình dạng giống mục deck là được lịch ôn, chấm 4 mức, đánh dấu và thống kê miễn phí.
 * Id `col-xxxx` không đụng id deck (`tsl-`/`bsl-`) nên nhật ký chung vẫn phân biệt được.
 *
 * Mặt sau của thẻ cố tình đặt **dạng sai vào `note`**: lúc ôn, thứ cần nhớ không chỉ là "cụm này nghĩa gì"
 * mà là "đừng viết thành give attention".
 *
 * @param {Array<object>} bank - nội dung collocations.json
 * @returns {Array<object>} mục có hình dạng như deck từ vựng
 */
export function collocationEntries(bank) {
  return (bank ?? []).map((c) => ({
    id: c.id,
    word: c.chunk,
    vi: c.vi,
    pos: [c.theme],
    examples: c.example ? [{ en: c.example, vi: '' }] : [],
    note: c.wrong ? `✗ không dùng: ${c.wrong}` : '',
    wrong: c.wrong ?? '',      // dạng sai hay mắc — làm phương án nhiễu khi ôn trắc nghiệm (D66)
    isCollocation: true,
  }));
}
