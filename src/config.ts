/** Game-wide constants. */

import type { EnemyKind } from './logic/enemies';

export const TILE_SIZE = 32;
export const MAX_LEVEL = 10;

export const API_BASE: string = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000';

export const SCENES = {
  boot: 'BootScene',
  auth: 'AuthScene',
  game: 'GameScene',
  hud: 'HudScene',
  gameOver: 'GameOverScene',
} as const;

/** Texture keys built in BootScene. Enemy textures are `enemyTexture(kind)`. */
export const TEXTURES = {
  tiles: 'tiles',
  stairsDown: 'stairs-down',
  stairsUp: 'stairs-up',
  player: 'player',
  chest: 'chest',
  chestOpen: 'chest-open',
  potion: 'potion',
  bolt: 'bolt',
  spark: 'spark',
  flame: 'flame',
} as const;

export function enemyTexture(kind: EnemyKind): string {
  return `enemy-${kind}`;
}

export type Motion = 'idle' | 'run';

/** Looping animation BootScene registers for each creature texture (player and enemies). */
export function animKey(texture: string, motion: Motion): string {
  return `${texture}-${motion}`;
}

/** Events GameScene emits on its own `events` emitter; HudScene listens. */
export const GAME_EVENTS = {
  /** (hp: number, maxHp: number, delta: number) */
  hpChanged: 'hp-changed',
  /** (weaponName: string) */
  weaponChanged: 'weapon-changed',
  /** (message: string) */
  notice: 'notice',
} as const;

/** Frame indices in the `tiles` tileset texture. */
export const TILESET = {
  /** Brick face, for walls with floor directly below. */
  wallFace: 0,
  /** Wall top, for the other walls around a room. */
  wallTop: 1,
  /** Frame 2 is the plain floor; it is listed several times so the cracked ones stay occasional. */
  floors: [2, 2, 2, 2, 2, 2, 2, 3, 4, 5, 6, 7, 8, 9],
} as const;
