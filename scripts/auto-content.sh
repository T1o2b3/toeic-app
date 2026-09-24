#!/usr/bin/env bash
# Sinh nội dung tự động (D70): chạy lần lượt các pipeline theo thứ tự ưu tiên, tới khi hết hạn mức Gemini trong ngày
# hoặc hết giờ. GitHub Actions gọi script này mỗi ngày (.github/workflows/auto-content.yml); chạy tay cũng được:
#   GEMINI_API_KEY=... bash scripts/auto-content.sh
#
# Mỗi pipeline tự dừng khi đủ mục tiêu hoặc khi mọi model hết hạn mức, và lưu tiến độ sau MỖI lô (quy tắc #6) —
# nên hôm nay dừng ở đâu, mai chạy tiếp đúng chỗ đó. Hạn mức tính chung cho mọi bước: bước đầu dùng hết thì các bước
# sau chỉ thử vài giây rồi dừng — thứ tự dưới đây CHÍNH LÀ thứ tự ưu tiên (D63: Part 5, Part 2, rồi các bộ).
#
# DRY_RUN=1 thì chỉ in các lệnh sẽ chạy.
set -u
cd "$(dirname "$0")/.."

# Tổng thời gian cho phần sinh (phút). Giữ nhỏ để cả tháng nằm gọn trong 2.000 phút miễn phí của GitHub Actions.
BUDGET_MIN="${BUDGET_MIN:-40}"
DEADLINE=$((SECONDS + BUDGET_MIN * 60))

# Mục tiêu = TỔNG số mục muốn có (không phải số thêm mỗi ngày). Đủ rồi thì bước đó không tốn request nào.
# Muốn nhiều hơn thì nâng số ở đây. Part 7 đếm theo dạng bộ (đơn / đôi / ba).
STEPS=(
  "build-questions.js --target 400"
  "build-listening.js --target 150 --batch-size 12"
  "build-sets.js --part 3 --target 26"
  "build-sets.js --part 4 --target 20"
  "build-sets.js --part 7 --variant double --target 4"
  "build-sets.js --part 7 --variant triple --target 6"
  "build-sets.js --part 6 --target 12"
  "build-sets.js --part 7 --variant single --target 30"
)

ran=0; failed=0
for step in "${STEPS[@]}"; do
  left=$((DEADLINE - SECONDS))
  if [ "$left" -le 60 ]; then echo "Hết giờ sinh nội dung hôm nay — dừng trước: $step"; break; fi
  echo "::group::$step (còn $((left / 60)) phút)"
  if [ -n "${DRY_RUN:-}" ]; then echo "node pipeline/$step"; echo "::endgroup::"; continue; fi
  ran=$((ran + 1))
  # Hết giờ thì ngắt bằng SIGINT: lô đang dở mất, các lô trước vẫn nằm trong cache — mai ghi tiếp.
  # Hết hạn mức KHÔNG phải lỗi: pipeline tự dừng, ghi file, thoát 0. Mã khác 0 là lỗi thật (sai key, mạng…).
  # shellcheck disable=SC2086 # cố ý tách $step thành tham số
  timeout --signal=INT "$left" node pipeline/$step
  code=$?
  if [ "$code" -eq 124 ]; then echo "→ hết giờ giữa bước này; tiến độ đã lưu, mai làm tiếp"
  elif [ "$code" -ne 0 ]; then failed=$((failed + 1)); echo "::warning::$step lỗi (mã $code) — sang bước sau"; fi
  echo "::endgroup::"
done

# Giọng đọc lời dẫn cho câu hỏi Part 3/4 mới (D69) — chỉ cần edge-tts, không tốn hạn mức Gemini. Lỗi thì chỉ cảnh báo:
# không được chặn việc commit nội dung đã sinh; bộ thiếu giọng đọc vẫn chạy (đếm giờ như cũ), mai chạy lại là có.
if [ -n "${DRY_RUN:-}" ]; then echo "node pipeline/build-narration.js"
else node pipeline/build-narration.js || echo "::warning::Sinh giọng đọc lời dẫn lỗi — mai tự chạy lại"; fi

# MỌI bước đều lỗi gần như chắc là cấu hình hỏng (sai/thiếu key, key hết hạn): báo đỏ để GitHub gửi email.
# Lỗi lẻ tẻ (Gemini quá tải một lúc) thì chỉ cảnh báo, không làm phiền.
if [ "$ran" -gt 0 ] && [ "$failed" -eq "$ran" ]; then
  echo "::error::Cả $ran bước sinh nội dung đều lỗi — kiểm tra secret GEMINI_API_KEY."
  exit 1
fi
exit 0
