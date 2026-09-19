import { describe, it, expect } from 'vitest';
import {
  TIERS, TIER_ORDER, TIER_INFO, ALL_TIERS, CORE_MAX_RANK,
  tierOfEntry, filterByTier, untriagedByTier,
} from '../src/logic/deck-tiers.js';
import { normalizeTier, DEFAULT_TIER } from '../src/logic/prefs.js';
import { reduceVocabState } from '../src/logic/vocab-state.js';
import { LEVELS, payloadForLevel } from '../src/logic/vocab-levels.js';

const T0 = Date.UTC(2026, 8, 19, 10, 0, 0);
const tsl = (rank) => ({ id: `tsl-${rank}`, deck: 'toeic-tsl', rank });
const bsl = (rank) => ({ id: `bsl-${rank}`, deck: 'toeic-bsl', rank });

describe('tierOfEntry', () => {
  it('TSL trong 400 từ đầu là tầng cơ bản', () => {
    expect(tierOfEntry(tsl(1))).toBe(TIERS.CORE);
    expect(tierOfEntry(tsl(CORE_MAX_RANK))).toBe(TIERS.CORE);
  });

  it('TSL ngoài 400 từ đầu là tầng trung cấp', () => {
    expect(tierOfEntry(tsl(CORE_MAX_RANK + 1))).toBe(TIERS.MID);
    expect(tierOfEntry(tsl(1250))).toBe(TIERS.MID);
  });

  it('deck khác TSL là tầng cao cấp, bất kể rank', () => {
    expect(tierOfEntry(bsl(1))).toBe(TIERS.HIGH);
    expect(tierOfEntry(bsl(1700))).toBe(TIERS.HIGH);
  });

  it('thiếu rank hoặc dữ liệu lạ thì về trung cấp, không ném lỗi', () => {
    expect(tierOfEntry({ deck: 'toeic-tsl' })).toBe(TIERS.MID);
    expect(tierOfEntry({})).toBe(TIERS.MID);
    expect(tierOfEntry(undefined)).toBe(TIERS.MID);
  });

  it('mỗi tầng đều có nhãn hiện lên nút', () => {
    for (const tier of TIER_ORDER) expect(TIER_INFO[tier].label).toBeTruthy();
  });
});

describe('filterByTier', () => {
  const deck = [tsl(1), tsl(399), tsl(401), tsl(900), bsl(5)];

  it('chọn một tầng thì chỉ còn từ của tầng đó', () => {
    expect(filterByTier(deck, TIERS.CORE).map((e) => e.id)).toEqual(['tsl-1', 'tsl-399']);
    expect(filterByTier(deck, TIERS.MID).map((e) => e.id)).toEqual(['tsl-401', 'tsl-900']);
    expect(filterByTier(deck, TIERS.HIGH).map((e) => e.id)).toEqual(['bsl-5']);
  });

  it('chọn tất cả thì trả về chính mảng cũ, không copy 1243 mục mỗi lần vẽ', () => {
    expect(filterByTier(deck, ALL_TIERS)).toBe(deck);
  });

  it('giá trị lạ thì coi như không lọc, thà hiện thừa còn hơn giấu mất từ', () => {
    expect(filterByTier(deck, 'rác')).toBe(deck);
  });
});

describe('untriagedByTier', () => {
  it('đếm riêng từng tầng, bỏ từ đã phân loại và mục đã gỡ', () => {
    const deck = [tsl(1), tsl(2), tsl(500), bsl(9), { ...tsl(3), status: 'retired' }];
    const states = reduceVocabState([
      { id: 'e1', deviceId: 'mac', ts: T0, type: 'vocab.triaged', payload: payloadForLevel('tsl-1', LEVELS.FLUENT) },
    ]);
    expect(untriagedByTier(deck, states)).toEqual({ core: 1, mid: 1, high: 1 });
  });

  it('luôn trả đủ 3 khoá kể cả deck rỗng', () => {
    expect(untriagedByTier([], new Map())).toEqual({ core: 0, mid: 0, high: 0 });
  });
});

describe('normalizeTier', () => {
  it('chấp nhận tầng hợp lệ và lựa chọn "tất cả"', () => {
    expect(normalizeTier('core', TIER_ORDER)).toBe('core');
    expect(normalizeTier('high', TIER_ORDER)).toBe('high');
    expect(normalizeTier(ALL_TIERS, TIER_ORDER)).toBe(ALL_TIERS);
  });

  it('mặc định là không lọc — không âm thầm giấu bớt từ (ràng buộc #9)', () => {
    expect(DEFAULT_TIER).toBe(ALL_TIERS);
    expect(normalizeTier(null, TIER_ORDER)).toBe(ALL_TIERS);
    expect(normalizeTier('rác', TIER_ORDER)).toBe(ALL_TIERS);
  });
});
