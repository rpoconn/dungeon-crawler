/** Enemy kinds: base stats, AI behaviour tags and per-floor scaling. */

export const ENEMY_KINDS = ['skeleton', 'zombie', 'bat', 'cultist', 'ghoul', 'lich'] as const;
export type EnemyKind = (typeof ENEMY_KINDS)[number];

/** Which state machine `Enemy` runs. `summoner` is `ranged` plus calling bats when hit. */
export type Behaviour = 'chase' | 'wander' | 'ranged' | 'lunge' | 'summoner';

export interface RangedAttack {
    /** Fires only when the player is visible and within this many pixels. */
    range: number;
    /** Backs away when the player is closer than this. */
    keepAway: number;
    cooldownMs: number;
    projectileSpeed: number;
    projectileColour: number;
}

export interface EnemyType {
    behaviour: Behaviour;
    hp: number;
    /** Contact damage, or projectile damage for ranged kinds. */
    damage: number;
    /** Pixels per second. */
    speed: number;
    /** Sprite scale; the physics body scales with it. */
    scale: number;
    colour: number;
    /** First floor this kind can appear on. */
    minLevel: number;
    /** Relative spawn frequency among the kinds allowed on a floor. */
    weight: number;
    ranged?: RangedAttack;
}

export const ENEMY_TYPES: Readonly<Record<EnemyKind, EnemyType>> = {
    skeleton: {
        behaviour: 'chase',
        hp: 22,
        damage: 8,
        speed: 85,
        scale: 1,
        colour: 0xd9d2c0,
        minLevel: 1,
        weight: 5,
    },
    zombie: {
        behaviour: 'chase',
        hp: 55,
        damage: 13,
        speed: 48,
        scale: 1.2,
        colour: 0x5f7f3a,
        minLevel: 1,
        weight: 3,
    },
    bat: {
        behaviour: 'wander',
        hp: 8,
        damage: 4,
        speed: 135,
        scale: 0.7,
        colour: 0x5a4a6e,
        minLevel: 1,
        weight: 4,
    },
    cultist: {
        behaviour: 'ranged',
        hp: 20,
        damage: 9,
        speed: 65,
        scale: 1,
        colour: 0x8c1c1c,
        minLevel: 2,
        weight: 3,
        ranged: {
            range: 230,
            keepAway: 110,
            cooldownMs: 1600,
            projectileSpeed: 190,
            projectileColour: 0xff5a2a,
        },
    },
    ghoul: {
        behaviour: 'lunge',
        hp: 32,
        damage: 10,
        speed: 72,
        scale: 1.05,
        colour: 0x7a6a4f,
        minLevel: 3,
        weight: 3,
    },
    lich: {
        behaviour: 'summoner',
        hp: 90,
        damage: 15,
        speed: 50,
        scale: 1.35,
        colour: 0x3fa7b5,
        minLevel: 7,
        weight: 1,
        ranged: {
            range: 260,
            keepAway: 140,
            cooldownMs: 2000,
            projectileSpeed: 150,
            projectileColour: 0x7fffe0,
        },
    },
};

/** Lunge tuning for `lunge` enemies: wind up, then dash for double contact damage. */
export const LUNGE = {
    triggerRange: 95,
    windupMs: 320,
    dashMs: 260,
    dashSpeed: 320,
    cooldownMs: 1400,
    damageMultiplier: 2,
} as const;

/** Summoner tuning: bats called per hit, the gap between calls, and the cap on live summons. */
export const SUMMON = { batsPerHit: 2, cooldownMs: 2500, maxAlive: 6 } as const;

export interface EnemyStats extends EnemyType {
    kind: EnemyKind;
}

/** Base stats scaled for depth: +15% hp, +10% damage and +2% speed per floor below the first. */
export function enemyStats(kind: EnemyKind, level: number): EnemyStats {
    const base = ENEMY_TYPES[kind];
    const depth = Math.max(0, level - 1);
    return {
        ...base,
        kind,
        hp: Math.round(base.hp * (1 + 0.15 * depth)),
        damage: Math.round(base.damage * (1 + 0.1 * depth)),
        speed: Math.round(base.speed * (1 + 0.02 * depth)),
    };
}

export function kindsForLevel(level: number): EnemyKind[] {
    return ENEMY_KINDS.filter((kind) => ENEMY_TYPES[kind].minLevel <= level);
}
