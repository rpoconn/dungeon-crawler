import { describe, expect, it } from 'vitest';
import { TILE, type Floor, type Tile } from './dungeon';
import { findPath, hasLineOfSight } from './pathing';

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

describe('findPath', () => {
    it('follows corridors around corners to the target', () => {
        expect(findPath(L_SHAPE, { x: 5, y: 3 }, { x: 1, y: 1 })).toEqual([
            { x: 5, y: 2 },
            { x: 5, y: 1 },
            { x: 4, y: 1 },
            { x: 3, y: 1 },
            { x: 2, y: 1 },
            { x: 1, y: 1 },
        ]);
    });

    it('cuts diagonals across open rooms but not around wall corners', () => {
        const room = floorFrom(['#####', '#...#', '#...#', '#...#', '#####']);
        expect(findPath(room, { x: 3, y: 3 }, { x: 1, y: 1 })).toEqual([
            { x: 2, y: 2 },
            { x: 1, y: 1 },
        ]);

        const corner = floorFrom(['####', '#..#', '##.#', '####']);
        expect(findPath(corner, { x: 2, y: 2 }, { x: 1, y: 1 })).toEqual([
            { x: 2, y: 1 },
            { x: 1, y: 1 },
        ]);
    });

    it('is empty on the target and null when the target is out of reach', () => {
        expect(findPath(L_SHAPE, { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([]);
        expect(findPath(L_SHAPE, { x: 1, y: 1 }, { x: 0, y: 0 })).toBeNull();

        const split = floorFrom(['#####', '#.#.#', '#####']);
        expect(findPath(split, { x: 1, y: 1 }, { x: 3, y: 1 })).toBeNull();
    });

    it('gives up on routes that cost more than the cap', () => {
        expect(findPath(L_SHAPE, { x: 5, y: 3 }, { x: 1, y: 1 }, 5)).toBeNull();
    });
});

describe('hasLineOfSight', () => {
    it('sees along a corridor but not through walls', () => {
        expect(hasLineOfSight(L_SHAPE, { x: 1.5, y: 1.5 }, { x: 5.5, y: 1.5 })).toBe(true);
        expect(hasLineOfSight(L_SHAPE, { x: 1.5, y: 1.5 }, { x: 5.5, y: 3.5 })).toBe(false);
    });
});
