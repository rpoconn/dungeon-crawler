import Phaser from 'phaser';
import { TEXTURES, TILE_SIZE, enemyTexture } from '../config';
import { applyDamage, isDead } from '../logic/combat';
import { toTile, toTileSpace, toWorld } from '../logic/coords';
import type { Floor, Point } from '../logic/dungeon';
import { LUNGE, SUMMON, type EnemyStats } from '../logic/enemies';
import { findPath, hasLineOfSight } from '../logic/pathing';
import { lightUp } from '../systems/LightingSystem';
import { BEHAVIOURS } from './behaviours';
import { playMotion } from './motion';
import type { Player } from './Player';

/** Wakes up when the walk to the player is this many steps or fewer… */
const AGGRO_STEPS = 10;
/** …and gives up beyond this many. */
const LEASH_STEPS = 18;
/** Within this range and in sight, heads straight for the player instead of following the path. */
const DIRECT_RANGE = 4 * TILE_SIZE;
/** A waypoint counts as reached within this many pixels of its tile centre. */
const WAYPOINT_REACHED = 4;
const BODY_RADIUS = 9;
const KNOCKBACK = { speed: 200, ms: 130 } as const;
const FLASH_MS = 80;
const BURST = { count: 14, lifespanMs: 450 } as const;

/** What enemies need from the world around them. Implemented by SpawnSystem. */
export interface EnemyWorld {
    readonly player: Player;
    readonly floor: Floor;
    /** BFS step counts to the player's current tile. */
    pathField(): number[][];
    shoot(from: Enemy, angle: number): void;
    summon(by: Enemy): void;
}

/** idle → hunt on aggro; `windup` and `lunge` are the ghoul's dash. */
export type EnemyMode = 'idle' | 'hunt' | 'windup' | 'lunge';

