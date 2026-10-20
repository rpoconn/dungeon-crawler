import Phaser from 'phaser';
import { TILE_SIZE, enemyTexture } from '../config';
import { applyDamage, isDead } from '../logic/combat';
import { toTile, toTileSpace, toWorld } from '../logic/coords';
import type { Floor } from '../logic/dungeon';
import { LUNGE, SUMMON, type EnemyStats } from '../logic/enemies';
import { hasLineOfSight, stepToward } from '../logic/pathing';
import { lightUp } from '../systems/LightingSystem';
import { BEHAVIOURS } from './behaviours';
import type { Player } from './Player';

/** Wakes up when the walk to the player is this many steps or fewer… */
const AGGRO_STEPS = 10;
/** …and gives up beyond this many. */
const LEASH_STEPS = 18;
/** Within this range and in sight, heads straight for the player instead of following the path. */
const DIRECT_RANGE = 4 * TILE_SIZE;
const BODY_RADIUS = 9;
const KNOCKBACK = { speed: 200, ms: 130 } as const;
const FLASH_MS = 80;

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

    const away = new Phaser.Math.Vector2(this.x - (from.x ?? this.x), this.y - (from.y ?? this.y));
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

  /** Shrinks away, then removes itself. */
  die(): void {
    this.dying = true;
    this.body.enable = false;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: this.scale * 0.4,
      duration: 160,
      onComplete: () => this.destroy(),
    });
  }

  setMode(mode: EnemyMode, timer = this.timer): void {
    this.mode = mode;
    this.timer = timer;
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
    if (this.distanceToPlayer() < DIRECT_RANGE && this.canSeePlayer()) return this.angleToPlayer();
    const next = stepToward(this.world.pathField(), toTile(this.x, this.y));
    if (!next) return this.angleToPlayer();
    const [nx, ny] = toWorld(next);
    return Phaser.Math.Angle.Between(this.x, this.y, nx, ny);
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
