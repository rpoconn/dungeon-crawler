/** Wall torches: which wall tiles get a flickering sconce. Seeded, so a floor always looks the same. */

import { TILE, tileAt, type Floor, type Point } from './dungeon';
import { chance, pick, type Rng } from './random';

/** Phaser's Light2D renders 10 lights by default; leave room for the player's torch and the exit. */
export const MAX_SCONCES = 7;
const SCONCE_CHANCE = 0.75;

/**
 * At most one sconce per room, on its top wall so the flame faces into the room. Doorways (floor
 * tiles in the wall row) are skipped.
 */
export function planSconces(floor: Floor, rng: Rng): Point[] {
  const out: Point[] = [];
  for (const room of floor.rooms) {
    if (out.length >= MAX_SCONCES) break;
    const y = room.top - 1;
    const spots: Point[] = [];
    for (let x = room.left; x <= room.right; x++) {
      if (tileAt(floor, x, y) === TILE.wall) spots.push({ x, y });
    }
    if (spots.length > 0 && chance(rng, SCONCE_CHANCE)) out.push(pick(rng, spots));
  }
  return out;
}
