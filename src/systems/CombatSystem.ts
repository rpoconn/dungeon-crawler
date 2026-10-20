import Phaser from 'phaser';
import { Enemy } from '../entities/Enemy';
import { PLAYER_EVENTS, type Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { inSwing, type Swing } from '../logic/combat';
import type { Rng } from '../logic/random';
import { rollDamage, type Weapon } from '../logic/weapons';
import type { SpawnSystem } from './SpawnSystem';

const SLASH_MS = 140;

/** Collisions and damage between the player, enemies, bolts and walls; resolves player swings. */
export class CombatSystem {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Player,
    private readonly spawns: SpawnSystem,
    walls: Phaser.Tilemaps.TilemapLayer,
    private readonly rng: Rng,
    private readonly onKill: (enemy: Enemy) => void,
  ) {
    const { physics } = scene;
    physics.add.collider(spawns.enemies, walls);
    physics.add.collider(spawns.enemies, spawns.enemies);
    physics.add.collider(spawns.projectiles, walls, (bolt) => {
      if (bolt instanceof Projectile) bolt.destroy();
    });
    physics.add.overlap(player, spawns.enemies, (_player, enemy) => {
      if (enemy instanceof Enemy && enemy.alive) player.takeDamage(enemy.contactDamage, enemy);
    });
    physics.add.overlap(player, spawns.projectiles, (_player, bolt) => {
      if (!(bolt instanceof Projectile)) return;
      player.takeDamage(bolt.damage, bolt);
      bolt.destroy();
    });
    player.on(PLAYER_EVENTS.swing, this.resolveSwing, this);
  }

  private resolveSwing(swing: Swing, weapon: Weapon): void {
    this.drawSlash(swing, weapon.colour);
    for (const enemy of this.spawns.living()) {
      if (!inSwing(swing, enemy.body.center, enemy.radius)) continue;
      if (enemy.hurt(rollDamage(weapon, this.rng), this.player)) {
        this.onKill(enemy);
        enemy.die();
      }
    }
  }

  /** A fading wedge in the swing direction. */
  private drawSlash({ origin, angle, reach, arc }: Swing, colour: number): void {
    const half = Phaser.Math.DegToRad(arc);
    const g = this.scene.add.graphics().setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
    g.fillStyle(colour, 0.18)
      .slice(origin.x, origin.y, reach, angle - half, angle + half)
      .fillPath();
    g.lineStyle(3, colour, 0.9).beginPath();
    g.arc(origin.x, origin.y, reach - 3, angle - half, angle + half).strokePath();
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: SLASH_MS,
      onComplete: () => g.destroy(),
    });
  }
}
