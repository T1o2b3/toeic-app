#!/usr/bin/env bash
# Liệt kê file code vượt ngưỡng số dòng (mặc định 300). Dùng: bash scripts/check_file_sizes.sh [thư_mục] [ngưỡng]
DIR="${1:-.}"; LIMIT="${2:-300}"; FOUND=0
while IFS= read -r f; do
  n=$(wc -l < "$f")
  if [ "$n" -gt "$LIMIT" ]; then echo "$n  $f"; FOUND=1; fi
done < <(find "$DIR" -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) -not -path '*/node_modules/*' -not -path '*/dist/*')
[ "$FOUND" -eq 0 ] && echo "OK: không có file nào vượt $LIMIT dòng."
exit 0
