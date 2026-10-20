/** Where enemies and chests go on a floor. Seeded, so a resumed floor repopulates identically. */

import { distancesFrom, type Floor, type Point, type Room } from './dungeon';
import { ENEMY_TYPES, kindsForLevel, type EnemyKind } from './enemies';
import { chance, shuffle, weightedPick, type Rng } from './random';

export interface EnemySpawn {
    kind: EnemyKind;
    tile: Point;
}

export interface SpawnPlan {
    enemies: EnemySpawn[];
    chests: Point[];
}

/** No enemy starts within this many steps of the entrance (above Enemy AGGRO_STEPS, so arrival is calm). */
export const SAFE_STEPS = 12;
export const MAX_LICHES = 2;

export function enemyCount(level: number): number {
    return 5 + 2 * level;
}

export function planSpawns(floor: Floor, level: number, rng: Rng): SpawnPlan {
    const fromEntrance = distancesFrom(floor, floor.entrance);
    const [entranceRoom, ...otherRooms] = floor.rooms;
    const isExitArea = (p: Point): boolean =>
        Math.abs(p.x - floor.exit.x) <= 1 && Math.abs(p.y - floor.exit.y) <= 1;

    const candidates = shuffle(
        rng,
        otherRooms.flatMap(roomTiles).filter((p) => {
            const steps = fromEntrance[p.y]?.[p.x] ?? -1;
            return (
                steps >= SAFE_STEPS && !isExitArea(p) && !(entranceRoom && inRoom(entranceRoom, p))
            );
        }),
    );

    const kinds = kindsForLevel(level);
    const enemies: EnemySpawn[] = [];
    let liches = 0;
    for (const tile of candidates.slice(0, enemyCount(level))) {
        let kind = weightedPick(rng, kinds, (k) => ENEMY_TYPES[k].weight);
        if (kind === 'lich' && ++liches > MAX_LICHES) kind = 'skeleton';
        enemies.push({ kind, tile });
    }

    // Chests are solid, so keep them off room edges where they could plug a doorway.
    const used = new Set(enemies.map((e) => key(e.tile)));
    const chestSpots = candidates.filter(
        (p) => !used.has(key(p)) && otherRooms.some((r) => inRoomInterior(r, p)),
    );
    const chestCount = chance(rng, 0.35) ? 2 : 1;
    return { enemies, chests: chestSpots.slice(0, chestCount) };
}

function roomTiles(room: Room): Point[] {
    const tiles: Point[] = [];
    for (let y = room.top; y <= room.bottom; y++) {
        for (let x = room.left; x <= room.right; x++) tiles.push({ x, y });
    }
    return tiles;
}

function inRoom(room: Room, p: Point): boolean {
    return p.x >= room.left && p.x <= room.right && p.y >= room.top && p.y <= room.bottom;
}

function inRoomInterior(room: Room, p: Point): boolean {
    return p.x > room.left && p.x < room.right && p.y > room.top && p.y < room.bottom;
}

function key(p: Point): string {
    return `${p.x},${p.y}`;
}
