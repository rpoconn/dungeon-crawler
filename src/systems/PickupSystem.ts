import Phaser from 'phaser';
import { GAME_EVENTS } from '../config';
import { Chest } from '../entities/Chest';
import type { Enemy } from '../entities/Enemy';
import { HealthPickup } from '../entities/HealthPickup';
import type { Player } from '../entities/Player';
import { toWorld } from '../logic/coords';
import type { Point } from '../logic/dungeon';
import { HEALTH_DROP, rollChestWeapon, rollHealthDrop } from '../logic/loot';
import type { Rng } from '../logic/random';

/** How close (px, centre to centre) the player must be to open a chest. */
const INTERACT_RANGE = 40;

/** Chests (open with E for a weapon) and health potions (dropped by enemies, walked over to drink). */
export class PickupSystem {
    private readonly chests: Chest[];
    private readonly potions: Phaser.Physics.Arcade.StaticGroup;
    private readonly interactKey: Phaser.Input.Keyboard.Key | null;

    constructor(
        private readonly scene: Phaser.Scene,
        private readonly player: Player,
        chestTiles: readonly Point[],
        openedChests: readonly number[],
        private readonly level: number,
        private readonly rng: Rng,
    ) {
        this.chests = chestTiles.map((tile, i) => {
            const chest = new Chest(scene, ...toWorld(tile));
            if (openedChests.includes(i)) chest.open();
            return chest;
        });
        scene.physics.add.collider(player, this.chests);

        this.potions = scene.physics.add.staticGroup();
        scene.physics.add.overlap(player, this.potions, (_player, potion) => {
            if (potion instanceof HealthPickup && player.heal(potion.amount)) potion.destroy();
        });

        this.interactKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.E) ?? null;
        scene.events.on(Phaser.Scenes.Events.UPDATE, this.update, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
            scene.events.off(Phaser.Scenes.Events.UPDATE, this.update, this),
        );
    }

    /** Plan indices of the opened chests, for the save. */
    openedChests(): number[] {
        return this.chests.flatMap((chest, i) => (chest.opened ? [i] : []));
    }

    /** Maybe leave a potion where an enemy fell; likelier when the player is low. */
    dropFor(enemy: Enemy): void {
        if (rollHealthDrop(this.player.hp, this.player.maxHp, this.rng)) {
            this.dropPotion(enemy.x, enemy.y);
        }
    }

    private dropPotion(x: number, y: number): void {
        this.potions.add(new HealthPickup(this.scene, x, y, HEALTH_DROP.heal));
    }

    private update(): void {
        const near = this.nearestClosedChest();
        for (const chest of this.chests) chest.setPromptVisible(chest === near);
        if (near && this.interactKey && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
            this.open(near);
        }
    }

    private nearestClosedChest(): Chest | null {
        let best: Chest | null = null;
        let bestDist: number = INTERACT_RANGE;
        for (const chest of this.chests) {
            const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
            if (!chest.opened && d <= bestDist) {
                best = chest;
                bestDist = d;
            }
        }
        return best;
    }

    /** Equips the rolled weapon; if it is no upgrade, the chest holds a potion instead. */
    private open(chest: Chest): void {
        chest.open();
        const weapon = rollChestWeapon(this.player.weapon.id, this.level, this.rng);
        if (weapon.id !== this.player.weapon.id) {
            this.player.equip(weapon);
            this.notice(`You found a ${weapon.name}`);
        } else {
            this.dropPotion(chest.x, chest.y + 20);
            this.notice('Nothing better inside — just a potion');
        }
    }

    private notice(message: string): void {
        this.scene.events.emit(GAME_EVENTS.notice, message);
    }
}
