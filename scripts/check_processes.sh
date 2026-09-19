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

# Chỉ soi tiến trình CỦA PROJECT NÀY. Máy Huy còn chạy vite của các project khác
# (project_kmap, project_linalg...) — báo nhầm chúng sẽ dẫn tới tắt nhầm.
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

report "Máy chủ dev / tiến trình Vite của project này" \
  "$(pgrep -fl vite 2>/dev/null | grep -v grep | grep -F "$PROJECT_DIR")"
# Pipeline hay được chạy bằng đường dẫn TƯƠNG ĐỐI (`node pipeline/build-vocab.js`), nên dòng lệnh
# KHÔNG chứa đường dẫn tuyệt đối của project — lọc theo dòng lệnh là bỏ sót. Đã xảy ra:
# script báo "sạch" trong khi pipeline vẫn đang chạy. Phải soi THƯ MỤC LÀM VIỆC của tiến trình.
pipeline_procs() {
  local pid cwd
  for pid in $(pgrep -f 'pipeline/[a-z-]*\.js' 2>/dev/null); do
    [ "$pid" = "$$" ] && continue
    cwd="$(lsof -a -d cwd -p "$pid" -Fn 2>/dev/null | sed -n 's/^n//p' | head -1)"
    case "$cwd" in
      "$PROJECT_DIR"|"$PROJECT_DIR"/*) ps -p "$pid" -o pid=,etime=,command= ;;
    esac
  done
}

report "Pipeline đang chạy" "$(pipeline_procs)"

echo "— Tiến trình vite của project KHÁC (chỉ để biết, ĐỪNG tắt):"
OTHER="$(pgrep -fl vite 2>/dev/null | grep -v grep | grep -vF "$PROJECT_DIR")"
if [ -n "$OTHER" ]; then echo "$OTHER" | sed 's/^/  /'; else echo "  (không có)"; fi

echo
if [ "$FOUND" -eq 1 ]; then
  echo "CÓ tiến trình nền đang sống. Nếu không còn cần, hãy tắt:"
  echo "  pkill -f vite          # tắt máy chủ dev"
  echo "  pkill -f 'pipeline/'   # dừng pipeline (cache đã lưu, chạy lại tiếp được)"
else
  echo "OK: không còn tiến trình nền nào."
fi
exit 0
