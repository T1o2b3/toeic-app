# pipeline/data — dữ liệu nguồn (được commit)

Khác với `pipeline/.cache/` (kết quả tạm, bị gitignore), thư mục này chứa **dữ liệu nguồn**
được commit để chạy lại pipeline giống hệt nhau trên mọi máy.

## TSL_12_stats.csv

TOEIC Service List (TSL) 1.2 — 1250 từ kèm thứ hạng tần suất.
Tải ngày 2026-09-19 từ <https://www.newgeneralservicelist.com/s/TSL_12_stats.csv>.

> TOEIC Service List by Browne, C. and Culligan, B., is licensed under a
> Creative Commons Attribution-ShareAlike 4.0 International License.

Phát hành lại ở đây theo đúng CC BY-SA 4.0 (xem `DECISIONS.md` — D18).

## BSL_120_stats.csv

Business Service List (BSL) 1.20 — 1744 từ tiếng Anh thương mại kèm thứ hạng tần suất.
Tải ngày 2026-09-19 từ <https://www.newgeneralservicelist.com/s/BSL_120_stats.csv>.

> Business Service List by Browne, C. and Culligan, B., is licensed under a
> Creative Commons Attribution-ShareAlike 4.0 International License.

Phát hành lại ở đây theo đúng CC BY-SA 4.0 (xem `DECISIONS.md` — D18, D30).

Đây là **tầng trên** của deck: sau khi bỏ phần trùng TSL còn khoảng 1168 từ
(`equity`, `depreciation`, `amend`, `abolish`, `encompass`…) — đúng tầm Part 5 hỏi ở mức 900+.
Vài dòng trong file thực ra là tiền tố (`non`, `anti`, `pre`…), pipeline tự loại (xem `NOT_WORDS`).
