import Phaser from 'phaser';
import { SCENES, TEXTURES, TILESET, TILE_SIZE } from '../config';
import { PLAYER_EVENTS, Player } from '../entities/Player';
import { toWorld } from '../logic/coords';
import { TILE, generateFloor, isFloor, tileAt, type Floor, type Point } from '../logic/dungeon';
import { seededRng } from '../logic/random';
import { NO_POSITION, type SaveState } from '../logic/save';
import { planSpawns } from '../logic/spawns';
import { getWeapon } from '../logic/weapons';
import { CombatSystem } from '../systems/CombatSystem';
import { FloorSystem } from '../systems/FloorSystem';
import { LightingSystem, lightUp } from '../systems/LightingSystem';
import { PickupSystem } from '../systems/PickupSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import type { GameOverData } from './GameOverScene';
import type { HudSceneData } from './HudScene';

export interface GameSceneData {
  save: SaveState;
}

const ZOOM = 1.5;
const FADE_MS = 400;
const DEATH_FADE_MS = 900;

/** Builds the current floor from the save, spawns the player and monsters, and wires the systems. */
export class GameScene extends Phaser.Scene {
  private state!: SaveState;
  private floor!: Floor;
  private player!: Player;

  constructor() {
    super(SCENES.game);
  }

  init(data: GameSceneData): void {
    this.state = { ...data.save };
  }

  create(): void {
    const { seed, level, hp, maxHp, weaponId } = this.state;
    this.floor = generateFloor(seed, level);
    const { width, height, entrance, exit } = this.floor;
    const worldW = width * TILE_SIZE;
    const worldH = height * TILE_SIZE;
    // Seeded per floor, so a resumed floor gets the same monsters and chests.
    const rng = seededRng(seed * 31 + level);

    const lighting = new LightingSystem(this);
    const layer = lightUp(this.buildTilemap());
    lightUp(this.add.image(...toWorld(entrance), TEXTURES.stairsUp));
    const stairsDown = lightUp(this.physics.add.staticImage(...toWorld(exit), TEXTURES.stairsDown));
    stairsDown.body.setSize(TILE_SIZE / 2, TILE_SIZE / 2);
    lighting.glow(...toWorld(exit));

    const weapon = getWeapon(weaponId);
    this.player = new Player(this, ...toWorld(this.spawnTile()), { hp, maxHp, weapon });
    lighting.carryTorch(this.player);
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, layer);

    const plan = planSpawns(this.floor, level, rng);
    const spawns = new SpawnSystem(this, this.floor, level, this.player);
    spawns.spawnAll(plan.enemies);
    const pickups = new PickupSystem(this, this.player, plan.chests, level, rng);
    new CombatSystem(this, this.player, spawns, layer, rng, (enemy) => pickups.dropFor(enemy));
    new FloorSystem(this, this.player, stairsDown, () => this.snapshot());
    this.player.once(PLAYER_EVENTS.died, () => this.die());

    const camera = this.cameras.main;
    camera.setBounds(0, 0, worldW, worldH).setZoom(ZOOM).startFollow(this.player, true, 0.15, 0.15);
    camera.fadeIn(FADE_MS, 0, 0, 0);

    const hud: HudSceneData = { level, hp, maxHp, weaponName: weapon.name };
    this.scene.launch(SCENES.hud, hud);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop(SCENES.hud));
  }

  /** Current run state, for saving. */
  snapshot(): SaveState {
    const x = Math.floor(this.player.x / TILE_SIZE);
    const y = Math.floor(this.player.y / TILE_SIZE);
    return { ...this.state, x, y, hp: this.player.hp, weaponId: this.player.weapon.id };
  }

  private die(): void {
    const camera = this.cameras.main;
    this.physics.pause();
    camera.shake(250, 0.01);
    camera.fadeOut(DEATH_FADE_MS, 40, 0, 0);
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENES.gameOver, { outcome: 'death' } satisfies GameOverData);
    });
  }

  /** Saved tile if it is still walkable (it should be: same seed, same floor), else the entrance. */
  private spawnTile(): Point {
    const { x, y } = this.state;
    if (x !== NO_POSITION && isFloor(this.floor, x, y)) return { x, y };
    return this.floor.entrance;
  }

  private buildTilemap(): Phaser.Tilemaps.TilemapLayer {
    const data = this.floor.grid.map((row, y) => row.map((_, x) => tileIndex(this.floor, x, y)));
    const map = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage(TEXTURES.tiles, TEXTURES.tiles, TILE_SIZE, TILE_SIZE);
    const layer = tileset && map.createLayer(0, tileset, 0, 0);
    if (!layer) throw new Error('Failed to build the floor tilemap');
    layer.setCollision(TILESET.wall);
    return layer;
  }
}

/**
 * Tileset frame for a grid cell. Only walls that touch a floor tile are drawn; solid rock
 * further in stays empty (black), which reads as a carved-out dungeon rather than a brick field.
 */
function tileIndex(floor: Floor, x: number, y: number): number {
  if (tileAt(floor, x, y) === TILE.floor) return Phaser.Math.RND.pick([...TILESET.floors]);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (isFloor(floor, x + dx, y + dy)) return TILESET.wall;
    }
  }
  return -1;
}
