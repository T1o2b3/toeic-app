/**
 * Nhịp làm bài so với đề thật — đo để biết nên tăng tốc hay còn dư giờ (Huy đề nghị 2026-09-20).
 * Hàm thuần, không đụng DOM.
 *
 * **Đo chứ không ép.** Không có gì bị khoá khi quá giờ: đây là đồng hồ bấm giờ để đối chiếu, không phải
 * đồng hồ đếm ngược của phòng thi. Muốn làm bài có đếm ngược thật thì vào màn Thi thử (`#/exam`).
 *
 * **Các mốc lấy từ đâu:**
 * - Phần ĐỌC có 75 phút cho 100 câu, và cách chia ai cũng khuyên là: Part 5 ~10 phút (30 câu → 20 giây/câu),
 *   Part 6 ~8 phút (16 câu → 30 giây/câu), phần còn lại ~57 phút cho Part 7 (54 câu → ~60 giây/câu).
 *   Ba con số này cộng lại vừa đúng 75 phút, nên chậm ở phần trước là ăn vào giờ của Part 7.
 * - Phần NGHE thì nhịp do băng quyết định, đi nhanh hơn cũng không được. Thứ duy nhất đo được là
 *   KHOẢNG TRẢ LỜI sau khi băng dứt: đề thi trên máy tự chuyển câu sau khoảng 5 giây (Huy tra được từ
 *   hướng dẫn giao diện thi của IIG). Vì vậy với Part 3/4, đồng hồ chỉ bắt đầu chạy SAU KHI nghe xong.
 */

/** Giây cho MỖI câu, theo từng Part. */
export const TARGET_SECONDS = Object.freeze({ 3: 5, 4: 5, 5: 20, 6: 30, 7: 60 });

/**
 * Nhịp chuẩn cho một bộ/lượt gồm `questionCount` câu (giây).
 * @param {number} part
 * @param {number} questionCount
 * @returns {number} 0 nếu Part không có mốc
 */
export function targetFor(part, questionCount) {
  return (TARGET_SECONDS[part] ?? 0) * Math.max(0, Math.round(questionCount || 0));
}

/**
 * So thời gian thực tế với nhịp chuẩn.
 * @param {number} seconds - thời gian đã dùng
 * @param {number} [target] - nhịp chuẩn; mặc định là nhịp MỘT câu Part 5 (20 giây)
 * @returns {{seconds: number, target: number, onPace: boolean, diff: number, label: string}}
 */
export function pace(seconds, target = TARGET_SECONDS[5]) {
  const value = Math.max(0, Math.round(seconds));
  const goal = Math.max(0, Math.round(target));
  const onPace = value <= goal;
  return {
    seconds: value,
    target: goal,
    onPace,
    diff: Math.abs(value - goal),
    label: onPace ? `${value} giây · kịp nhịp` : `${value} giây · chậm hơn nhịp ${goal} giây`,
  };
}
