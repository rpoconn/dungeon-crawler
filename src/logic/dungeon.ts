/** Seeded floor generation: rot-js Digger rooms + corridors, with a guaranteed-reachable exit. */

import { Map as RotMap, RNG } from 'rot-js';

export const TILE = { floor: 0, wall: 1 } as const;
export type Tile = (typeof TILE)[keyof typeof TILE];

export interface Point {
  x: number;
  y: number;
}

/** Inclusive tile bounds of a room's floor area. */
export interface Room {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Floor {
  width: number;
  height: number;
  /** Row-major: grid[y][x]. */
  grid: Tile[][];
  rooms: Room[];
  entrance: Point;
  exit: Point;
}

/** Floors grow a little as you descend. */
export function floorSize(level: number): { width: number; height: number } {
  return { width: 44 + 2 * level, height: 28 + level };
}

export function tileAt(floor: Floor, x: number, y: number): Tile {
  return floor.grid[y]?.[x] ?? TILE.wall;
}

export function isFloor(floor: Floor, x: number, y: number): boolean {
  return tileAt(floor, x, y) === TILE.floor;
}

export function generateFloor(seed: number, level: number): Floor {
  const { width, height } = floorSize(level);
  RNG.setSeed(seed + level);

  const grid: Tile[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, (): Tile => TILE.wall),
  );
  const digger = new RotMap.Digger(width, height);
  digger.create((x, y, value) => {
    const row = grid[y];
    if (row) row[x] = value === 0 ? TILE.floor : TILE.wall;
  });

  const rooms: Room[] = digger.getRooms().map((r) => ({
    left: r.getLeft(),
    top: r.getTop(),
    right: r.getRight(),
    bottom: r.getBottom(),
  }));
  const [first] = rooms;
  if (!first) throw new Error(`Floor ${level} (seed ${seed}) generated no rooms`);

  const floor: Floor = {
    width,
    height,
    grid,
    rooms,
    entrance: roomCenter(first),
    exit: { x: 0, y: 0 },
  };
  floor.exit = farthestRoomCenter(floor);
  return floor;
}

export function roomCenter(room: Room): Point {
  return {
    x: Math.round((room.left + room.right) / 2),
    y: Math.round((room.top + room.bottom) / 2),
  };
}

/** BFS step counts from `start` over 4-connected floor tiles; unreachable tiles are -1. */
export function distancesFrom(floor: Floor, start: Point): number[][] {
  const dist = floor.grid.map((row) => row.map(() => -1));
  const queue: Point[] = [start];
  setDist(dist, start, 0);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (!p) break;
    const d = dist[p.y]?.[p.x] ?? 0;
    for (const [dx, dy] of NEIGHBOURS) {
      const n = { x: p.x + dx, y: p.y + dy };
      if (isFloor(floor, n.x, n.y) && dist[n.y]?.[n.x] === -1) {
        setDist(dist, n, d + 1);
        queue.push(n);
      }
    }
  }
  return dist;
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

function setDist(dist: number[][], p: Point, d: number): void {
  const row = dist[p.y];
  if (row) row[p.x] = d;
}

/** The room centre with the longest walk from the entrance (falls back to the farthest tile). */
function farthestRoomCenter(floor: Floor): Point {
  const dist = distancesFrom(floor, floor.entrance);
  const distTo = (p: Point): number => dist[p.y]?.[p.x] ?? -1;

  let best = floor.entrance;
  for (const room of floor.rooms) {
    const c = roomCenter(room);
    if (distTo(c) > distTo(best)) best = c;
  }
  if (distTo(best) > 0) return best;

  dist.forEach((row, y) =>
    row.forEach((d, x) => {
      if (d > distTo(best)) best = { x, y };
    }),
  );
  return best;
}
