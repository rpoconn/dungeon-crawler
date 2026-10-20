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

/** Texture keys generated in BootScene. Enemy textures are `enemyTexture(kind)`. */
export const TEXTURES = {
  tiles: 'tiles',
  stairsDown: 'stairs-down',
  stairsUp: 'stairs-up',
  player: 'player',
  chest: 'chest',
  potion: 'potion',
} as const;

export function enemyTexture(kind: EnemyKind): string {
  return `enemy-${kind}`;
}

/** Frame indices in the `tiles` tileset texture. */
export const TILESET = {
  wall: 0,
  floors: [1, 2, 3],
} as const;
