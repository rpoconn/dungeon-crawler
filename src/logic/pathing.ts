/** Enemy navigation helpers over a floor grid: gradient steps on a BFS field, and line of sight. */

import { isFloor, type Floor, type Point } from './dungeon';

const STEPS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
] as const;

/**
 * The neighbouring tile that gets closest to the field's origin (as computed by `distancesFrom`).
 * Diagonals are allowed only when both orthogonal tiles are open, so movers never cut wall
 * corners. Null when `from` is unreachable or already at the origin.
 */
export function stepToward(dist: number[][], from: Point): Point | null {
    const at = (x: number, y: number): number => dist[y]?.[x] ?? -1;
    let best: Point | null = null;
    let bestDist = at(from.x, from.y);
    if (bestDist <= 0) return null;

    for (const [dx, dy] of STEPS) {
        const d = at(from.x + dx, from.y + dy);
        if (d < 0 || d >= bestDist) continue;
        if (dx !== 0 && dy !== 0 && (at(from.x + dx, from.y) < 0 || at(from.x, from.y + dy) < 0)) {
            continue;
        }
        best = { x: from.x + dx, y: from.y + dy };
        bestDist = d;
    }
    return best;
}

/** Clear straight line between two points given in tile units (fractions allowed). */
export function hasLineOfSight(floor: Floor, a: Point, b: Point): boolean {
    const samples = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 4);
    for (let i = 0; i <= samples; i++) {
        const t = samples === 0 ? 0 : i / samples;
        const x = Math.floor(a.x + (b.x - a.x) * t);
        const y = Math.floor(a.y + (b.y - a.y) * t);
        if (!isFloor(floor, x, y)) return false;
    }
    return true;
}
