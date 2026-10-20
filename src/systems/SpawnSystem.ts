import Phaser from 'phaser';
import { Enemy, type EnemyWorld } from '../entities/Enemy';
import type { Player } from '../entities/Player';
import { Projectile } from '../entities/Projectile';
import { toTile, toWorld } from '../logic/coords';
import { distancesFrom, isFloor, type Floor, type Point } from '../logic/dungeon';
import { SUMMON, enemyStats, type EnemyKind } from '../logic/enemies';
import type { EnemySpawn } from '../logic/spawns';

/**
 * Owns the enemy and projectile groups and serves as the enemies' view of the world: the shared
 * path field to the player, firing bolts and summoning bats.
 */
export class SpawnSystem implements EnemyWorld {
    readonly enemies: Phaser.Physics.Arcade.Group;
    readonly projectiles: Phaser.Physics.Arcade.Group;
    private field: number[][] = [];
    private fieldKey = '';
    /** Enemies from the floor's spawn plan, by plan index. Summons are not in here. */
    private readonly planned = new Map<number, Enemy>();
    private slainBefore: readonly number[] = [];

    constructor(
        private readonly scene: Phaser.Scene,
        readonly floor: Floor,
        private readonly level: number,
        readonly player: Player,
    ) {
        this.enemies = scene.physics.add.group();
        this.projectiles = scene.physics.add.group();
    }

    /** Spawns the floor's planned enemies, minus those `slain` before the save was made. */
    spawnAll(spawns: readonly EnemySpawn[], slain: readonly number[]): void {
        this.slainBefore = slain;
        spawns.forEach(({ kind, tile }, i) => {
            if (!slain.includes(i)) this.planned.set(i, this.spawn(kind, tile));
        });
    }

    /** Plan indices of every planned enemy now dead, for the save. */
    slain(): number[] {
        const fresh = [...this.planned].filter(([, enemy]) => !enemy.alive).map(([i]) => i);
        return [...this.slainBefore, ...fresh].sort((a, b) => a - b);
    }

    spawn(kind: EnemyKind, tile: Point): Enemy {
        const enemy = new Enemy(this.scene, ...toWorld(tile), enemyStats(kind, this.level), this);
        this.enemies.add(enemy);
        return enemy;
    }

    /** Living enemies, for hit tests. */
    living(): Enemy[] {
        return this.enemies.getChildren().filter((c): c is Enemy => c instanceof Enemy && c.alive);
    }

    /** Recomputed only when the player steps onto a new tile; every enemy shares it. */
    pathField(): number[][] {
        const { x, y } = this.player.body.center;
        const tile = toTile(x, y);
        const key = `${tile.x},${tile.y}`;
        if (key !== this.fieldKey && isFloor(this.floor, tile.x, tile.y)) {
            this.field = distancesFrom(this.floor, tile);
            this.fieldKey = key;
        }
        return this.field;
    }

    shoot(from: Enemy, angle: number): void {
        const attack = from.stats.ranged;
        if (!attack) return;
        const bolt = new Projectile(
            this.scene,
            from.x,
            from.y,
            from.stats.damage,
            attack.projectileColour,
        );
        this.projectiles.add(bolt);
        bolt.launch(angle, attack.projectileSpeed);
    }

    /** Calls bats onto open tiles around the summoner, up to the live-summon cap. */
    summon(by: Enemy): void {
        const alive = this.living().filter((e) => e.summoned).length;
        const room = Math.min(SUMMON.batsPerHit, SUMMON.maxAlive - alive);
        const origin = toTile(by.x, by.y);
        const spots = Phaser.Utils.Array.Shuffle(this.openNeighbours(origin)).slice(0, room);
        for (const tile of spots) {
            const bat = this.spawn('bat', tile);
            bat.summoned = true;
            bat.setMode('hunt');
            bat.setAlpha(0);
            this.scene.tweens.add({ targets: bat, alpha: 1, duration: 250 });
        }
    }

    private openNeighbours(p: Point): Point[] {
        const out: Point[] = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if ((dx || dy) && isFloor(this.floor, p.x + dx, p.y + dy)) {
                    out.push({ x: p.x + dx, y: p.y + dy });
                }
            }
        }
        return out;
    }
}
