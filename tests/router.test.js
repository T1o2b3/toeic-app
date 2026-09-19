import { describe, it, expect } from 'vitest';
import { parseRoute } from '../src/ui/router.js';

describe('parseRoute', () => {
  it('hash rỗng hoặc chỉ có dấu # là màn chính', () => {
    expect(parseRoute('').name).toBe('home');
    expect(parseRoute('#').name).toBe('home');
    expect(parseRoute('#/').name).toBe('home');
    expect(parseRoute(undefined).name).toBe('home');
  });

  it('đọc được tên màn hình', () => {
    expect(parseRoute('#/review').name).toBe('review');
    expect(parseRoute('#/triage').name).toBe('triage');
  });

  it('đọc được tham số kèm theo', () => {
    const route = parseRoute('#/review?deck=toeic-tsl&limit=20');
    expect(route.name).toBe('review');
    expect(route.params.get('deck')).toBe('toeic-tsl');
    expect(route.params.get('limit')).toBe('20');
  });
});
