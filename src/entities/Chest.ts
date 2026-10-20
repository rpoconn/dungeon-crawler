import Phaser from 'phaser';
import { TEXTURES } from '../config';
import { lightUp } from '../systems/LightingSystem';

/** A solid chest. PickupSystem shows the prompt when the player is close and opens it on E. */
export class Chest extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.StaticBody;
  opened = false;
  private readonly prompt: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, TEXTURES.chest);
    scene.add.existing(this);
    scene.physics.add.existing(this, true);
    this.body.setSize(22, 18);
    this.setDepth(5);
    lightUp(this);

    this.prompt = scene.add
      .text(x, y - 24, 'E', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#0b0b10',
        backgroundColor: '#c9a55c',
      })
      .setPadding(5, 1)
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);
  }

  setPromptVisible(visible: boolean): void {
    this.prompt.setVisible(visible && !this.opened);
  }

  open(): void {
    this.opened = true;
    this.setTexture(TEXTURES.chestOpen);
    this.prompt.destroy();
  }
}
