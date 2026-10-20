import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../config';
import { distancesFrom, generateFloor, isFloor } from './dungeon';
import { ENEMY_TYPES, enemyStats } from './enemies';
import { seededRng } from './random';
import { MAX_LICHES, SAFE_STEPS, enemyCount, planSpawns } from './spawns';

const LEVELS = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1);

describe('planSpawns', () => {
  it.each(LEVELS)(
    'floor %i: spawns sit on reachable floor tiles away from the entrance',
    (level) => {
      const floor = generateFloor(4242, level);
      const plan = planSpawns(floor, level, seededRng(level));
      const dist = distancesFrom(floor, floor.entrance);

      expect(plan.enemies.length).toBeGreaterThan(0);
      expect(plan.enemies.length).toBeLessThanOrEqual(enemyCount(level));
      expect(plan.chests.length).toBeGreaterThan(0);

      const tiles = [...plan.enemies.map((e) => e.tile), ...plan.chests];
      for (const t of tiles) {
        expect(isFloor(floor, t.x, t.y)).toBe(true);
        expect(dist[t.y]?.[t.x]).toBeGreaterThanOrEqual(SAFE_STEPS);
        expect(t).not.toEqual(floor.exit);
      }
      expect(new Set(tiles.map((t) => `${t.x},${t.y}`)).size).toBe(tiles.length);
    },
  );

  it.each(LEVELS)('floor %i: only kinds unlocked for the floor, liches capped', (level) => {
    const floor = generateFloor(77, level);
    const { enemies } = planSpawns(floor, level, seededRng(level * 13));
    for (const e of enemies) expect(ENEMY_TYPES[e.kind].minLevel).toBeLessThanOrEqual(level);
    expect(enemies.filter((e) => e.kind === 'lich').length).toBeLessThanOrEqual(MAX_LICHES);
  });

  it('is deterministic for the same floor and seed', () => {
    const floor = generateFloor(9, 5);
    expect(planSpawns(floor, 5, seededRng(1))).toEqual(planSpawns(floor, 5, seededRng(1)));
  });
});

describe('enemyStats', () => {
  it('scales hp and damage up with depth', () => {
    const shallow = enemyStats('skeleton', 1);
    const deep = enemyStats('skeleton', 10);
    expect(shallow.hp).toBe(ENEMY_TYPES.skeleton.hp);
    expect(deep.hp).toBeGreaterThan(shallow.hp);
    expect(deep.damage).toBeGreaterThan(shallow.damage);
    expect(deep.kind).toBe('skeleton');
  });
});
