# RESEARCH.md — Khảo sát app/web học TOEIC miễn phí

Khảo sát ngày 2026-09-19 để chắt lọc ý tưởng cho app. Chỉ ghi thứ **quan sát được trực tiếp**
trên sản phẩm, không chép lại bài quảng cáo. Mục tiêu: học UX, không sao chép nội dung
(ràng buộc D17 vẫn giữ nguyên — không lấy nguyên văn đề).

## Nguồn đã xem được

| Sản phẩm | Loại | Xem được gì |
|---|---|---|
| [TOEIC Lab](https://toeiclab.info.vn) | Web luyện đề VN, miễn phí | Trang chủ, cách tổ chức bài luyện theo part |
| [GenLang TOEIC](https://toeic.genlang.vn) | Web luyện đề VN, freemium | Trang chủ, bảng "kế hoạch hôm nay", mini test |
| [Test-English](https://test-english.com) | Web luyện tiếng Anh theo cấp độ (EN) | Cấu trúc bài tập, cách cho phản hồi |
| [Anki Manual](https://docs.ankiweb.net/studying.html) | Tài liệu app ôn tập ngắt quãng | Quy ước UX của màn ôn thẻ |

Không xem được (bị chặn bot): study4.com, prepedu.com, exam-english.com. Không ảnh hưởng kết luận
vì các mẫu UX quan trọng đã thấy lặp lại ở nhiều nơi.

## Điều đáng học — ÁP DỤNG NGAY vào M3/M6

**R1. Nói trước "tốn bao lâu" trước khi bắt đầu.**
TOEIC Lab ghi `12 phút · 10 câu` trên mỗi bài; GenLang ghi `10 câu · ~15 phút`. Cả hai đều cho biết
giá phải trả trước khi bấm vào. Rất hợp D03 (nhịp 1–2 giờ/tuần): Huy mở app lúc rảnh 10 phút thì cần
biết ngay phiên học dài bao nhiêu. → Nút bắt đầu phải ghi `18 từ · ~6 phút`.

**R2. Màn tổng quan trước khi học: tách số liệu thành 3 nhóm.**
Anki hiển thị `New / Learning / To Review` trước mỗi phiên. Một con số tổng ("còn 40 thẻ") không cho
biết phiên hôm nay nặng hay nhẹ. → Màn chính hiện: *từ mới · đang học · đến hạn ôn*.

**R3. Mỗi nút đánh giá hiện luôn "lần ôn kế tiếp là khi nào".**
Anki: *"Each answer button shows the next time a card will be reviewed again."* Người học thấy được
hậu quả của lựa chọn trước khi bấm. Mình có FSRS nên tính trước được. → `Quên · 10 phút`, `Tốt · 3 ngày`.

**R4. Phím tắt 1–4, Space = "Tốt".**
Quy ước của Anki, hàng triệu người đã quen. Huy dùng 2 máy Mac nên bàn phím là đường vào chính.
Trên iPhone thì vẫn là nút bấm.

**R5. Phản hồi ngay từng câu, không đợi hết bài.**
Test-English nhấn mạnh *"feedback for every single question"*; TOEIC Lab bán điểm "có đáp án &
giải thích". Đây là thứ phân biệt luyện tập với thi thử. → Chế độ luyện phải hiện giải thích ngay
sau mỗi câu (M4 đã có, nhưng giờ chắc chắn là đúng hướng).

**R6. Cảnh báo khi hàng đợi tồn đọng.**
Anki có hẳn mục "Falling behind" trong tài liệu — người học nghỉ vài tuần rồi quay lại thấy 800 thẻ
đến hạn là bỏ luôn. D03 đã lường trước; R6 xác nhận cần làm thật, không phải tính năng phụ.

## Điều đáng học nhưng CHƯA làm bây giờ → Backlog

- **Ước lượng "mức sẵn sàng thi"**: GenLang hiện `Sẵn sàng thi 64% · 685 → mục tiêu 800`. Hữu ích về
  mặt động lực, nhưng cần mô hình quy đổi điểm — chỉ đáng làm khi đã có đủ dữ liệu làm bài của Huy.
- **Kế hoạch hôm nay dạng `3/5 xong`**: chia phiên học thành vài nhiệm vụ nhỏ có tiến độ. Hợp với
  "15 phút hôm nay" (M6), nhưng để M6 quyết hình thức, không làm sớm.
- **Tra từ nhanh ngay trong lúc làm bài**: cả GenLang lẫn TOEIC Lab đều có. Mình đã xếp ở M13.

## Điều CỐ Ý KHÔNG lấy

- **Streak / huy hiệu / bảng xếp hạng.** GenLang có "chuỗi ngày học Streak". PLAN.md đã ghi rõ không làm
  gamification: nhịp học của Huy là 1–2 giờ/tuần, streak theo ngày sẽ tạo cảm giác thất bại liên tục
  rồi dẫn tới bỏ app — đúng thứ D03 muốn tránh.
  **Cập nhật 2026-09-23:** kết luận này TỪNG BỊ VI PHẠM — màn chính có lúc hiện `Chuỗi N ngày`. Đã gỡ,
  thay bằng "N tuần đã học" (cộng dồn, không tụt). Xem D51. Ai định thêm streak lần nữa thì đọc lại
  đoạn trên trước.
- **Ép đăng nhập / khảo sát đầu vào dài.** Không liên quan: app cá nhân, một người dùng.
- **Nội dung của họ.** Chỉ học cách trình bày, không lấy câu hỏi, không lấy đề (D17).
