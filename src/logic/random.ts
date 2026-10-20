/** Injectable RNG so game rules stay deterministic per seed and testable with fixed rolls. */

import { RNG } from 'rot-js';

/** Uniform float in [0, 1). */
export type Rng = () => number;

/** An independent rot-js generator, so rolls here never disturb the shared `RNG` used by map gen. */
export function seededRng(seed: number): Rng {
    const rng = RNG.clone().setSeed(seed);
    return () => rng.getUniform();
}

export function chance(rng: Rng, probability: number): boolean {
    return rng() < probability;
}

/** Integer in [min, max], inclusive. */
export function between(rng: Rng, min: number, max: number): number {
    return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
    const item = items[Math.floor(rng() * items.length)];
    if (item === undefined) throw new Error('pick() from an empty list');
    return item;
}

export function weightedPick<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    let roll = rng() * total;
    for (const item of items) {
        roll -= weight(item);
        if (roll < 0) return item;
    }
    return pick(rng, items);
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const a = out[i];
        const b = out[j];
        if (a === undefined || b === undefined) continue;
        out[i] = b;
        out[j] = a;
    }
    return out;
}
