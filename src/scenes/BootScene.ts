import Phaser from 'phaser';
import {
    SCENES,
    TEXTURES,
    TILESET,
    TILE_SIZE,
    animKey,
    enemyTexture,
    type Motion,
} from '../config';
import { ENEMY_KINDS } from '../logic/enemies';
import {
    ENEMY_STRIPS,
    FRAMES_PER_ANIM,
    ITEM_FRAMES,
    PLAYER_STRIP,
    SHEET,
    SHEET_TILE,
    TILE_FRAMES,
    opaqueBounds,
    type CreatureStrip,
    type Rect,
} from './tileset';

const T = TILE_SIZE;
/** Sheet pixels to world pixels for tiles and items. */
const SCALE = T / SHEET_TILE;
const ANIM_FPS: Readonly<Record<Motion, number>> = { idle: 6, run: 10 };
/** Gap under a creature's feet, so its shadow shows below it. */
const FEET = 2;
/** Fill behind wall tops, whose sheet tile is mostly transparent. */
const WALL_TOP_FILL = '#1b1720';

type Painter = (g: Phaser.GameObjects.Graphics) => void;
type Drawer = (ctx: CanvasRenderingContext2D) => void;

/**
 * Cuts every texture out of the 0x72 sheet at 2x (32px tiles, with each creature fitted into a
 * 32px frame), registers the creature animations, then hands off to the login screen. Bolts,
 * sparks and wall flames have no counterpart in the pack and are still drawn procedurally.
 */
export class BootScene extends Phaser.Scene {
    private sheet!: HTMLImageElement;
    /** The sheet's raw pixels, for trimming creature frames. */
    private pixels!: ImageData;

    constructor() {
        super(SCENES.boot);
    }

    preload(): void {
        this.load.image(SHEET.key, SHEET.url);
    }

    create(): void {
        const source = this.textures.get(SHEET.key).getSourceImage();
        if (!(source instanceof HTMLImageElement)) throw new Error('Tileset sheet failed to load');
        this.sheet = source;
        this.pixels = readPixels(source);

        const tiles: Rect[] = [TILE_FRAMES.wallFace, TILE_FRAMES.wallTop, ...TILE_FRAMES.floors];
        this.draw(TEXTURES.tiles, T * tiles.length, T, (ctx) => {
            ctx.fillStyle = WALL_TOP_FILL;
            ctx.fillRect(TILESET.wallTop * T, 0, T, T);
            tiles.forEach((rect, i) => this.blit(ctx, rect, i * T, 0));
        });
        this.stairs(TEXTURES.stairsDown, TILE_FRAMES.stairsDown);
        this.stairs(TEXTURES.stairsUp, TILE_FRAMES.stairsUp);
        this.item(TEXTURES.chest, ITEM_FRAMES.chest);
        this.item(TEXTURES.chestOpen, ITEM_FRAMES.chestOpen);
        this.item(TEXTURES.potion, ITEM_FRAMES.potion);
        this.creature(TEXTURES.player, PLAYER_STRIP);
        for (const kind of ENEMY_KINDS) this.creature(enemyTexture(kind), ENEMY_STRIPS[kind]);

        this.paint(TEXTURES.bolt, 12, 12, paintBolt);
        this.paint(TEXTURES.spark, 4, 4, (g) => g.fillStyle(0xffffff).fillRect(0, 0, 4, 4));
        this.paint(TEXTURES.flame, 12, 20, paintFlame);

        this.scene.start(SCENES.auth);
    }

    /** Stairs sit on a plain floor tile so their transparent corners match the floor around them. */
    private stairs(key: string, rect: Rect): void {
        this.draw(key, T, T, (ctx) => {
            this.blit(ctx, TILE_FRAMES.floors[0], 0, 0);
            this.blit(ctx, rect, 0, 0);
        });
    }

    private item(key: string, rect: Rect): void {
        this.draw(key, T, T, (ctx) => this.blit(ctx, rect, 0, 0));
    }

    /**
     * One 32px frame per animation frame (idle, then run). Each creature is trimmed to its drawn
     * pixels, scaled up to fit (at most 2x, like the tiles) and stood on a soft shadow.
     */
    private creature(key: string, strip: CreatureStrip): void {
        const count = strip.hasRun ? FRAMES_PER_ANIM * 2 : FRAMES_PER_ANIM;
        const [x, y, w] = strip.first;
        const [bx, by, bw, bh] = opaqueBounds(this.pixels, strip, count);
        const scale = Math.min(SCALE, T / bw, (T - FEET) / bh);
        const left = Math.round((T - bw * scale) / 2);
        const top = Math.round(T - FEET - bh * scale);
        const texture = this.draw(key, T * count, T, (ctx) => {
            for (let i = 0; i < count; i++) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.beginPath();
                ctx.ellipse(i * T + T / 2, T - FEET - 1, 9, 3, 0, 0, Math.PI * 2);
                ctx.fill();
                this.blit(ctx, [x + i * w + bx, y + by, bw, bh], i * T + left, top, scale);
            }
        });
        for (let i = 0; i < count; i++) texture.add(i, 0, i * T, 0, T, T);
        this.animate(key, 'idle', 0);
        // Creatures without a run strip (the lich) loop their idle frames while moving too.
        this.animate(key, 'run', strip.hasRun ? FRAMES_PER_ANIM : 0);
    }

    private animate(key: string, motion: Motion, first: number): void {
        this.anims.create({
            key: animKey(key, motion),
            frames: Array.from({ length: FRAMES_PER_ANIM }, (_, i) => ({ key, frame: first + i })),
            frameRate: ANIM_FPS[motion],
            repeat: -1,
        });
    }

    /** Copies a sheet rect to (dx, dy) on `ctx`, scaled with hard pixel edges. */
    private blit(
        ctx: CanvasRenderingContext2D,
        rect: Rect,
        dx: number,
        dy: number,
        scale = SCALE,
    ): void {
        const [x, y, w, h] = rect;
        ctx.drawImage(this.sheet, x, y, w, h, dx, dy, w * scale, h * scale);
    }

    private draw(
        key: string,
        width: number,
        height: number,
        drawer: Drawer,
    ): Phaser.Textures.CanvasTexture {
        const texture = this.textures.createCanvas(key, width, height);
        if (!texture) throw new Error(`Failed to create texture ${key}`);
        texture.context.imageSmoothingEnabled = false;
        drawer(texture.context);
        texture.refresh();
        return texture;
    }

    private paint(key: string, width: number, height: number, painter: Painter): void {
        const g = this.add.graphics();
        painter(g);
        g.generateTexture(key, width, height);
        g.destroy();
    }
}

function readPixels(image: HTMLImageElement): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D canvas context');
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
}

/** White so each caster can tint its own bolts. */
function paintBolt(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0xffffff, 0.3).fillCircle(6, 6, 6);
    g.fillStyle(0xffffff, 1).fillCircle(6, 6, 3);
}

/** A wall sconce: iron bracket under a flame. Left unlit in-game so it glows in the dark. */
function paintFlame(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(0x3a3029).fillRect(4, 14, 4, 6); // bracket
    g.fillStyle(0xff5a1a, 0.9).fillEllipse(6, 9, 10, 14);
    g.fillStyle(0xffb040).fillEllipse(6, 10, 6, 9);
    g.fillStyle(0xfff0c0).fillEllipse(6, 11, 3, 4);
}
