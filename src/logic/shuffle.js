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
/**
 * Bộ sinh số ngẫu nhiên CÓ HẠT GIỐNG (mulberry32): cùng một `seed` thì luôn ra đúng cùng một dãy số.
 *
 * Dùng khi cần dựng lại y hệt một thứ đã xáo: thi thử lưu `seed` lúc bắt đầu, lúc khôi phục bài làm dở
 * thì dựng lại đề bằng chính `seed` đó. Nếu dùng `Math.random`, đề dựng lại sẽ là đề KHÁC và mọi câu
 * trả lời đã lưu trở thành vô nghĩa.
 * @param {number} seed
 * @returns {() => number} hàm trả số trong [0, 1), dùng thay cho Math.random
 */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, random = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
