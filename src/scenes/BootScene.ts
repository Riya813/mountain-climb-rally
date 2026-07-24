import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';

/** Generates all art at boot — no external assets. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create(): void {
    const g = this.add.graphics();

    // default sky for menus (levels generate their own themed gradients)
    g.fillGradientStyle(0x6ec9f5, 0x6ec9f5, 0xeafbd8, 0xeafbd8, 1);
    g.fillRect(0, 0, 64, GAME_HEIGHT);
    g.generateTexture('sky', 64, GAME_HEIGHT);

    // ---- rally truck (side view, facing right) --------------------------
    g.clear();
    // fender arches (dark, behind wheels)
    g.fillStyle(0x1f2830, 1);
    g.fillCircle(26, 40, 17);
    g.fillCircle(86, 40, 17);
    // lower chassis / skid plate
    g.fillStyle(0x2b333c, 1);
    g.fillRoundedRect(6, 34, 100, 12, 4);
    // bed + body (two-tone)
    g.fillStyle(0xd94f1e, 1);
    g.fillRoundedRect(2, 22, 104, 16, 5);
    g.fillStyle(PALETTE.primary, 1);
    g.fillRoundedRect(2, 14, 104, 14, 5);
    // cab
    g.fillStyle(PALETTE.primary, 1);
    g.fillRoundedRect(60, 0, 42, 22, { tl: 12, tr: 10, bl: 0, br: 0 });
    g.fillStyle(0xd94f1e, 1);
    g.fillRect(60, 16, 42, 6);
    // window + pillar + driver helmet
    g.fillStyle(0x9fd8f0, 1);
    g.fillRoundedRect(66, 4, 30, 13, 4);
    g.fillStyle(PALETTE.primary, 1);
    g.fillRect(80, 4, 4, 13);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(73, 11, 4.5);
    g.fillStyle(0x16324f, 1);
    g.fillRect(73, 9, 5, 4); // visor
    g.fillStyle(0xffffff, 0.45);
    g.fillTriangle(86, 17, 94, 5, 90, 17); // glass glint
    // roof light bar
    g.fillStyle(0x2b333c, 1);
    g.fillRect(64, -2, 26, 4);
    g.fillStyle(PALETTE.accent, 1);
    for (let i = 0; i < 4; i++) g.fillRect(66 + i * 6, -1, 3, 2);
    // racing stripes on the bed
    g.fillStyle(0xffffff, 0.85);
    g.fillRect(14, 14, 7, 24);
    g.fillRect(26, 14, 4, 24);
    // exhaust stack behind cab
    g.fillStyle(0x39444e, 1);
    g.fillRect(56, 2, 6, 20);
    g.fillStyle(0xaab7c0, 1);
    g.fillRect(55, 0, 8, 4);
    // front bull bar + headlight, rear brake light
    g.fillStyle(0x8a949c, 1);
    g.fillRoundedRect(102, 18, 5, 22, 2);
    g.fillStyle(PALETTE.accent, 1);
    g.fillRect(100, 22, 6, 7);
    g.fillStyle(0xfffbe0, 1);
    g.fillRect(102, 23, 4, 5);
    g.fillStyle(0x8c1f2f, 1);
    g.fillRect(2, 22, 4, 8);
    // top highlight
    g.fillStyle(0xffffff, 0.3);
    g.fillRoundedRect(6, 15, 46, 4, 2);
    g.generateTexture('car', 108, 58);

    // ---- off-road wheel with tread ------------------------------------
    g.clear();
    g.fillStyle(0x1c242b, 1);
    g.fillCircle(20, 20, 19);
    g.fillStyle(0x39444e, 1);
    for (let i = 0; i < 10; i++) {           // tread lugs
      const a = (i / 10) * Math.PI * 2;
      g.fillCircle(20 + Math.cos(a) * 17, 20 + Math.sin(a) * 17, 3);
    }
    g.fillStyle(0x2b333c, 1);
    g.fillCircle(20, 20, 12);
    g.fillStyle(0xb8c4cc, 1);                // rim
    g.fillCircle(20, 20, 10);
    g.fillStyle(0x6a7680, 1);                // spokes
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      g.fillCircle(20 + Math.cos(a) * 6, 20 + Math.sin(a) * 6, 2.4);
    }
    g.fillStyle(0xe8eef2, 1);
    g.fillCircle(20, 20, 3.4);
    g.generateTexture('wheel', 40, 40);

    // ---- light effects -------------------------------------------------
    g.clear();
    g.fillStyle(0xff3b30, 0.9);
    g.fillCircle(10, 10, 9);
    g.fillStyle(0xff8a80, 0.9);
    g.fillCircle(10, 10, 4.5);
    g.generateTexture('brakeglow', 20, 20);

    g.clear();
    for (let i = 0; i < 4; i++) {           // layered cone = soft beam
      g.fillStyle(0xfff3b0, 0.12);
      g.fillTriangle(0, 20, 150, 2 + i * 4, 150, 38 - i * 4);
    }
    g.generateTexture('lightcone', 150, 40);

    // ---- jerry can -----------------------------------------------------
    g.clear();
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(15, 34, 24, 5);
    g.fillStyle(0xd9302c, 1);
    g.fillRoundedRect(2, 7, 26, 26, 4);
    g.fillStyle(0xa8221f, 1);
    g.fillRoundedRect(2, 25, 26, 8, { tl: 0, tr: 0, bl: 4, br: 4 });
    g.lineStyle(3, 0xa8221f, 1);            // embossed X ribs
    g.lineBetween(6, 11, 24, 29);
    g.lineBetween(24, 11, 6, 29);
    g.fillStyle(0xd9302c, 1);
    g.fillRect(6, 2, 14, 6);                // top handles
    g.fillStyle(0xa8221f, 1);
    g.fillRect(9, 3, 3, 4);
    g.fillRect(15, 3, 3, 4);
    g.fillStyle(0xffd23f, 1);
    g.fillRect(22, 2, 6, 6);                // cap
    g.fillStyle(0xffffff, 0.25);
    g.fillRect(5, 9, 4, 18);
    g.generateTexture('fuel', 30, 38);

    // ---- finish flag (waving checkers) ---------------------------------
    g.clear();
    g.fillStyle(0x8a949c, 1);
    g.fillRect(2, 4, 5, 88);
    g.fillStyle(0xffd23f, 1);
    g.fillCircle(4.5, 4, 4);
    for (let c = 0; c < 6; c++) {
      const wave = Math.sin(c * 0.9) * 3;
      for (let r = 0; r < 3; r++) {
        g.fillStyle((r + c) % 2 === 0 ? 0x16324f : 0xffffff, 1);
        g.fillRect(7 + c * 8, 6 + r * 9 + wave, 8, 9);
      }
    }
    g.generateTexture('flag', 58, 94);

    // ---- fragile crate -------------------------------------------------
    g.clear();
    g.fillStyle(0xc99a6a, 1);
    g.fillRoundedRect(0, 0, 42, 30, 4);
    g.fillStyle(0xa9744f, 1);
    g.fillRect(0, 0, 42, 5);
    g.fillRect(0, 25, 42, 5);
    g.fillStyle(0xef476f, 0.85);            // FRAGILE band
    g.beginPath();
    g.moveTo(4, 30); g.lineTo(14, 0); g.lineTo(24, 0); g.lineTo(14, 30);
    g.closePath(); g.fillPath();
    g.lineStyle(2, 0x6b4226, 1);
    g.strokeRoundedRect(1, 1, 40, 28, 4);
    g.generateTexture('cargo', 42, 30);

    // ---- particles / celestial ----------------------------------------
    g.clear(); g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 6);
    g.generateTexture('dot', 12, 12);

    g.clear();
    g.fillStyle(0xffffff, 0.5); g.fillCircle(12, 12, 12);
    g.fillStyle(0xffffff, 0.7); g.fillCircle(12, 12, 7);
    g.generateTexture('puff', 24, 24);

    g.clear(); g.fillStyle(0xffffff, 1);
    this.drawStar(g, 22, 22, 5, 20, 9);
    g.generateTexture('star', 44, 44);

    g.clear();
    g.fillStyle(0xffffff, 0.14); g.fillCircle(40, 40, 40);
    g.fillStyle(0xffffff, 0.3); g.fillCircle(40, 40, 28);
    g.fillStyle(0xffffff, 1); g.fillCircle(40, 40, 20);
    g.generateTexture('sun', 80, 80);

    g.clear();
    g.fillStyle(0xf4f0dc, 1); g.fillCircle(24, 24, 20);
    g.fillStyle(0xd8d2b8, 1);
    g.fillCircle(17, 18, 5); g.fillCircle(30, 28, 4); g.fillCircle(26, 14, 2.5);
    g.generateTexture('moon', 48, 48);

    // ---- clouds (soft two-tone) ---------------------------------------
    g.clear();
    g.fillStyle(0xdde8f0, 1);
    g.fillEllipse(45, 38, 80, 30); g.fillEllipse(80, 34, 70, 32); g.fillEllipse(110, 40, 60, 24);
    g.fillStyle(0xffffff, 1);
    g.fillEllipse(45, 32, 76, 28); g.fillEllipse(80, 26, 66, 32); g.fillEllipse(110, 34, 56, 22);
    g.generateTexture('cloud', 150, 60);

    // ---- coin ----------------------------------------------------------
    g.clear();
    g.fillStyle(0xc9930a, 1);
    g.fillCircle(13, 14, 12);
    g.fillStyle(0xffd23f, 1);
    g.fillCircle(13, 12, 12);
    g.fillStyle(0xc9930a, 1);
    g.fillCircle(13, 12, 8);
    g.fillStyle(0xffd23f, 1);
    g.fillCircle(13, 12, 6);
    g.fillStyle(0xfff3b0, 1);
    g.fillCircle(9, 8, 3);
    g.generateTexture('coin', 26, 28);

    // ---- boost pad (chevrons on a plate) -------------------------------
    g.clear();
    g.fillStyle(0x0e5c3a, 1);
    g.fillRoundedRect(0, 6, 64, 16, 6);
    g.fillStyle(0x2ecc71, 1);
    g.fillRoundedRect(0, 2, 64, 16, 6);
    g.fillStyle(0xffffff, 0.95);
    for (let i = 0; i < 2; i++) {
      const ox = 12 + i * 22;
      g.fillTriangle(ox, 5, ox, 15, ox + 12, 10);
    }
    g.generateTexture('boost', 64, 24);

    // ---- checkpoint flag ----------------------------------------------
    g.clear();
    g.fillStyle(0x8a949c, 1);
    g.fillRect(2, 4, 4, 66);
    g.fillStyle(0x2ec4b6, 1);
    g.fillTriangle(6, 6, 6, 30, 40, 18);
    g.fillStyle(0xffffff, 0.4);
    g.fillTriangle(6, 6, 6, 14, 26, 13);
    g.generateTexture('checkpoint', 44, 72);

    // ---- hot air balloon ----------------------------------------------
    g.clear();
    g.fillStyle(0xe74c3c, 1);
    g.fillCircle(20, 18, 17);
    g.fillStyle(0xffd23f, 1);
    g.fillEllipse(20, 18, 12, 34);
    g.fillStyle(0xe74c3c, 1);
    g.fillEllipse(20, 18, 5, 34);
    g.lineStyle(1.5, 0x8a5a3b, 1);
    g.lineBetween(10, 30, 15, 42);
    g.lineBetween(30, 30, 25, 42);
    g.fillStyle(0x8a5a3b, 1);
    g.fillRoundedRect(13, 42, 14, 10, 3);
    g.generateTexture('balloon', 40, 54);

    // ---- bird ----------------------------------------------------------
    g.clear();
    g.lineStyle(2.5, 0x2b333c, 1);
    g.beginPath();
    g.arc(7, 8, 6, Math.PI, Math.PI * 1.85);
    g.strokePath();
    g.beginPath();
    g.arc(17, 8, 6, Math.PI * 1.15, Math.PI * 2);
    g.strokePath();
    g.generateTexture('bird', 24, 12);

    // ---- aurora ribbon (tinted at runtime) -----------------------------
    g.clear();
    for (let band = 0; band < 3; band++) {
      g.fillStyle(0xffffff, 0.12 - band * 0.03);
      const pts: Phaser.Math.Vector2[] = [];
      for (let x = 0; x <= 400; x += 20) pts.push(new Phaser.Math.Vector2(x, 40 + Math.sin(x / 55) * 22 - band * 8));
      for (let x = 400; x >= 0; x -= 20) pts.push(new Phaser.Math.Vector2(x, 82 + Math.sin(x / 55) * 22 + band * 8));
      g.fillPoints(pts, true);
    }
    g.generateTexture('aurora', 400, 130);

    // ---- ridges: white silhouettes, tinted per level theme -------------
    this.makeRidge('ridge-far', 300, 7);
    this.makeRidge('ridge-mid', 220, 11);

    g.destroy();
    this.scene.start('Menu');
  }

  private drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, points: number, outer: number, inner: number) {
    const path: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      path.push(new Phaser.Math.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
    g.fillPoints(path, true);
  }

  private makeRidge(key: string, height: number, seed: number) {
    const w = GAME_WIDTH;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    const pts: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(0, height)];
    let x = 0;
    let s = seed;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    let y = height * (0.4 + rnd() * 0.3);
    while (x < w) {
      pts.push(new Phaser.Math.Vector2(x, y));
      x += 60 + rnd() * 120;
      y = height * (0.15 + rnd() * 0.6);
    }
    pts.push(new Phaser.Math.Vector2(w, height * 0.5));
    pts.push(new Phaser.Math.Vector2(w, height));
    g.fillPoints(pts, true);
    g.generateTexture(key, w, height);
    g.destroy();
  }
}
