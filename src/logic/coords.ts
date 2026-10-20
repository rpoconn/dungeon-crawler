/** Tile ↔ world-pixel conversion. */

import { TILE_SIZE } from '../config';
import type { Point } from './dungeon';

/** Centre of a tile, in pixels. */
export function toWorld(tile: Point): [number, number] {
    return [tile.x * TILE_SIZE + TILE_SIZE / 2, tile.y * TILE_SIZE + TILE_SIZE / 2];
}

/** The tile containing a pixel position. */
export function toTile(x: number, y: number): Point {
    return { x: Math.floor(x / TILE_SIZE), y: Math.floor(y / TILE_SIZE) };
}

/** A pixel position in fractional tile units, for line-of-sight checks. */
export function toTileSpace(x: number, y: number): Point {
    return { x: x / TILE_SIZE, y: y / TILE_SIZE };
}
