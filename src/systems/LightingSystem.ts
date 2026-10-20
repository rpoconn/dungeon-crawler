import Phaser from 'phaser';

const LIGHT_PIPELINE = 'Light2D';
const AMBIENT = 0x2e2833;
const TORCH = { radius: 300, colour: 0xffb070, intensity: 1.6 } as const;
const EXIT_GLOW = { radius: 110, colour: 0xc9a55c, intensity: 1.2 } as const;

type Lightable = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Pipeline;

/** Puts an object under the torch-lit pipeline if the scene has lighting on (WebGL only). */
export function lightUp<T extends Lightable>(obj: T): T {
  if (obj.scene.lights.active) obj.setPipeline(LIGHT_PIPELINE);
  return obj;
}

/**
 * Torch-lit darkness plus a vignette. Construct before spawning anything so `lightUp` sees the
 * lights enabled. On the canvas renderer this does nothing and the scene draws fully lit.
 */
export class LightingSystem {
  private torch: Phaser.GameObjects.Light | null = null;
  private target: Phaser.Types.Math.Vector2Like | null = null;
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
  }

  /** A soft gold glow, used to mark the exit stairs. */
  glow(x: number, y: number): void {
    if (!this.enabled) return;
    this.scene.lights.addLight(x, y, EXIT_GLOW.radius, EXIT_GLOW.colour, EXIT_GLOW.intensity);
  }

  private update(): void {
    if (this.torch && this.target) this.torch.setPosition(this.target.x ?? 0, this.target.y ?? 0);
  }
}
