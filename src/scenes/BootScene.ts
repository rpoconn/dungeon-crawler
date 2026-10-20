import Phaser from 'phaser';
import { SCENES, TEXTURES, TILESET, TILE_SIZE, enemyTexture } from '../config';
import { ENEMY_COLOURS, ENEMY_KINDS } from '../logic/enemies';

const T = TILE_SIZE;
const HALF = T / 2;

type Painter = (g: Phaser.GameObjects.Graphics) => void;

/** Generates every placeholder texture procedurally, then hands off to the login screen. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    this.paint(TEXTURES.tiles, T * (1 + TILESET.floors.length), T, (g) => {
      paintWall(g, TILESET.wall * T);
      for (const frame of TILESET.floors) paintFloor(g, frame * T);
    });
    this.paint(TEXTURES.stairsDown, T, T, (g) => paintStairs(g, false));
    this.paint(TEXTURES.stairsUp, T, T, (g) => paintStairs(g, true));
    this.paint(TEXTURES.player, T, T, paintPlayer);
    for (const kind of ENEMY_KINDS) {
      this.paint(enemyTexture(kind), T, T, (g) => paintEnemy(g, ENEMY_COLOURS[kind]));
    }
    this.paint(TEXTURES.chest, T, T, paintChest);
    this.paint(TEXTURES.potion, T, T, paintPotion);

    this.scene.start(SCENES.auth);
  }

  private paint(key: string, width: number, height: number, painter: Painter): void {
    const g = this.add.graphics();
    painter(g);
    g.generateTexture(key, width, height);
    g.destroy();
  }
}

function paintWall(g: Phaser.GameObjects.Graphics, ox: number): void {
  g.fillStyle(0x1c1715).fillRect(ox, 0, T, T);
  g.fillStyle(0x0c0a09);
  // Mortar: two brick courses, offset by half a brick.
  g.fillRect(ox, HALF - 1, T, 2).fillRect(ox, T - 2, T, 2);
  g.fillRect(ox + HALF - 1, 0, 2, HALF).fillRect(ox, HALF, 2, HALF);
  g.fillStyle(0x2c2420)
    .fillRect(ox, 0, T, 2)
    .fillRect(ox, HALF + 1, T, 1);
}

function paintFloor(g: Phaser.GameObjects.Graphics, ox: number): void {
  g.fillStyle(0x2a2420).fillRect(ox, 0, T, T);
  for (let i = 0; i < 14; i++) {
    const shade = Phaser.Math.RND.pick([0x221d1a, 0x322b26, 0x261f1b]);
    const size = Phaser.Math.RND.between(1, 3);
    g.fillStyle(shade).fillRect(
      ox + Phaser.Math.RND.between(0, T - size),
      Phaser.Math.RND.between(0, T - size),
      size,
      size,
    );
  }
  g.fillStyle(0x1d1916)
    .fillRect(ox, T - 1, T, 1)
    .fillRect(ox + T - 1, 0, 1, T);
}

function paintStairs(g: Phaser.GameObjects.Graphics, up: boolean): void {
  g.fillStyle(0x0a0808).fillRect(0, 0, T, T);
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    // Stairs down get darker as they descend; stairs up get lighter.
    const light = up ? 0x3a3029 + i * 0x080605 : 0x5a4a3c - i * 0x0c0a08;
    g.fillStyle(light).fillRect(3 + i, 3 + i * 5, T - 6 - i * 2, 4);
  }
  g.lineStyle(2, up ? 0x6b5b45 : 0xc9a55c).strokeRect(1, 1, T - 2, T - 2);
}

function paintPlayer(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x000000, 0.4).fillEllipse(HALF, T - 5, 18, 6);
  g.fillStyle(0x7a1f1f).fillTriangle(HALF - 9, 26, HALF + 9, 26, HALF, 10); // cloak
  g.fillStyle(0x9a9a9e).fillCircle(HALF, 15, 7); // armour
  g.fillStyle(0xd8b48a).fillCircle(HALF, 9, 4); // head
  g.lineStyle(1, 0x111111).strokeCircle(HALF, 15, 7);
}

function paintEnemy(g: Phaser.GameObjects.Graphics, colour: number): void {
  g.fillStyle(0x000000, 0.4).fillEllipse(HALF, T - 5, 18, 6);
  g.fillStyle(colour).fillCircle(HALF, 15, 9);
  g.lineStyle(1, 0x0a0a0a).strokeCircle(HALF, 15, 9);
  g.fillStyle(0xff3b1f)
    .fillRect(HALF - 5, 12, 3, 3)
    .fillRect(HALF + 2, 12, 3, 3);
}

function paintChest(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x5a3a1e).fillRect(5, 10, T - 10, 16);
  g.fillStyle(0x6e4826).fillRect(5, 8, T - 10, 6);
  g.fillStyle(0xc9a55c)
    .fillRect(5, 13, T - 10, 2)
    .fillRect(HALF - 2, 13, 4, 6);
  g.lineStyle(1, 0x1a0f08).strokeRect(5, 8, T - 10, 18);
}

function paintPotion(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(0x8a8070).fillRect(HALF - 2, 7, 4, 5); // neck
  g.fillStyle(0xb3121b).fillCircle(HALF, 18, 7);
  g.fillStyle(0xff6b6b, 0.7).fillCircle(HALF - 2, 16, 2); // glint
  g.lineStyle(1, 0x2a0a0a).strokeCircle(HALF, 18, 7);
}
