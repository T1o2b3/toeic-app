/**
 * Xáo một danh sách. Tách ra file riêng vì cả thi thử (exam.js) lẫn lượt luyện Part 5 (part5.js) đều cần,
 * mà part5.js được exam.js gọi — để chung một file sẽ thành vòng tròn import.
 */

/**
 * Fisher–Yates: xáo ĐỀU (khác `sort(() => random() - 0.5)` vốn thiên lệch và phụ thuộc thuật toán sắp xếp).
 * @template T
 * @param {T[]} list
 * @param {() => number} random
 * @returns {T[]} mảng mới, không sửa mảng gốc
 */
export function shuffle(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
