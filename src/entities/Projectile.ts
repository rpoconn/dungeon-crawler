import Phaser from 'phaser';
import { TEXTURES } from '../config';

const LIFETIME_MS = 3000;
const RADIUS = 4;

/** An enemy bolt. Unlit and additive so it glows in the dark. Destroyed by walls or the player. */
export class Projectile extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly damage: number,
    colour: number,
  ) {
    super(scene, x, y, TEXTURES.bolt);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setTint(colour).setDepth(12).setBlendMode(Phaser.BlendModes.ADD);
    this.body.setCircle(RADIUS, this.width / 2 - RADIUS, this.height / 2 - RADIUS);
  }

  /** Call after adding to a physics group: group defaults would otherwise zero the velocity. */
  launch(angle: number, speed: number): this {
    this.scene.physics.velocityFromRotation(angle, speed, this.body.velocity);
    this.setRotation(angle);
    this.scene.time.delayedCall(LIFETIME_MS, () => this.destroy());
    return this;
  }
}
