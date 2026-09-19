/**
 * Sinh icon PNG cho PWA mà không cần thư viện ngoài (ràng buộc miễn phí, ít phụ thuộc).
 * Vẽ chữ "T" trắng trên nền xanh đậm bằng cách ghi thẳng từng điểm ảnh rồi đóng gói PNG.
 * Chạy: node scripts/make-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [47, 111, 78];      // xanh var(--accent)
const FG = [255, 255, 255];

/** CRC32 — PNG bắt buộc mỗi chunk phải có. */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Một chunk PNG: độ dài + tên + dữ liệu + CRC. */
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * Tạo file PNG vuông.
 * @param {number} size
 * @returns {Buffer}
 */
function makeIcon(size) {
  // Chữ T: thanh ngang trên và thanh dọc giữa.
  const barTop = Math.round(size * 0.26);
  const barHeight = Math.round(size * 0.12);
  const barLeft = Math.round(size * 0.22);
  const barRight = size - barLeft;
  const stemWidth = Math.round(size * 0.13);
  const stemLeft = Math.round((size - stemWidth) / 2);
  const stemBottom = Math.round(size * 0.76);

  const raw = Buffer.alloc(size * (size * 3 + 1));
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0; // filter type 0 cho mỗi hàng
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const inBar = y >= barTop && y < barTop + barHeight && x >= barLeft && x < barRight;
      const inStem = y >= barTop && y < stemBottom && x >= stemLeft && x < stemLeft + stemWidth;
      const color = inBar || inStem ? FG : BG;
      raw[offset] = color[0];
      raw[offset + 1] = color[1];
      raw[offset + 2] = color[2];
      offset += 3;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // 8 bit mỗi kênh
  ihdr[9] = 2;   // màu RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL('../public/icons/', import.meta.url), { recursive: true });
for (const size of [192, 512, 180]) {
  const file = new URL(`../public/icons/icon-${size}.png`, import.meta.url);
  writeFileSync(file, makeIcon(size));
  console.log(`đã tạo icons/icon-${size}.png`);
}
