import { describe, expect, it } from 'vitest';
import { TILE, generateFloor, isFloor, tileAt } from './dungeon';
import { seededRng } from './random';
import { MAX_SCONCES, planSconces } from './sconces';

describe('planSconces', () => {
  it.each([1, 5, 10])('floor %i: sconces sit on walls directly above a room tile', (level) => {
    const floor = generateFloor(777, level);
    const sconces = planSconces(floor, seededRng(level));

    expect(sconces.length).toBeGreaterThan(0);
    expect(sconces.length).toBeLessThanOrEqual(MAX_SCONCES);
    for (const s of sconces) {
      expect(tileAt(floor, s.x, s.y)).toBe(TILE.wall);
      expect(isFloor(floor, s.x, s.y + 1)).toBe(true);
    }
  });

  it('is deterministic per seed', () => {
    const floor = generateFloor(31, 4);
    expect(planSconces(floor, seededRng(9))).toEqual(planSconces(floor, seededRng(9)));
  });
});
