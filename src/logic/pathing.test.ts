import { describe, expect, it } from 'vitest';
import { TILE, distancesFrom, type Floor, type Tile } from './dungeon';
import { hasLineOfSight, stepToward } from './pathing';

/** `#` wall, `.` floor. */
function floorFrom(rows: string[]): Floor {
  const grid = rows.map((row) => [...row].map((c): Tile => (c === '#' ? TILE.wall : TILE.floor)));
  return {
    width: rows[0]?.length ?? 0,
    height: rows.length,
    grid,
    rooms: [],
    entrance: { x: 1, y: 1 },
    exit: { x: 1, y: 1 },
  };
}

const L_SHAPE = floorFrom([
  '#######', //
  '#.....#',
  '#####.#',
  '#####.#',
  '#######',
]);

describe('stepToward', () => {
  it('follows corridors around corners toward the origin', () => {
    const dist = distancesFrom(L_SHAPE, { x: 1, y: 1 });
    expect(stepToward(dist, { x: 5, y: 3 })).toEqual({ x: 5, y: 2 });
    expect(stepToward(dist, { x: 5, y: 2 })).toEqual({ x: 5, y: 1 });
    expect(stepToward(dist, { x: 5, y: 1 })).toEqual({ x: 4, y: 1 });
  });

  it('returns null at the origin or off the field', () => {
    const dist = distancesFrom(L_SHAPE, { x: 1, y: 1 });
    expect(stepToward(dist, { x: 1, y: 1 })).toBeNull();
    expect(stepToward(dist, { x: 0, y: 0 })).toBeNull();
  });

  it('cuts diagonals across open rooms but not around wall corners', () => {
    const room = floorFrom(['#####', '#...#', '#...#', '#...#', '#####']);
    expect(stepToward(distancesFrom(room, { x: 1, y: 1 }), { x: 3, y: 3 })).toEqual({ x: 2, y: 2 });

    const corner = floorFrom(['####', '#..#', '##.#', '####']);
    expect(stepToward(distancesFrom(corner, { x: 1, y: 1 }), { x: 2, y: 2 })).toEqual({
      x: 2,
      y: 1,
    });
  });
});

describe('hasLineOfSight', () => {
  it('sees along a corridor but not through walls', () => {
    expect(hasLineOfSight(L_SHAPE, { x: 1.5, y: 1.5 }, { x: 5.5, y: 1.5 })).toBe(true);
    expect(hasLineOfSight(L_SHAPE, { x: 1.5, y: 1.5 }, { x: 5.5, y: 3.5 })).toBe(false);
  });
});
