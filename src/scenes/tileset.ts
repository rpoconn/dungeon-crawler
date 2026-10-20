/**
 * Where each texture comes from in the 0x72 DungeonTileset II sheet (CC0,
 * https://0x72.itch.io/dungeontileset-ii). Rects are [x, y, width, height] in sheet pixels,
 * copied from the pack's `tile_list_v1.7`.
 */

import type { EnemyKind } from '../logic/enemies';

export type Rect = readonly [x: number, y: number, w: number, h: number];

export const SHEET = {
    key: 'dungeon-sheet',
    url: 'tileset/0x72_DungeonTilesetII_v1.7.png',
} as const;

/** Native tile size of the pack; everything is drawn at 2x to fill our 32px grid. */
export const SHEET_TILE = 16;

export const TILE_FRAMES = {
    /** Brick face, for walls with floor directly below. */
    wallFace: [32, 16, 16, 16],
    /** Wall top, for every other wall that borders a floor. */
    wallTop: [32, 0, 16, 16],
    floors: [
        [16, 64, 16, 16],
        [32, 64, 16, 16],
        [48, 64, 16, 16],
        [16, 80, 16, 16],
        [32, 80, 16, 16],
        [48, 80, 16, 16],
        [16, 96, 16, 16],
        [32, 96, 16, 16],
    ],
    stairsDown: [80, 192, 16, 16],
    stairsUp: [48, 96, 16, 16],
} as const satisfies Record<string, Rect | readonly Rect[]>;

export const ITEM_FRAMES = {
    chest: [304, 416, 16, 16],
    chestOpen: [336, 400, 16, 16],
    potion: [288, 336, 16, 16],
} as const satisfies Record<string, Rect>;

/**
 * A creature's animation strip: the first idle frame, with the rest laid out to its right at
 * one frame-width apart. `run` strips follow straight after the four idle frames.
 */
export interface CreatureStrip {
    first: Rect;
    hasRun: boolean;
}

export const FRAMES_PER_ANIM = 4;

export const PLAYER_STRIP: CreatureStrip = { first: [128, 100, 16, 28], hasRun: true };

/**
 * There are no bats in the pack, so bats are imps: same small, fast, swarming role. Zombies are
 * ogres, since the pack's own big zombie is a brown mound that doesn't read as a zombie.
 */
export const ENEMY_STRIPS: Readonly<Record<EnemyKind, CreatureStrip>> = {
    skeleton: { first: [368, 88, 16, 16], hasRun: true },
    zombie: { first: [16, 380, 32, 36], hasRun: true },
    bat: { first: [368, 64, 16, 16], hasRun: true },
    cultist: { first: [368, 201, 16, 23], hasRun: true },
    ghoul: { first: [368, 273, 16, 23], hasRun: true },
    lich: { first: [368, 225, 16, 23], hasRun: false },
};

/**
 * The part of a strip's frames that is ever drawn on, relative to one frame. Frames carry blank
 * headroom (the knight's is 28px tall for a ~20px figure), so scaling the trimmed box keeps
 * creatures of different frame heights at similar sizes.
 */
export function opaqueBounds(pixels: ImageData, strip: CreatureStrip, frames: number): Rect {
    const [x, y, w, h] = strip.first;
    let [minX, minY, maxX, maxY] = [w, h, -1, -1];
    for (let i = 0; i < frames; i++) {
        for (let fy = 0; fy < h; fy++) {
            for (let fx = 0; fx < w; fx++) {
                const alpha = pixels.data[((y + fy) * pixels.width + x + i * w + fx) * 4 + 3] ?? 0;
                if (alpha === 0) continue;
                minX = Math.min(minX, fx);
                maxX = Math.max(maxX, fx);
                minY = Math.min(minY, fy);
                maxY = Math.max(maxY, fy);
            }
        }
    }
    if (maxX < 0) return [0, 0, w, h];
    return [minX, minY, maxX - minX + 1, maxY - minY + 1];
}
