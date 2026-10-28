/** Enemy navigation helpers over a floor grid: A* routes and line of sight. */

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
 * A* route from `from` to `to`: the tiles after `from`, ending on `to` (empty when they match).
 * 8-way with octile costs; diagonals are allowed only when both orthogonal tiles are open, so movers
 * never cut wall corners. Null when `to` is unreachable or the route would cost more than `maxCost`.
 */
export function findPath(floor: Floor, from: Point, to: Point, maxCost = 40): Point[] | null {
    if (!isFloor(floor, from.x, from.y) || !isFloor(floor, to.x, to.y)) return null;

    const { width } = floor;
    const key = (x: number, y: number): number => y * width + x;
    const estimate = (k: number): number => {
        const dx = Math.abs((k % width) - to.x);
        const dy = Math.abs(Math.floor(k / width) - to.y);
        return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };
    const start = key(from.x, from.y);
    const goal = key(to.x, to.y);
    const cost = new Map<number, number>([[start, 0]]);
    const cameFrom = new Map<number, number>();
    const closed = new Set<number>();
    // Floors are small and only a few dozen enemies search, so a linear scan beats a heap here.
    const open = [start];

    while (open.length > 0) {
        let bestIndex = 0;
        let bestScore = Infinity;
        open.forEach((k, i) => {
            const score = (cost.get(k) ?? Infinity) + estimate(k);
            if (score < bestScore) [bestIndex, bestScore] = [i, score];
        });
        const current = open.splice(bestIndex, 1)[0];
        if (current === undefined) break;
        if (current === goal) return route(cameFrom, start, goal, width);
        closed.add(current);

        const x = current % width;
        const y = Math.floor(current / width);
        const g = cost.get(current) ?? 0;
        for (const [dx, dy] of STEPS) {
            const nx = x + dx;
            const ny = y + dy;
            if (!isFloor(floor, nx, ny)) continue;
            const diagonal = dx !== 0 && dy !== 0;
            if (diagonal && (!isFloor(floor, nx, y) || !isFloor(floor, x, ny))) continue;

            const next = key(nx, ny);
            const nextCost = g + (diagonal ? Math.SQRT2 : 1);
            if (closed.has(next) || nextCost > maxCost) continue;
            if (nextCost >= (cost.get(next) ?? Infinity)) continue;
            if (!cost.has(next)) open.push(next);
            cost.set(next, nextCost);
            cameFrom.set(next, current);
        }
    }
    return null;
}

function route(cameFrom: Map<number, number>, start: number, goal: number, width: number): Point[] {
    const tiles: Point[] = [];
    for (let k: number | undefined = goal; k !== undefined && k !== start; k = cameFrom.get(k)) {
        tiles.push({ x: k % width, y: Math.floor(k / width) });
    }
    return tiles.reverse();
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
