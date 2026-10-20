import Phaser from 'phaser';
import { MAX_LEVEL, SCENES } from '../config';
import { complete, descend, newSave, type SaveState } from '../logic/save';
import type { GameOverData } from '../scenes/GameOverScene';
import type { GameSceneData } from '../scenes/GameScene';
import type { SaveSystem } from './SaveSystem';

const FADE_MS = 300;

/**
 * Watches the exit stairs: next floor on overlap, victory when leaving the last floor. The next
 * floor (or the completed run) is saved as the player steps on the stairs.
 */
export class FloorSystem {
    private leaving = false;

    constructor(
        private readonly scene: Phaser.Scene,
        player: Phaser.Types.Physics.Arcade.ArcadeColliderType,
        exit: Phaser.Types.Physics.Arcade.ArcadeColliderType,
        private readonly snapshot: () => SaveState,
        private readonly saves: SaveSystem,
    ) {
        scene.physics.add.overlap(player, exit, () => this.leave());
    }

    private leave(): void {
        if (this.leaving) return;
        this.leaving = true;

        const state = this.snapshot();
        const escaped = state.level >= MAX_LEVEL;
        const next = escaped ? complete(state) : descend(state);
        void this.saves.commit(next);

        const camera = this.scene.cameras.main;
        this.scene.physics.pause();
        camera.fadeOut(FADE_MS, 0, 0, 0);
        camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            if (escaped) {
                const data: GameOverData = { outcome: 'victory', nextRun: newSave() };
                this.scene.scene.start(SCENES.gameOver, data);
            } else {
                this.scene.scene.restart({ save: next } satisfies GameSceneData);
            }
        });
    }
}
