import Phaser from 'phaser';

const WIDTH = 220;
const HEIGHT = 18;
const BORDER = 2;
const COLOURS = {
  frame: 0x0b0b10,
  empty: 0x2a1010,
  fill: 0xb3121b,
  lag: 0xe8a040,
  hurt: 0xffffff,
  heal: 0x7bdc7b,
} as const;

/**
 * Red-over-dark health bar. On damage it flashes white and leaves an amber "lag" segment that
 * drains after a beat, so the size of the hit stays readable.
 */
export class HealthBar extends Phaser.GameObjects.Container {
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly lag: Phaser.GameObjects.Rectangle;
  private readonly flash: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, hp: number, maxHp: number) {
    super(scene, x, y);
    const inner = (colour: number): Phaser.GameObjects.Rectangle =>
      scene.add.rectangle(BORDER, BORDER, WIDTH, HEIGHT, colour).setOrigin(0);

    const frame = scene.add
      .rectangle(0, 0, WIDTH + BORDER * 2, HEIGHT + BORDER * 2, COLOURS.frame)
      .setOrigin(0)
      .setStrokeStyle(1, 0x5a4a3c);
    this.lag = inner(COLOURS.lag);
    this.fill = inner(COLOURS.fill);
    this.flash = inner(COLOURS.hurt).setAlpha(0);
    this.label = scene.add
      .text(BORDER + WIDTH / 2, BORDER + HEIGHT / 2, '', {
        fontFamily: 'Georgia, serif',
        fontSize: '13px',
        color: '#f0e6d8',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.add([frame, inner(COLOURS.empty), this.lag, this.fill, this.flash, this.label]);
    scene.add.existing(this);
    this.setHp(hp, maxHp, 0);
  }

  get barWidth(): number {
    return WIDTH + BORDER * 2;
  }

  get barHeight(): number {
    return HEIGHT + BORDER * 2;
  }

  /** `delta` < 0 plays the hurt flash, > 0 the heal flash, 0 just sets the value. */
  setHp(hp: number, maxHp: number, delta: number): void {
    const ratio = Phaser.Math.Clamp(hp / maxHp, 0, 1);
    this.label.setText(`${hp} / ${maxHp}`);
    this.scene.tweens.killTweensOf([this.fill, this.lag, this.flash]);

    this.fill.scaleX = ratio;
    if (delta < 0) {
      this.scene.tweens.add({ targets: this.lag, scaleX: ratio, delay: 350, duration: 400 });
    } else {
      this.lag.scaleX = ratio;
    }
    if (delta !== 0) {
      this.flash.setFillStyle(delta < 0 ? COLOURS.hurt : COLOURS.heal).setAlpha(0.85);
      this.scene.tweens.add({ targets: this.flash, alpha: 0, duration: 250 });
    }
  }
}
