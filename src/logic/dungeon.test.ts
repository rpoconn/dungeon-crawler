import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../config';
import { TILE, distancesFrom, generateFloor, isFloor, type Floor, type Point } from './dungeon';

/** 50 fixed pseudo-random seeds so failures are reproducible. */
const SEEDS = Array.from({ length: 50 }, (_, i) => (Math.imul(i + 1, 2654435761) >>> 0) % 2 ** 31);

function reachable(floor: Floor, from: Point, to: Point): boolean {
  return (distancesFrom(floor, from)[to.y]?.[to.x] ?? -1) >= 0;
}

describe('generateFloor', () => {
  it.each(SEEDS)('seed %i: entrance and exit are distinct, connected floor tiles', (seed) => {
    const level = (seed % MAX_LEVEL) + 1;
    const floor = generateFloor(seed, level);

    expect(isFloor(floor, floor.entrance.x, floor.entrance.y)).toBe(true);
    expect(isFloor(floor, floor.exit.x, floor.exit.y)).toBe(true);
    expect(floor.exit).not.toEqual(floor.entrance);
    expect(reachable(floor, floor.entrance, floor.exit)).toBe(true);
  });

  it('is deterministic for a given seed and level', () => {
    const a = generateFloor(1234, 3);
    const b = generateFloor(1234, 3);
    expect(b.grid).toEqual(a.grid);
    expect(b.exit).toEqual(a.exit);
  });

  it('produces different layouts on different floors of the same run', () => {
    expect(generateFloor(1234, 4).grid).not.toEqual(generateFloor(1234, 5).grid);
  });

  it('is enclosed by walls', () => {
    const floor = generateFloor(99, 1);
    const last = floor.grid.length - 1;
    expect(floor.grid[0]?.every((t) => t === TILE.wall)).toBe(true);
    expect(floor.grid[last]?.every((t) => t === TILE.wall)).toBe(true);
    expect(floor.grid.every((row) => row[0] === TILE.wall && row.at(-1) === TILE.wall)).toBe(true);
  });
});
