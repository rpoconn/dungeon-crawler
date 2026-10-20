import Phaser from 'phaser';
import { SCENES, TEXTURES, TILESET, TILE_SIZE } from '../config';
import { Player } from '../entities/Player';
import { TILE, generateFloor, isFloor, tileAt, type Floor, type Point } from '../logic/dungeon';
import { NO_POSITION, type SaveState } from '../logic/save';
import { FloorSystem } from '../systems/FloorSystem';
import type { HudSceneData } from './HudScene';

export interface GameSceneData {
  save: SaveState;
}

const ZOOM = 1.5;
const FADE_MS = 400;
const LIGHT_PIPELINE = 'Light2D';
const AMBIENT = 0x2e2833;
const TORCH = { radius: 300, colour: 0xffb070, intensity: 1.6 } as const;
const EXIT_GLOW = { radius: 110, colour: 0xc9a55c, intensity: 1.2 } as const;

/** Builds the current floor from the save, spawns the player and wires floor transitions. */
export class GameScene extends Phaser.Scene {
  private state!: SaveState;
  private floor!: Floor;
  private player!: Player;
  private torch: Phaser.GameObjects.Light | null = null;

  constructor() {
    super(SCENES.game);
  }

  init(data: GameSceneData): void {
    this.state = { ...data.save };
  }

  create(): void {
    this.floor = generateFloor(this.state.seed, this.state.level);
    const { width, height, entrance, exit } = this.floor;
    const worldW = width * TILE_SIZE;
    const worldH = height * TILE_SIZE;

    const layer = this.buildTilemap();
    const stairsUp = this.add.image(...toWorld(entrance), TEXTURES.stairsUp);
    const stairsDown = this.physics.add.staticImage(...toWorld(exit), TEXTURES.stairsDown);
    stairsDown.body.setSize(TILE_SIZE / 2, TILE_SIZE / 2);

    this.player = new Player(this, ...toWorld(this.spawnTile()));
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.physics.add.collider(this.player, layer);
    new FloorSystem(this, this.player, stairsDown, () => this.snapshot());

    const camera = this.cameras.main;
    camera.setBounds(0, 0, worldW, worldH).setZoom(ZOOM).startFollow(this.player, true, 0.15, 0.15);
    camera.fadeIn(FADE_MS, 0, 0, 0);
    this.addLighting([layer, stairsUp, stairsDown, this.player]);

    this.scene.launch(SCENES.hud, { level: this.state.level } satisfies HudSceneData);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scene.stop(SCENES.hud));
  }

  update(): void {
    this.torch?.setPosition(this.player.x, this.player.y);
  }

  /** Current run state, for saving. */
  snapshot(): SaveState {
    const x = Math.floor(this.player.x / TILE_SIZE);
    const y = Math.floor(this.player.y / TILE_SIZE);
    return { ...this.state, x, y };
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

  /** Torch-lit darkness plus a vignette. WebGL only; the canvas renderer just draws fully lit. */
  private addLighting(lit: Phaser.GameObjects.Components.Pipeline[]): void {
    if (this.game.renderer.type !== Phaser.WEBGL) return;

    this.lights.enable().setAmbientColor(AMBIENT);
    for (const obj of lit) obj.setPipeline(LIGHT_PIPELINE);
    this.torch = this.lights.addLight(
      this.player.x,
      this.player.y,
      TORCH.radius,
      TORCH.colour,
      TORCH.intensity,
    );
    const exit = toWorld(this.floor.exit);
    this.lights.addLight(...exit, EXIT_GLOW.radius, EXIT_GLOW.colour, EXIT_GLOW.intensity);
    this.cameras.main.postFX.addVignette(0.5, 0.5, 0.8, 0.45);
  }
}

function toWorld(tile: Point): [number, number] {
  return [tile.x * TILE_SIZE + TILE_SIZE / 2, tile.y * TILE_SIZE + TILE_SIZE / 2];
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
