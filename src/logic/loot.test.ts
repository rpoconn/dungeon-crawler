import { describe, expect, it } from 'vitest';
import { MAX_LEVEL } from '../config';
import {
    HEALTH_DROP,
    chestTierCap,
    healthDropChance,
    rollChestWeapon,
    rollHealthDrop,
} from './loot';
import { seededRng } from './random';
import { MAX_TIER, WEAPONS, getWeapon } from './weapons';

describe('health drops', () => {
    it('are likely below 30% hp and rare otherwise', () => {
        expect(healthDropChance(29, 100)).toBe(HEALTH_DROP.lowHpChance);
        expect(healthDropChance(30, 100)).toBe(HEALTH_DROP.baseChance);
        expect(healthDropChance(100, 100)).toBe(HEALTH_DROP.baseChance);
    });

    it('roll against the chance', () => {
        expect(rollHealthDrop(10, 100, () => 0.59)).toBe(true);
        expect(rollHealthDrop(10, 100, () => 0.61)).toBe(false);
        expect(rollHealthDrop(90, 100, () => 0.14)).toBe(true);
        expect(rollHealthDrop(90, 100, () => 0.16)).toBe(false);
    });
});

describe('chest weapons', () => {
    it('cap rises with depth and reaches the top tier', () => {
        const caps = Array.from({ length: MAX_LEVEL }, (_, i) => chestTierCap(i + 1));
        expect(caps[0]).toBe(1);
        expect(caps).toEqual([...caps].sort((a, b) => a - b));
        expect(caps.at(-1)).toBe(MAX_TIER);
    });

    it('never roll below the current tier', () => {
        const rng = seededRng(5);
        for (const weapon of WEAPONS) {
            for (let level = 1; level <= MAX_LEVEL; level++) {
                const rolled = rollChestWeapon(weapon.id, level, rng);
                expect(rolled.tier).toBeGreaterThanOrEqual(weapon.tier);
                expect(rolled.tier).toBeLessThanOrEqual(Math.max(weapon.tier, chestTierCap(level)));
            }
        }
    });

    it('upgrade when the floor allows it', () => {
        expect(rollChestWeapon('rusty-dagger', 1, () => 0).id).toBe('short-sword');
        expect(rollChestWeapon('short-sword', 7, () => 0.99).id).toBe('runed-blade');
    });

    it('return the current weapon when nothing better is allowed', () => {
        expect(rollChestWeapon('war-axe', 2, () => 0.5).id).toBe('war-axe');
    });
});

describe('getWeapon', () => {
    it('falls back to the starting weapon for unknown ids', () => {
        expect(getWeapon('banana').id).toBe('rusty-dagger');
    });
});
