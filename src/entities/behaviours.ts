/** Per-behaviour enemy state machines, run from `Enemy.preUpdate`. */

import Phaser from 'phaser';
import { LUNGE, type Behaviour } from '../logic/enemies';
import type { Enemy } from './Enemy';

type BehaviourFn = (enemy: Enemy, time: number) => void;

/** Walk the path to the player. */
const chase: BehaviourFn = (e) => {
    if (e.mode === 'idle') e.halt();
    else e.move(e.chaseAngle());
};

/** Erratic flutter: re-roll heading every few hundred ms, loosely toward the player once hunting. */
const wander: BehaviourFn = (e, time) => {
    if (time < e.timer) return;
    e.timer = time + Phaser.Math.Between(220, 480);
    if (e.mode === 'idle') {
        e.move(Phaser.Math.FloatBetween(-Math.PI, Math.PI), 0.3);
    } else {
        e.move(e.chaseAngle() + Phaser.Math.FloatBetween(-0.9, 0.9));
    }
};

/** Hold at range and fire; close in when out of range or sight, back off when crowded. */
const ranged: BehaviourFn = (e, time) => {
    const attack = e.stats.ranged;
    if (!attack || e.mode === 'idle') return e.halt();

    const dist = e.distanceToPlayer();
    const sees = e.canSeePlayer();
    if (!sees || dist > attack.range) e.move(e.chaseAngle());
    else if (dist < attack.keepAway) e.move(e.angleToPlayer() + Math.PI);
    else e.halt();

    if (sees && dist <= attack.range && time >= e.timer) {
        e.timer = time + attack.cooldownMs;
        e.world.shoot(e, e.angleToPlayer());
    }
};

/** Chase, then when close: freeze and glow (windup), dash in a straight line, recover. */
const lunge: BehaviourFn = (e, time) => {
    switch (e.mode) {
        case 'idle':
            e.halt();
            return;
        case 'windup':
            if (time >= e.modeUntil) {
                e.mode = 'lunge';
                e.modeUntil = time + LUNGE.dashMs;
                e.scene.physics.velocityFromRotation(
                    e.angleToPlayer(),
                    LUNGE.dashSpeed,
                    e.body.velocity,
                );
            }
            return;
        case 'lunge':
            if (time >= e.modeUntil) e.setMode('hunt', time + LUNGE.cooldownMs);
            return;
        case 'hunt':
            if (time >= e.timer && e.distanceToPlayer() < LUNGE.triggerRange && e.canSeePlayer()) {
                e.mode = 'windup';
                e.modeUntil = time + LUNGE.windupMs;
                e.halt();
                e.setTint(0xff5030);
            } else {
                e.move(e.chaseAngle());
            }
    }
};

export const BEHAVIOURS: Readonly<Record<Behaviour, BehaviourFn>> = {
    chase,
    wander,
    ranged,
    lunge,
    // Summoning is triggered from Enemy.hurt; movement and firing are plain ranged.
    summoner: ranged,
};
