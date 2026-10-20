import Phaser from 'phaser';
import { logout } from '../api/auth';
import { getSession } from '../api/session';
import { GAME_EVENTS, MAX_LEVEL, SCENES } from '../config';
import { HealthBar } from '../ui/HealthBar';
import type { GameScene } from './GameScene';

const MARGIN = 16;
const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Georgia, serif',
  fontSize: '16px',
  color: '#d8cfc0',
};
const CONTROLS = 'WASD / arrows: move   ·   Space / click: attack   ·   E: open chest';

export interface HudSceneData {
  level: number;
  hp: number;
  maxHp: number;
  weaponName: string;
}

/** Overlay on top of GameScene: health bar, weapon, floor counter, notices, name and logout. */
export class HudScene extends Phaser.Scene {
  private initial!: HudSceneData;
  private healthBar!: HealthBar;
  private weaponLabel!: Phaser.GameObjects.Text;
  private logoutButton!: Phaser.GameObjects.Text;
  private nameLabel!: Phaser.GameObjects.Text;
  private controls!: Phaser.GameObjects.Text;
  private notice: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(SCENES.hud);
  }

  init(data: HudSceneData): void {
    this.initial = data;
  }

  create(): void {
    const { level, hp, maxHp, weaponName } = this.initial;
    this.showFloorBanner(level);

    this.healthBar = new HealthBar(this, MARGIN, MARGIN, hp, maxHp);
    const below = MARGIN + this.healthBar.barHeight + 6;
    this.weaponLabel = this.add.text(MARGIN, below, weaponName, {
      ...TEXT_STYLE,
      color: '#c9a55c',
    });
    this.add.text(MARGIN, below + 22, `Floor ${level} / ${MAX_LEVEL}`, {
      ...TEXT_STYLE,
      color: '#8a7f70',
    });
    this.controls = this.add
      .text(MARGIN, 0, CONTROLS, { ...TEXT_STYLE, fontSize: '13px', color: '#6a6055' })
      .setOrigin(0, 1);

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
    this.listenToGame();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this),
    );
  }

  private listenToGame(): void {
    const game = this.scene.get(SCENES.game).events;
    const onHp = (hp: number, maxHp: number, delta: number): void =>
      this.healthBar.setHp(hp, maxHp, delta);
    const onWeapon = (name: string): void => {
      this.weaponLabel.setText(name);
    };
    const onNotice = (message: string): void => this.showNotice(message);

    game.on(GAME_EVENTS.hpChanged, onHp);
    game.on(GAME_EVENTS.weaponChanged, onWeapon);
    game.on(GAME_EVENTS.notice, onNotice);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      game.off(GAME_EVENTS.hpChanged, onHp);
      game.off(GAME_EVENTS.weaponChanged, onWeapon);
      game.off(GAME_EVENTS.notice, onNotice);
    });
  }

  /** "Floor N / 10" fades in and out on arrival. */
  private showFloorBanner(level: number): void {
    const banner = this.add
      .text(this.scale.width / 2, this.scale.height * 0.3, `Floor ${level} / ${MAX_LEVEL}`, {
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

  /** A one-line message above the bottom edge that fades after a moment. */
  private showNotice(message: string): void {
    this.notice?.destroy();
    const notice = this.add
      .text(this.scale.width / 2, this.scale.height - 70, message, {
        ...TEXT_STYLE,
        fontSize: '20px',
        color: '#e8d8a8',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.notice = notice;
    this.tweens.add({
      targets: notice,
      alpha: 0,
      delay: 1800,
      duration: 600,
      onComplete: () => {
        notice.destroy();
        if (this.notice === notice) this.notice = null;
      },
    });
  }

  private layout(): void {
    this.logoutButton.setX(this.scale.width - MARGIN);
    this.nameLabel.setX(this.logoutButton.x - this.logoutButton.width - 10);
    this.controls.setY(this.scale.height - MARGIN);
    this.notice?.setPosition(this.scale.width / 2, this.scale.height - 70);
  }

  private async logOut(): Promise<void> {
    this.logoutButton.disableInteractive().setText('Saving…');
    this.layout();

    const game = this.scene.get(SCENES.game) as GameScene;
    await game.saveAndStop();
    await logout();

    this.scene.stop(SCENES.game);
    this.scene.start(SCENES.auth);
  }
}
