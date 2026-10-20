import Phaser from 'phaser';
import { logout } from '../api/auth';
import { flushSaves, putSave } from '../api/saves';
import { SCENES } from '../config';
import type { SaveState } from '../logic/save';
import type { GameSceneData } from './GameScene';

export type Outcome = 'victory' | 'death';

export interface GameOverData {
    outcome: Outcome;
    /** The fresh run "Play again" starts. */
    nextRun: SaveState;
    /** Logged in to a run that was already completed, rather than just finishing it. */
    returning?: boolean;
}

const COPY: Record<Outcome, { title: string; subtitle: string; colour: string }> = {
    victory: { title: 'You escaped', subtitle: 'Ten floors conquered.', colour: '#c9a55c' },
    death: { title: 'You died', subtitle: 'The dungeon claims another.', colour: '#b3121b' },
};
const RETURNING_SUBTITLE = 'Your last run cleared all ten floors. Play again?';

/** End-of-run screen: victory or death, with "play again" and "log out". */
export class GameOverScene extends Phaser.Scene {
    private run!: GameOverData;

    constructor() {
        super(SCENES.gameOver);
    }

    init(data: GameOverData): void {
        this.run = data;
    }

    create(): void {
        const { outcome, nextRun, returning = false } = this.run;
        const { title, subtitle, colour } = COPY[outcome];
        const cx = this.scale.width / 2;
        const cy = this.scale.height / 2;

        this.add
            .text(cx, cy - 80, title, {
                fontFamily: 'Georgia, serif',
                fontSize: '56px',
                color: colour,
            })
            .setOrigin(0.5);
        this.add
            .text(cx, cy - 20, returning ? RETURNING_SUBTITLE : subtitle, {
                fontFamily: 'Georgia, serif',
                fontSize: '20px',
                color: '#8a7f70',
            })
            .setOrigin(0.5);

        // A victory leaves the completed run stored until the player confirms a new one here.
        this.button(cx, cy + 50, 'Play again', async () => {
            await putSave(nextRun);
            this.scene.start(SCENES.game, { save: nextRun } satisfies GameSceneData);
        });
        this.button(cx, cy + 105, 'Log out', async () => {
            await flushSaves();
            await logout();
            this.scene.start(SCENES.auth);
        });
        this.cameras.main.fadeIn(600, 0, 0, 0);
    }

    private button(x: number, y: number, label: string, onClick: () => void | Promise<void>): void {
        const text = this.add
            .text(x, y, label, { fontFamily: 'Georgia, serif', fontSize: '20px', color: '#d8cfc0' })
            .setOrigin(0.5)
            .setPadding(20, 8)
            .setBackgroundColor('#2a1414')
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => text.setBackgroundColor('#4a1c1c'))
            .on('pointerout', () => text.setBackgroundColor('#2a1414'))
            .on('pointerup', () => {
                text.disableInteractive();
                void onClick();
            });
    }
}
