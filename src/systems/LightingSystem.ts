import Phaser from 'phaser';
import { TEXTURES } from '../config';

const LIGHT_PIPELINE = 'Light2D';
const AMBIENT = 0x2e2833;
const TORCH = { radius: 300, colour: 0xffb070, intensity: 1.6 } as const;
const EXIT_GLOW = { radius: 110, colour: 0xc9a55c, intensity: 1.2 } as const;
const SCONCE = { radius: 150, colour: 0xff8a3c, intensity: 1.1 } as const;

type Lightable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Pipeline;

/** A light whose intensity wavers around `base`; `phase` keeps neighbours out of step. */
interface Flicker {
    light: Phaser.GameObjects.Light;
    base: number;
    phase: number;
}

/** Puts an object under the torch-lit pipeline if the scene has lighting on (WebGL only). */
export function lightUp<T extends Lightable>(obj: T): T {
    if (obj.scene.lights.active) obj.setPipeline(LIGHT_PIPELINE);
    return obj;
}

/** Two out-of-step sine waves plus a little noise: 1 ± ~15%, reads as a live flame. */
function flicker(time: number, phase: number): number {
    return (
        1 +
        0.08 * Math.sin(time * 0.009 + phase) +
        0.05 * Math.sin(time * 0.023 + phase * 2.3) +
        0.04 * (Math.random() - 0.5)
    );
}

/**
 * Torch-lit darkness plus a vignette. Construct before spawning anything so `lightUp` sees the
 * lights enabled. On the canvas renderer the scene draws fully lit; sconce flames still show.
 */
export class LightingSystem {
    private torch: Phaser.GameObjects.Light | null = null;
    private target: Phaser.Types.Math.Vector2Like | null = null;
    private readonly flickers: Flicker[] = [];
    private readonly enabled: boolean;

    constructor(private readonly scene: Phaser.Scene) {
        this.enabled = scene.game.renderer.type === Phaser.WEBGL;
        if (!this.enabled) return;
        scene.lights.enable().setAmbientColor(AMBIENT);
        scene.cameras.main.postFX.addVignette(0.5, 0.5, 0.8, 0.45);
        scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
            scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this),
        );
    }

    /** A torch that tracks `target` every frame. */
    carryTorch(target: Phaser.Types.Math.Vector2Like): void {
        this.target = target;
        if (!this.enabled) return;
        const { x = 0, y = 0 } = target;
        this.torch = this.scene.lights.addLight(x, y, TORCH.radius, TORCH.colour, TORCH.intensity);
        this.flickers.push({ light: this.torch, base: TORCH.intensity, phase: 0 });
    }

    /** A soft gold glow, used to mark the exit stairs. */
    glow(x: number, y: number): void {
        if (!this.enabled) return;
        this.scene.lights.addLight(x, y, EXIT_GLOW.radius, EXIT_GLOW.colour, EXIT_GLOW.intensity);
    }

    /** A flickering wall torch on the wall tile centred at (x, y), casting light into the room below. */
    sconce(x: number, y: number): void {
        const flame = this.scene.add.image(x, y + 4, TEXTURES.flame).setDepth(1);
        this.scene.tweens.add({
            targets: flame,
            scaleY: { from: 0.92, to: 1.08 },
            alpha: { from: 0.85, to: 1 },
            duration: Phaser.Math.Between(90, 160),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
        if (!this.enabled) return;
        const light = this.scene.lights.addLight(
            x,
            y + 20,
            SCONCE.radius,
            SCONCE.colour,
            SCONCE.intensity,
        );
        this.flickers.push({ light, base: SCONCE.intensity, phase: Math.random() * Math.PI * 2 });
    }

    private update(time: number): void {
        if (this.torch && this.target)
            this.torch.setPosition(this.target.x ?? 0, this.target.y ?? 0);
        for (const { light, base, phase } of this.flickers) {
            light.setIntensity(base * flicker(time, phase));
        }
    }
}
