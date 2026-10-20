import Phaser from 'phaser';
import { TEXTURES } from '../config';

const SPEED = 170;
/** Smaller than a tile so the player slides through one-tile corridors without snagging. */
const BODY_SIZE = 18;

const { KeyCodes } = Phaser.Input.Keyboard;

interface MoveKeys {
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
}

/** The hero: WASD / arrow-key movement. */
export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  private readonly keys: MoveKeys | null;
  /** Last non-zero movement direction (unit vector), for attacks in Phase 3. */
  readonly facing = new Phaser.Math.Vector2(0, 1);

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURES.player);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body
      .setSize(BODY_SIZE, BODY_SIZE)
      .setOffset((this.width - BODY_SIZE) / 2, this.height - BODY_SIZE - 2);
    this.setCollideWorldBounds(true).setDepth(10);

    const keyboard = scene.input.keyboard;
    this.keys = keyboard && {
      up: [keyboard.addKey(KeyCodes.W), keyboard.addKey(KeyCodes.UP)],
      down: [keyboard.addKey(KeyCodes.S), keyboard.addKey(KeyCodes.DOWN)],
      left: [keyboard.addKey(KeyCodes.A), keyboard.addKey(KeyCodes.LEFT)],
      right: [keyboard.addKey(KeyCodes.D), keyboard.addKey(KeyCodes.RIGHT)],
    };
  }

  protected preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (!this.keys) return;

    const held = (keys: Phaser.Input.Keyboard.Key[]): number =>
      keys.some((k) => k.isDown) ? 1 : 0;
    const dir = new Phaser.Math.Vector2(
      held(this.keys.right) - held(this.keys.left),
      held(this.keys.down) - held(this.keys.up),
    ).normalize();

    this.body.setVelocity(dir.x * SPEED, dir.y * SPEED);
    if (dir.lengthSq() > 0) {
      this.facing.copy(dir);
      if (dir.x !== 0) this.setFlipX(dir.x < 0);
    }
  }
}
