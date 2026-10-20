import type Phaser from 'phaser';
import { animKey } from '../config';

/** Below this speed (px/s) a creature counts as standing still. */
const MOVING_SPEED = 5;

/** Loops the creature's run or idle animation (registered in BootScene) to match its speed. */
export function playMotion(sprite: Phaser.GameObjects.Sprite, velocity: Phaser.Math.Vector2): void {
    const motion = velocity.length() > MOVING_SPEED ? 'run' : 'idle';
    sprite.play(animKey(sprite.texture.key, motion), true);
}
