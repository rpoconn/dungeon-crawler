import Phaser from 'phaser';
import { TEXTURES } from '../config';

/** A health potion on the floor. Left unlit so drops are easy to spot in the dark. */
export class HealthPickup extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    readonly amount: number,
  ) {
    super(scene, x, y, TEXTURES.potion);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(16, 18);
    this.setDepth(6);
    // Purely visual bob; the static body stays put.
    scene.tweens.add({
      targets: this,
      y: y - 3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }
}
