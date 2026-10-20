import Phaser from 'phaser';
import { AuthScene } from './scenes/AuthScene';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';

const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#0b0b10',
    pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: [BootScene, AuthScene, GameScene, HudScene, GameOverScene],
});

// Dev-only handle for poking at the running game from the console or a test browser.
if (import.meta.env.DEV) Object.assign(window, { game });
