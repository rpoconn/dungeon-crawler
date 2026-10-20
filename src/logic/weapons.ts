/** Weapon table and damage rolls. Tier order is upgrade order; chests never roll below your tier. */

import type { Rng } from './random';

export interface Weapon {
  id: string;
  name: string;
  tier: number;
  damage: number;
  cooldownMs: number;
  /** Swing radius in pixels, measured from the player's centre. */
  reach: number;
  /** Half-angle of the swing arc, in degrees. */
  arc: number;
  /** Colour of the swing trail. */
  colour: number;
}

export const WEAPONS = [
  {
    id: 'rusty-dagger',
    name: 'Rusty Dagger',
    tier: 0,
    damage: 8,
    cooldownMs: 300,
    reach: 34,
    arc: 50,
    colour: 0xa08a70,
  },
  {
    id: 'short-sword',
    name: 'Short Sword',
    tier: 1,
    damage: 13,
    cooldownMs: 340,
    reach: 42,
    arc: 60,
    colour: 0xd0d0d8,
  },
  {
    id: 'war-axe',
    name: 'War Axe',
    tier: 2,
    damage: 24,
    cooldownMs: 560,
    reach: 44,
    arc: 70,
    colour: 0xc9a55c,
  },
  {
    id: 'flail',
    name: 'Flail',
    tier: 3,
    damage: 22,
    cooldownMs: 440,
    reach: 54,
    arc: 85,
    colour: 0x9a9aa8,
  },
  {
    id: 'runed-blade',
    name: 'Runed Blade',
    tier: 4,
    damage: 32,
    cooldownMs: 360,
    reach: 52,
    arc: 70,
    colour: 0x6fd3ff,
  },
] as const satisfies readonly Weapon[];

export type WeaponId = (typeof WEAPONS)[number]['id'];

export const STARTING_WEAPON: Weapon = WEAPONS[0];
export const MAX_TIER = WEAPONS.length - 1;

/** Unknown ids (e.g. a stale save) fall back to the starting weapon rather than crashing. */
export function getWeapon(id: string): Weapon {
  return WEAPONS.find((w) => w.id === id) ?? STARTING_WEAPON;
}

export function weaponAtTier(tier: number): Weapon {
  const clamped = Math.max(0, Math.min(MAX_TIER, tier));
  return WEAPONS.find((w) => w.tier === clamped) ?? STARTING_WEAPON;
}

/** Base damage ±15%, never below 1. */
export function rollDamage(weapon: Weapon, rng: Rng): number {
  return Math.max(1, Math.round(weapon.damage * (0.85 + 0.3 * rng())));
}
