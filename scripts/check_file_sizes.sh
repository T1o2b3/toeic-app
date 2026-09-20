#!/usr/bin/env bash
# Liệt kê file code vượt ngưỡng số dòng (mặc định 450). Dùng: bash scripts/check_file_sizes.sh [thư_mục] [ngưỡng]
# Ngưỡng nới từ 300 lên 450 theo yêu cầu của Huy (2026-09-20, D40): mốc 300 làm phải cắt file giữa chừng
# chỉ vì đếm dòng, trong khi mục đích thật là "một file một việc". Vượt 450 thì gần như chắc chắn file làm nhiều việc.
DIR="${1:-.}"; LIMIT="${2:-450}"; FOUND=0
while IFS= read -r f; do
  n=$(wc -l < "$f")
  if [ "$n" -gt "$LIMIT" ]; then echo "$n  $f"; FOUND=1; fi
done < <(find "$DIR" -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) -not -path '*/node_modules/*' -not -path '*/dist/*')
[ "$FOUND" -eq 0 ] && echo "OK: không có file nào vượt $LIMIT dòng."
exit 0
