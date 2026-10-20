import Phaser from 'phaser';
import { GAME_EVENTS, TEXTURES } from '../config';
import { applyDamage, applyHeal, isDead, type Swing } from '../logic/combat';
import type { Weapon } from '../logic/weapons';
import { lightUp } from '../systems/LightingSystem';
import { playMotion } from './motion';

const SPEED = 170;
/** Smaller than a tile so the player slides through one-tile corridors without snagging. */
const BODY_SIZE = 18;
export const PLAYER_RADIUS = BODY_SIZE / 2;
const INVULNERABLE_MS = 700;
const KNOCKBACK = { speed: 240, ms: 120 } as const;
const HIT_FLASH = { colour: 0xff3030, ms: 90 } as const;
/** Camera shake on a hit: a floor for chip damage, growing with the share of max hp lost. */
const SHAKE = { ms: 140, min: 0.004, perMaxHp: 0.03 } as const;

/** Events emitted on the Player itself. */
export const PLAYER_EVENTS = {
  /** (swing: Swing, weapon: Weapon) */
  swing: 'swing',
  died: 'died',
} as const;

const { KeyCodes } = Phaser.Input.Keyboard;

interface MoveKeys {
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
  attack: Phaser.Input.Keyboard.Key;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  weapon: Weapon;
}

/** The hero: WASD / arrow-key movement, Space or click to swing, hp with brief i-frames after a hit. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private readonly keys: MoveKeys | null;
  /** Last non-zero movement (or click-aim) direction, as a unit vector. */
  readonly facing = new Phaser.Math.Vector2(0, 1);
  hp: number;
  readonly maxHp: number;
  weapon: Weapon;
  private nextSwingAt = 0;
  private invulnerableUntil = 0;
  private stunnedUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, stats: PlayerStats) {
    super(scene, x, y, TEXTURES.player);
    ({ hp: this.hp, maxHp: this.maxHp, weapon: this.weapon } = stats);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body
      .setSize(BODY_SIZE, BODY_SIZE)
      .setOffset((this.width - BODY_SIZE) / 2, this.height - BODY_SIZE - 2);
    this.setCollideWorldBounds(true).setDepth(10);
    lightUp(this);

    const keyboard = scene.input.keyboard;
    this.keys = keyboard && {
      up: [keyboard.addKey(KeyCodes.W), keyboard.addKey(KeyCodes.UP)],
      down: [keyboard.addKey(KeyCodes.S), keyboard.addKey(KeyCodes.DOWN)],
      left: [keyboard.addKey(KeyCodes.A), keyboard.addKey(KeyCodes.LEFT)],
      right: [keyboard.addKey(KeyCodes.D), keyboard.addKey(KeyCodes.RIGHT)],
      attack: keyboard.addKey(KeyCodes.SPACE),
    };
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown() || !this.active) return;
      this.facing.set(pointer.worldX - this.x, pointer.worldY - this.y).normalize();
      this.swing();
    });
  }

  get dead(): boolean {
    return isDead(this.hp);
  }

  /** Returns false if the hit was ignored (i-frames or already dead). */
  takeDamage(amount: number, from: Phaser.Types.Math.Vector2Like): boolean {
    const now = this.scene.time.now;
    if (this.dead || now < this.invulnerableUntil) return false;

    const before = this.hp;
    this.hp = applyDamage(this.hp, amount);
    this.invulnerableUntil = now + INVULNERABLE_MS;
    this.stunnedUntil = now + KNOCKBACK.ms;
    const away = new Phaser.Math.Vector2(this.x - (from.x ?? this.x), this.y - (from.y ?? this.y));
    away.normalize().scale(KNOCKBACK.speed);
    this.body.setVelocity(away.x, away.y);
    this.setTintFill(HIT_FLASH.colour);
    this.scene.time.delayedCall(HIT_FLASH.ms, () => this.clearTint());
    const lost = (before - this.hp) / this.maxHp;
    this.scene.cameras.main.shake(SHAKE.ms, SHAKE.min + SHAKE.perMaxHp * lost);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 90,
      yoyo: true,
      repeat: Math.floor(INVULNERABLE_MS / 180) - 1,
      onComplete: () => this.setAlpha(1),
    });

    this.emitHp(this.hp - before);
    if (this.dead) {
      this.body.setVelocity(0, 0);
      this.emit(PLAYER_EVENTS.died);
    }
    return true;
  }

  /** Returns false (and heals nothing) at full health. */
  heal(amount: number): boolean {
    if (this.hp >= this.maxHp) return false;
    const before = this.hp;
    this.hp = applyHeal(this.hp, this.maxHp, amount);
    this.emitHp(this.hp - before);
    return true;
  }

  equip(weapon: Weapon): void {
    this.weapon = weapon;
    this.scene.events.emit(GAME_EVENTS.weaponChanged, weapon.name);
  }

  protected preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    playMotion(this, this.body.velocity);
    if (!this.keys || this.dead) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.swing();
    if (time < this.stunnedUntil) return;

    const held = (keys: Phaser.Input.Keyboard.Key[]): number =>
      keys.some((k) => k.isDown) ? 1 : 0;
    const dir = new Phaser.Math.Vector2(
      held(this.keys.right) - held(this.keys.left),
      held(this.keys.down) - held(this.keys.up),
    ).normalize();

    this.body.setVelocity(dir.x * SPEED, dir.y * SPEED);
    if (dir.lengthSq() > 0) this.facing.copy(dir);
    if (this.facing.x !== 0) this.setFlipX(this.facing.x < 0);
  }

  private swing(): void {
    const now = this.scene.time.now;
    if (this.dead || now < this.nextSwingAt) return;
    this.nextSwingAt = now + this.weapon.cooldownMs;
    const { reach, arc } = this.weapon;
    const swing: Swing = {
      origin: { x: this.x, y: this.y },
      angle: this.facing.angle(),
      reach,
      arc,
    };
    this.emit(PLAYER_EVENTS.swing, swing, this.weapon);
  }

  private emitHp(delta: number): void {
    this.scene.events.emit(GAME_EVENTS.hpChanged, this.hp, this.maxHp, delta);
  }
}
