/** Chest weapon rolls and enemy health-potion drops. */

import { pick, type Rng } from './random';
import { MAX_TIER, getWeapon, weaponAtTier, type Weapon } from './weapons';

export const HEALTH_DROP = {
    /** Below this fraction of max hp, drops become likely. */
    lowHpRatio: 0.3,
    lowHpChance: 0.6,
    baseChance: 0.15,
    heal: 30,
} as const;

export function healthDropChance(hp: number, maxHp: number): number {
    return hp / maxHp < HEALTH_DROP.lowHpRatio ? HEALTH_DROP.lowHpChance : HEALTH_DROP.baseChance;
}

export function rollHealthDrop(hp: number, maxHp: number, rng: Rng): boolean {
    return rng() < healthDropChance(hp, maxHp);
}

/** Best weapon tier a chest can hold on a floor: tier 1 on floors 1–2, rising to the top tier by 7. */
export function chestTierCap(level: number): number {
    return Math.min(MAX_TIER, Math.max(1, Math.ceil(level / 2)));
}

/**
 * A weapon at or above the current tier. Upgrades within the floor's cap are preferred; the
 * current weapon comes back only when nothing better is allowed yet (callers can treat that as
 * "nothing new inside").
 */
export function rollChestWeapon(currentId: string, level: number, rng: Rng): Weapon {
    const current = getWeapon(currentId).tier;
    const cap = chestTierCap(level);
    if (current >= cap) return getWeapon(currentId);

    const tiers = Array.from({ length: cap - current }, (_, i) => current + 1 + i);
    return weaponAtTier(pick(rng, tiers));
}