/** A monster. Movement helpers live here; the per-kind state machines live in `behaviours.ts`. */
export class Enemy extends Phaser.Physics.Arcade.Sprite {
    declare body: Phaser.Physics.Arcade.Body;
    hp: number;
    mode: EnemyMode = 'idle';
    /** Behaviour-specific clock: next shot, next lunge, next wander re-roll. */
    timer = 0;
    /** When the current windup / lunge ends. */
    modeUntil = 0;
    /** Bats called by a lich; they count against its summon cap. */
    summoned = false;
    /** Remaining A* waypoints to the player, and the player tile they lead to. */
    private path: Point[] = [];
    private pathGoal = '';
    private stunnedUntil = 0;
    private lastSummonAt = -Infinity;
    private dying = false;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        readonly stats: EnemyStats,
        readonly world: EnemyWorld,
    ) {
        super(scene, x, y, enemyTexture(stats.kind));
        this.hp = stats.hp;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setScale(stats.scale).setDepth(9);
        this.body.setCircle(
            BODY_RADIUS,
            this.width / 2 - BODY_RADIUS,
            this.height / 2 - BODY_RADIUS - 1,
        );
        lightUp(this);
    }

    get radius(): number {
        return BODY_RADIUS * this.stats.scale;
    }

    /** Lunging doubles contact damage; casters are weak up close. */
    get contactDamage(): number {
        const { damage, ranged } = this.stats;
        if (this.mode === 'lunge') return damage * LUNGE.damageMultiplier;
        return ranged ? Math.ceil(damage / 2) : damage;
    }

    get alive(): boolean {
        return this.active && !this.dying;
    }

    /** Applies a hit; returns true if it was fatal. */
    hurt(amount: number, from: Phaser.Types.Math.Vector2Like): boolean {
        const now = this.scene.time.now;
        this.hp = applyDamage(this.hp, amount);
        if (this.mode !== 'hunt') this.setMode('hunt', now + 400);
        this.setTintFill(0xffffff);
        this.scene.time.delayedCall(FLASH_MS, () => this.clearTint());

        const away = new Phaser.Math.Vector2(
            this.x - (from.x ?? this.x),
            this.y - (from.y ?? this.y),
        );
        away.normalize().scale(KNOCKBACK.speed / this.stats.scale);
        this.body.setVelocity(away.x, away.y);
        this.stunnedUntil = now + KNOCKBACK.ms;

        const dead = isDead(this.hp);
        if (
            !dead &&
            this.stats.behaviour === 'summoner' &&
            now - this.lastSummonAt > SUMMON.cooldownMs
        ) {
            this.lastSummonAt = now;
            this.world.summon(this);
        }
        return dead;
    }

    /** Bursts into sparks of its own colour, shrinks away, then removes itself. */
    die(): void {
        this.dying = true;
        this.body.enable = false;
        this.burst();
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scale: this.scale * 0.4,
            duration: 160,
            onComplete: () => this.destroy(),
        });
    }

    /** Unlit sparks, so the burst reads even at the edge of the torchlight. */
    private burst(): void {
        const sparks = this.scene.add
            .particles(this.x, this.y, TEXTURES.spark, {
                speed: { min: 50, max: 170 },
                lifespan: { min: BURST.lifespanMs / 2, max: BURST.lifespanMs },
                scale: { start: this.stats.scale, end: 0 },
                alpha: { start: 1, end: 0 },
                tint: [this.stats.colour, 0xffffff],
                emitting: false,
            })
            .setDepth(11);
        sparks.explode(Math.round(BURST.count * this.stats.scale));
        this.scene.time.delayedCall(BURST.lifespanMs, () => sparks.destroy());
    }

    setMode(mode: EnemyMode, timer = this.timer): void {
        this.mode = mode;
        this.timer = timer;
        if (mode === 'idle') this.path = [];
        this.clearTint();
    }

    distanceToPlayer(): number {
        const { player } = this.world;
        return Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    }

    angleToPlayer(): number {
        const { player } = this.world;
        return Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    }

    canSeePlayer(): boolean {
        const { player, floor } = this.world;
        return hasLineOfSight(floor, toTileSpace(this.x, this.y), toTileSpace(player.x, player.y));
    }

    /** Angle to steer toward the player: straight at them when close and visible, else along the path. */
    chaseAngle(): number {
        if (this.distanceToPlayer() < DIRECT_RANGE && this.canSeePlayer())
            return this.angleToPlayer();
        const next = this.nextWaypoint();
        if (!next) return this.angleToPlayer();
        const [nx, ny] = toWorld(next);
        return Phaser.Math.Angle.Between(this.x, this.y, nx, ny);
    }

    /**
     * Front of the A* route to the player's tile. Rebuilt when the player changes tile or the enemy is
     * knocked off it; trimmed as waypoints are reached or the one after comes into clear reach.
     */
    private nextWaypoint(): Point | undefined {
        const { player, floor } = this.world;
        const here = toTile(this.x, this.y);
        const goal = toTile(player.body.center.x, player.body.center.y);
        const goalKey = `${goal.x},${goal.y}`;
        const first = this.path[0];
        const offPath =
            !first ||
            !hasLineOfSight(floor, toTileSpace(this.x, this.y), {
                x: first.x + 0.5,
                y: first.y + 0.5,
            });
        if (goalKey !== this.pathGoal || offPath) {
            this.path = findPath(floor, here, goal) ?? [];
            this.pathGoal = goalKey;
        }

        const [head, after] = this.path;
        if (
            head &&
            Phaser.Math.Distance.Between(this.x, this.y, ...toWorld(head)) < WAYPOINT_REACHED
        ) {
            this.path.shift();
        } else if (after && this.canWalkStraightTo(after)) {
            this.path.shift();
        }
        return this.path[0];
    }

    /** Clear line to a tile centre for the whole body width, not just its centre. */
    private canWalkStraightTo(tile: Point): boolean {
        const { floor } = this.world;
        const from = toTileSpace(this.x, this.y);
        const to = { x: tile.x + 0.5, y: tile.y + 0.5 };
        const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
        const offset = this.radius / TILE_SIZE;
        const nx = (-(to.y - from.y) / length) * offset;
        const ny = ((to.x - from.x) / length) * offset;
        return [-1, 0, 1].every((side) =>
            hasLineOfSight(
                floor,
                { x: from.x + nx * side, y: from.y + ny * side },
                { x: to.x + nx * side, y: to.y + ny * side },
            ),
        );
    }

    move(angle: number, speedScale = 1): void {
        this.scene.physics.velocityFromRotation(
            angle,
            this.stats.speed * speedScale,
            this.body.velocity,
        );
        if (Math.abs(this.body.velocity.x) > 1) this.setFlipX(this.body.velocity.x < 0);
    }

    halt(): void {
        this.body.setVelocity(0, 0);
    }

    protected preUpdate(time: number, delta: number): void {
        super.preUpdate(time, delta);
        playMotion(this, this.body.velocity);
        if (this.dying || time < this.stunnedUntil || this.world.player.dead) {
            if (this.world.player.dead) this.halt();
            return;
        }
        this.updateAggro(time);
        BEHAVIOURS[this.stats.behaviour](this, time);
    }

    private updateAggro(time: number): void {
        const { x, y } = toTile(this.x, this.y);
        const steps = this.world.pathField()[y]?.[x] ?? -1;
        if (this.mode === 'idle' && steps >= 0 && steps <= AGGRO_STEPS) {
            // A short beat before the first shot or lunge, so aggro never lands as an instant hit.
            this.setMode('hunt', time + 500);
        } else if (this.mode === 'hunt' && (steps < 0 || steps > LEASH_STEPS)) {
            this.setMode('idle');
        }
    }
}
