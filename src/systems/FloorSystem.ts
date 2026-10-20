import Phaser from 'phaser';
import { MAX_LEVEL, SCENES } from '../config';
import { descend, type SaveState } from '../logic/save';
import type { GameOverData } from '../scenes/GameOverScene';
import type { GameSceneData } from '../scenes/GameScene';

const FADE_MS = 300;

/** Watches the exit stairs: next floor on overlap, victory when leaving the last floor. */
export class FloorSystem {
  private leaving = false;

  constructor(
    private readonly scene: Phaser.Scene,
    player: Phaser.Types.Physics.Arcade.ArcadeColliderType,
    exit: Phaser.Types.Physics.Arcade.ArcadeColliderType,
    private readonly snapshot: () => SaveState,
  ) {
    scene.physics.add.overlap(player, exit, () => this.leave());
  }

  private leave(): void {
    if (this.leaving) return;
    this.leaving = true;

    const state = this.snapshot();
    const camera = this.scene.cameras.main;
    this.scene.physics.pause();
    camera.fadeOut(FADE_MS, 0, 0, 0);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (state.level >= MAX_LEVEL) {
        this.scene.scene.start(SCENES.gameOver, { outcome: 'victory' } satisfies GameOverData);
      } else {
        this.scene.scene.restart({ save: descend(state) } satisfies GameSceneData);
      }
    });
  }
}
