#!/usr/bin/env bash
# Liệt kê tiến trình nền còn sống của project này. Dùng: bash scripts/check_processes.sh
# Chạy ở cuối mỗi bước con, trước khi báo "xong", để không bỏ quên máy chủ dev hay job dang dở.
FOUND=0

# Lưu ý: KHÔNG dùng `lệnh | tail` để dò, vì mã thoát khi đó là của tail (luôn 0)
# -> sẽ báo nhầm là có tiến trình. Bắt kết quả vào biến rồi kiểm tra rỗng.
report() {
  local label="$1" output="$2"
  echo "— $label:"
  if [ -n "$output" ]; then
    echo "$output" | sed 's/^/  /'
    FOUND=1
  else
    echo "  (không có)"
  fi
}

report "Máy chủ dev / tiến trình Vite" "$(pgrep -fl vite 2>/dev/null | grep -v grep)"
report "Pipeline đang chạy" "$(pgrep -fl 'pipeline/' 2>/dev/null | grep -v grep)"
report "Cổng 5173 (dev server)" "$(lsof -nP -iTCP:5173 -sTCP:LISTEN 2>/dev/null | tail -n +2)"

echo
if [ "$FOUND" -eq 1 ]; then
  echo "CÓ tiến trình nền đang sống. Nếu không còn cần, hãy tắt:"
  echo "  pkill -f vite          # tắt máy chủ dev"
  echo "  pkill -f 'pipeline/'   # dừng pipeline (cache đã lưu, chạy lại tiếp được)"
else
  echo "OK: không còn tiến trình nền nào."
fi
exit 0
