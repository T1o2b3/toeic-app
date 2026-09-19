import { describe, it, expect } from 'vitest';
import { roundProgress, reviewProgress } from '../src/logic/round.js';

describe('roundProgress', () => {
  // Lỗi thật đã gặp: bộ đếm đứng yên ở 20 dù đã làm nhiều câu, vì trước đây lấy độ dài
  // hàng đợi — mà hàng đợi luôn cắt đủ 20 câu khi ngân hàng còn nhiều.
  it('đếm lùi theo số mục đã làm, không theo độ dài hàng đợi', () => {
    const big = 180; // kho còn rất nhiều
    expect(roundProgress({ roundSize: 20, doneCount: 0, availableCount: big }).remaining).toBe(20);
    expect(roundProgress({ roundSize: 20, doneCount: 5, availableCount: big }).remaining).toBe(15);
    expect(roundProgress({ roundSize: 20, doneCount: 19, availableCount: big }).remaining).toBe(1);
  });

  it('mục đang xem kết quả vẫn được tính là còn lại', () => {
    // Vừa trả lời câu đầu tiên: đã làm 1, nhưng câu đó còn trên màn hình -> vẫn hiện 20.
    expect(roundProgress({ roundSize: 20, doneCount: 1, availableCount: 180, locked: true }).remaining).toBe(20);
    // Bấm "Câu tiếp theo" -> còn 19.
    expect(roundProgress({ roundSize: 20, doneCount: 1, availableCount: 180 }).remaining).toBe(19);
  });

  it('kết thúc lượt khi làm đủ số mục', () => {
    expect(roundProgress({ roundSize: 20, doneCount: 20, availableCount: 180 }).finished).toBe(true);
    expect(roundProgress({ roundSize: 20, doneCount: 19, availableCount: 180 }).finished).toBe(false);
  });

  it('đang xem kết quả của mục cuối thì chưa tính là xong', () => {
    expect(roundProgress({ roundSize: 20, doneCount: 20, availableCount: 0, locked: true }).finished).toBe(false);
  });

  it('kho còn ít hơn số mục mỗi lượt thì lấy theo số thực có', () => {
    expect(roundProgress({ roundSize: 20, doneCount: 0, availableCount: 7 }).remaining).toBe(7);
    expect(roundProgress({ roundSize: 20, doneCount: 5, availableCount: 3 }).remaining).toBe(3);
  });

  it('không bao giờ trả số âm', () => {
    expect(roundProgress({ roundSize: 20, doneCount: 25, availableCount: 100 }).remaining).toBe(0);
  });
});

describe('reviewProgress', () => {
  // Cùng một lỗi, biểu hiện ở màn ôn thẻ: trước đây lấy reviewQueue(...).length,
  // mà hàng đợi đó cắt maxNew=10 -> học xong 1 từ mới thì từ thứ 11 lấp vào, đếm đứng yên ở 10.
  it('đếm lùi từ mới theo số đã học, không theo độ dài hàng đợi', () => {
    const args = { dueCount: 0, newAvailable: 1200, newPerRound: 10 };
    expect(reviewProgress({ ...args, newDoneCount: 0 }).remaining).toBe(10);
    expect(reviewProgress({ ...args, newDoneCount: 1 }).remaining).toBe(9);
    expect(reviewProgress({ ...args, newDoneCount: 9 }).remaining).toBe(1);
    expect(reviewProgress({ ...args, newDoneCount: 10 }).remaining).toBe(0);
  });

  it('thẻ đến hạn KHÔNG bị chặn bởi hạn mức từ mới — đến hạn bao nhiêu phải ôn bấy nhiêu', () => {
    const p = reviewProgress({ dueCount: 57, newAvailable: 1200, newPerRound: 10, newDoneCount: 10 });
    expect(p.remaining).toBe(57);
    expect(p.newRemaining).toBe(0);
  });

  it('cộng cả hai nguồn: đến hạn + hạn mức từ mới còn lại', () => {
    expect(reviewProgress({ dueCount: 12, newAvailable: 1200, newPerRound: 10, newDoneCount: 3 }).remaining).toBe(19);
  });

  it('kho từ mới cạn thì lấy theo số thực có, không lấy theo hạn mức', () => {
    expect(reviewProgress({ dueCount: 0, newAvailable: 2, newPerRound: 10, newDoneCount: 0 }).remaining).toBe(2);
  });

  it('hết việc thì báo xong', () => {
    expect(reviewProgress({ dueCount: 0, newAvailable: 0, newPerRound: 10, newDoneCount: 0 }).finished).toBe(true);
    expect(reviewProgress({ dueCount: 1, newAvailable: 0, newPerRound: 10, newDoneCount: 10 }).finished).toBe(false);
  });

  it('không bao giờ trả số âm dù dữ liệu vào lạ', () => {
    expect(reviewProgress({ dueCount: -5, newAvailable: -3, newPerRound: 10, newDoneCount: 99 }).remaining).toBe(0);
  });
});
