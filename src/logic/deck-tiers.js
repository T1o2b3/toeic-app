/**
 * Tầng độ khó của từ vựng — để người đã ở mức 850 không phải cày lại tầng nền.
 *
 * Vì sao cần: deck TSL 1.2 xếp theo TẦN SUẤT trong đề TOEIC, nên màn phân loại bắt đầu từ
 * từ phổ biến nhất (`mister`, `vacation`, `client`, `memo`). Với mục tiêu 850 → 950 thì đó
 * đúng là 400 từ Huy đã biết hết, phải lướt qua trước khi chạm tới từ đáng học.
 *
 * Tầng được SUY RA từ `rank` và `deck` có sẵn trong mỗi mục, không ghi thêm vào file nội dung
 * đã phát hành (D16). Muốn đổi ngưỡng sau này chỉ sửa ở đây, không phải sinh lại deck.
 *
 * Lưu ý thành thật: trong TSL, rank chỉ là proxy cho độ khó chứ không phải thước đo thật —
 * `apple` và `culinary` cùng nằm ở rank 620-630 vì SFI của chúng bằng nhau. Việc tách chính xác
 * "đã biết / chưa biết" vẫn là do Huy tự chấm ở màn phân loại (D29); tầng chỉ quyết định
 * THỨ TỰ gặp từ, không quyết định thay Huy.
 *
 * Hàm thuần, không đụng DOM.
 */

/** Giá trị lưu trong tuỳ chọn — đổi tên là mất lựa chọn đã lưu của Huy. */
export const TIERS = Object.freeze({
  CORE: 'core',   // TSL rank <= 400: từ TOEIC hay gặp nhất, mức 500-700 điểm
  MID: 'mid',     // TSL rank > 400: tầng giữa, lẫn lộn dễ và khó
  HIGH: 'high',   // deck cao cấp (BSL): từ đúng tầm Part 5 hỏi ở mức 900+
});

/** Từ nền lên từ khó. */
export const TIER_ORDER = Object.freeze([TIERS.CORE, TIERS.MID, TIERS.HIGH]);

/** Chọn "tất cả" thì không lọc gì. */
export const ALL_TIERS = 'all';

export const TIER_INFO = Object.freeze({
  [TIERS.CORE]: { label: 'Cơ bản', hint: '400 từ TOEIC hay gặp nhất' },
  [TIERS.MID]:  { label: 'Trung cấp', hint: 'phần còn lại của danh sách TSL' },
  [TIERS.HIGH]: { label: 'Cao cấp', hint: 'từ business đúng tầm Part 5 hỏi' },
});

/** Ranh giới giữa tầng nền và tầng giữa trong danh sách TSL. */
export const CORE_MAX_RANK = 400;

/**
 * Tầng của một mục từ vựng.
 * @param {{deck?: string, rank?: number}} entry
 * @returns {string} một giá trị trong TIERS
 */
export function tierOfEntry(entry) {
  if (entry?.deck && entry.deck !== 'toeic-tsl') return TIERS.HIGH;
  const rank = entry?.rank;
  if (!Number.isFinite(rank)) return TIERS.MID;
  return rank <= CORE_MAX_RANK ? TIERS.CORE : TIERS.MID;
}

/**
 * Lọc deck theo tầng đang chọn.
 * @param {Array<object>} entries
 * @param {string} tier - một giá trị trong TIERS, hoặc ALL_TIERS
 * @returns {Array<object>} chính mảng cũ nếu không lọc gì (tránh copy 1243 mục mỗi lần vẽ)
 */
export function filterByTier(entries, tier) {
  if (tier === ALL_TIERS || !TIER_ORDER.includes(tier)) return entries;
  return entries.filter((entry) => tierOfEntry(entry) === tier);
}

/**
 * Đếm số từ CHƯA phân loại của từng tầng — để nút chọn tầng hiện được còn bao nhiêu.
 * @param {Array<object>} entries
 * @param {Map<string, object>} states
 * @returns {Record<string, number>} luôn đủ 3 khoá
 */
export function untriagedByTier(entries, states) {
  const counts = Object.fromEntries(TIER_ORDER.map((tier) => [tier, 0]));
  for (const entry of entries) {
    if (entry.status === 'retired') continue;
    if (states.get(entry.id)?.triaged) continue;
    counts[tierOfEntry(entry)] += 1;
  }
  return counts;
}

/**
 * Thẻ để phân loại/ôn, CHIA NHÓM: mỗi tầng một nhóm (chọn "Tất cả" thì đủ 3 tầng) + nhóm cụm từ (cụm không chia
 * tầng). Màn phân loại trộn đều các nhóm (`interleaveEvenly`, D66); trước đây học mới cụm từ tách riêng (D53).
 * @param {Array<object>} entries
 * @param {string} tier
 * @param {Array<object>} [collocationCards]
 * @returns {Array<object>[]} nhóm rỗng bị bỏ
 */
export function studyGroups(entries, tier, collocationCards = []) {
  const tiers = TIER_ORDER.includes(tier) ? [tier] : TIER_ORDER;
  return [...tiers.map((t) => entries.filter((entry) => tierOfEntry(entry) === t)), collocationCards]
    .filter((group) => group.length > 0);
}

/** Cùng các thẻ đó nhưng gộp phẳng — cho các chỗ chỉ đếm hoặc tự sắp (ôn tập, số liệu mục Từ vựng). */
export function studyEntries(entries, tier, collocationCards = []) {
  return studyGroups(entries, tier, collocationCards).flat();
}
