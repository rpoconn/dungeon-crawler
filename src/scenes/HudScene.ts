import Phaser from 'phaser';
import { logout } from '../api/auth';
import { putSave } from '../api/saves';
import { getSession } from '../api/session';
import { MAX_LEVEL, SCENES } from '../config';
import type { GameScene } from './GameScene';

const MARGIN = 16;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Georgia, serif',
  fontSize: '16px',
  color: '#d8cfc0',
};

export interface HudSceneData {
  level: number;
}

/** Overlay running on top of GameScene: player name, logout button, floor banner (health bar etc. come later). */
export class HudScene extends Phaser.Scene {
  private level = 1;
  private logoutButton!: Phaser.GameObjects.Text;
  private nameLabel!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.hud);
  }

  init(data: HudSceneData): void {
    this.level = data.level;
  }

  create(): void {
    this.showFloorBanner();

    this.nameLabel = this.add
      .text(0, MARGIN, getSession()?.username ?? '', { ...TEXT_STYLE, color: '#8a7f70' })
      .setOrigin(1, 0)
      .setPadding(0, 6);

    this.logoutButton = this.add
      .text(0, MARGIN, 'Log out', TEXT_STYLE)
      .setOrigin(1, 0)
      .setPadding(12, 6)
      .setBackgroundColor('#2a1414')
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => this.logoutButton.setBackgroundColor('#4a1c1c'))
      .on('pointerout', () => this.logoutButton.setBackgroundColor('#2a1414'))
      .on('pointerup', () => void this.logOut());

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this),
    );
  }

  /** "Floor N / 10" fades in and out on arrival. */
  private showFloorBanner(): void {
    const banner = this.add
      .text(this.scale.width / 2, this.scale.height * 0.3, `Floor ${this.level} / ${MAX_LEVEL}`, {
        fontFamily: 'Georgia, serif',
        fontSize: '40px',
        color: '#c9a55c',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this.tweens.chain({
      targets: banner,
      tweens: [
        { alpha: 1, duration: 500 },
        { alpha: 0, duration: 800, delay: 1200 },
      ],
      onComplete: () => banner.destroy(),
    });
  }

  private layout(): void {
    this.logoutButton.setX(this.scale.width - MARGIN);
    this.nameLabel.setX(this.logoutButton.x - this.logoutButton.width - 10);
  }

  private async logOut(): Promise<void> {
    this.logoutButton.disableInteractive().setText('Saving…');
    this.layout();

    const game = this.scene.get(SCENES.game) as GameScene;
    try {
      await putSave(game.snapshot());
    } catch (err) {
      console.warn('Save on logout failed', err);
    }
    await logout();

    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.auth);
  }
}
