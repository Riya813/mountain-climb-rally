import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, LEVELS, LevelDef, PALETTE, ThemeDef } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../systems/InputManager';
import { SaveManager } from '../systems/SaveManager';
import { generateTerrain, TerrainData } from '../systems/TerrainGenerator';

const WHEEL_R = 17;
const MAX_SPIN = 0.5;
const KILL_MARGIN = 500;
const HOUSE_COLORS = [0xff8a65, 0xffd54f, 0x4fc3f7, 0xaed581, 0xf48fb1, 0x9575cd];

export class GameScene extends Phaser.Scene {
  private def!: LevelDef;
  private theme!: ThemeDef;
  private terrain!: TerrainData;
  private inputMgr!: InputManager;
  private audio = AudioManager.instance;

  private chassis!: Phaser.Physics.Matter.Image;
  private wheelL!: Phaser.Physics.Matter.Image;
  private wheelR!: Phaser.Physics.Matter.Image;
  private cargoSprite: Phaser.GameObjects.Image | null = null;
  private brakeLight!: Phaser.GameObjects.Image;
  private headlight!: Phaser.GameObjects.Image;

  private groundContacts = 0;
  private airborne = false;
  private airTime = 0;
  private airRotation = 0;
  private maxAirTilt = 0;

  private fuel = 100;
  private fuelMax = 100;
  private cargoHp = 100;
  private elapsed = 0;
  private started = false;
  private over = false;
  private lowFuelStill = 0;
  private lastImpactAt = 0;

  private spawnX = 180;
  private startElapsed = 0;
  private cpTaken = false;

  private score = 0;
  private displayScore = 0;
  private maxX = 0;
  private combo = 0;
  private comboTimer = 0;

  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private fuelBar!: Phaser.GameObjects.Graphics;
  private cargoBar!: Phaser.GameObjects.Graphics;
  private progressCar!: Phaser.GameObjects.Image;
  private flashRect!: Phaser.GameObjects.Rectangle;

  private ridgeFar!: Phaser.GameObjects.TileSprite;
  private ridgeMid!: Phaser.GameObjects.TileSprite;
  private dust!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() { super('Game'); }

  init(data: { level?: number; fromCheckpoint?: boolean }): void {
    this.def = LEVELS[(data.level ?? 1) - 1];
    this.theme = this.def.theme;
    const cp = this.registry.get(`cp-${this.def.id}`) as { x: number; time: number; score: number } | undefined;
    if (data.fromCheckpoint && cp) {
      this.spawnX = cp.x;
      this.startElapsed = cp.time;
      this.cpTaken = true;
    } else {
      this.spawnX = 180;
      this.startElapsed = 0;
      this.cpTaken = false;
    }
  }

  create(): void {
    this.groundContacts = 0; this.airborne = false; this.airTime = 0;
    this.airRotation = 0; this.maxAirTilt = 0; this.elapsed = 0;
    this.started = false; this.over = false; this.lowFuelStill = 0;
    this.score = 0; this.displayScore = 0; this.maxX = 0;
    this.combo = 0; this.comboTimer = 0; this.lastImpactAt = 0;
    this.fuel = this.def.fuelStart; this.fuelMax = this.def.fuelStart;
    this.cargoHp = 100; this.cargoSprite = null;
    this.elapsed = this.startElapsed;
    if (this.cpTaken) {
      const cp = this.registry.get(`cp-${this.def.id}`) as { score: number };
      this.score = cp.score; this.displayScore = cp.score;
    }

    this.inputMgr = new InputManager(this);
    this.terrain = generateTerrain(this.def);

    this.createBackground();
    this.createTerrainBodies();
    this.createCar(this.spawnX, this.terrain.heightAt(this.spawnX) - 90);
    this.maxX = this.spawnX;
    this.createPickupsAndFinish();
    this.createParticles();
    this.createHud();
    this.bindShortcuts();
    this.setupCollisions();

    const cam = this.cameras.main;
    // trend levels climb well above baseY, so open the top of the bounds
    cam.setBounds(0, -900 - this.def.trend, this.def.length, this.terrain.baseY + KILL_MARGIN + 1200 + this.def.trend);
    cam.startFollow(this.chassis, false, 0.09, 0.09);
    cam.fadeIn(250, 22, 50, 79);

    this.events.on('resume', () => {
      if (this.started && !this.over) this.audio.engineStart();
    });

    this.matter.world.pause();
    if (this.def.id === 1 && !SaveManager.data.tutorialSeen) this.showTutorial();
    else this.showGo();
    if (this.cpTaken) this.popup('FROM CHECKPOINT', this.spawnX, this.terrain.heightAt(this.spawnX) - 160, '#2ec4b6');

    this.events.on('shutdown', () => this.audio.engineStop());
  }

  // ------------------------------------------------------------------ setup

  private createBackground(): void {
    const t = this.theme;
    const skyKey = `sky-${this.def.id}`;
    if (!this.textures.exists(skyKey)) {
      const g = this.add.graphics();
      g.fillGradientStyle(t.skyTop, t.skyTop, t.skyBottom, t.skyBottom, 1);
      g.fillRect(0, 0, 64, GAME_HEIGHT);
      g.generateTexture(skyKey, 64, GAME_HEIGHT);
      g.destroy();
    }
    this.add.image(0, 0, skyKey).setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setScrollFactor(0).setDepth(-20);

    if (t.night) {
      for (let i = 0; i < 60; i++) {
        const s = this.add.image((i * 211) % GAME_WIDTH, (i * 137) % 420, 'dot')
          .setScale(0.12 + (i % 3) * 0.06).setScrollFactor(0.03).setDepth(-19).setAlpha(0.8);
        if (i % 4 === 0) this.tweens.add({ targets: s, alpha: 0.25, duration: 900 + i * 30, yoyo: true, repeat: -1 });
      }
      this.add.image(GAME_WIDTH - 200, 110, 'moon').setScrollFactor(0.05).setDepth(-19).setScale(1.3);
    } else {
      this.add.image(GAME_WIDTH - 220, 120, 'sun').setScrollFactor(0.06).setDepth(-19).setTint(t.sun).setScale(1.2);
    }

    this.ridgeFar = this.add.tileSprite(0, GAME_HEIGHT - 260, GAME_WIDTH, 300, 'ridge-far')
      .setOrigin(0).setScrollFactor(0).setDepth(-18).setTint(t.ridgeFar).setAlpha(0.8);
    this.ridgeMid = this.add.tileSprite(0, GAME_HEIGHT - 190, GAME_WIDTH, 220, 'ridge-mid')
      .setOrigin(0).setScrollFactor(0).setDepth(-16).setTint(t.ridgeMid).setAlpha(0.9);
    for (let i = 0; i < 8; i++) {
      this.add.image(200 + i * 900, 80 + (i * 53) % 140, 'cloud')
        .setScrollFactor(0.25).setDepth(-15).setAlpha(t.night ? 0.4 : 0.85)
        .setTint(t.cloud).setScale(0.7 + (i % 3) * 0.3);
    }
    this.addThemeProps();
  }

  /** Per-theme animated sky props so no two levels feel alike. */
  private addThemeProps(): void {
    const t = this.theme;
    const W = GAME_WIDTH, H = GAME_HEIGHT;

    // third distant ridge layer for depth (all levels)
    this.add.tileSprite(0, H - 330, W, 300, 'ridge-far')
      .setOrigin(0).setScrollFactor(0).setDepth(-19).setTint(t.ridgeFar).setAlpha(0.35);

    const birds = () => {
      for (let i = 0; i < 3; i++) {
        const b = this.add.image(-60 - i * 220, 120 + i * 55, 'bird')
          .setScrollFactor(0.2).setDepth(-14).setScale(0.9 + i * 0.2);
        this.tweens.add({ targets: b, x: W + 80, duration: 26000 + i * 6000, repeat: -1, delay: i * 4000 });
        this.tweens.add({ targets: b, y: b.y + 24, duration: 1600 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    };
    const balloon = (x: number, y: number, scale: number) => {
      const b = this.add.image(x, y, 'balloon').setScrollFactor(0.12).setDepth(-15).setScale(scale);
      this.tweens.add({ targets: b, y: y - 26, duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: b, x: x + 90, duration: 22000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    };
    const fallingParticles = (tint: number, speedY: [number, number], driftX: number, qty: number, scale: number) => {
      this.add.particles(0, -10, 'dot', {
        x: { min: 0, max: W },
        speedY: { min: speedY[0], max: speedY[1] },
        speedX: { min: -driftX, max: driftX },
        scale: { start: scale, end: scale * 0.5 },
        alpha: { start: 0.9, end: 0.3 },
        lifespan: 9000, quantity: 1, frequency: Math.floor(9000 / qty), tint,
      }).setScrollFactor(0).setDepth(-13);
    };

    switch (t.decor) {
      case 'houses': { // village: windmill + balloon + birds
        const wm = this.add.container(W * 0.72, H - 320).setScrollFactor(0.3).setDepth(-16);
        const tower = this.add.graphics();
        tower.fillStyle(0xd9c9a8, 1);
        tower.fillTriangle(-16, 90, 16, 90, 0, 0);
        tower.fillStyle(0xb5563b, 1);
        tower.fillCircle(0, 0, 7);
        wm.add(tower);
        const blades = this.add.container(0, 0);
        const bg2 = this.add.graphics();
        bg2.fillStyle(0xffffff, 0.95);
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          bg2.save();
          bg2.translateCanvas(0, 0);
          bg2.rotateCanvas(a);
          bg2.fillRect(-3, -52, 6, 52);
          bg2.restore();
        }
        blades.add(bg2);
        wm.add(blades);
        this.tweens.add({ targets: blades, rotation: Math.PI * 2, duration: 9000, repeat: -1 });
        balloon(W * 0.25, 150, 1.2);
        birds();
        break;
      }
      case 'pines': birds(); balloon(W * 0.6, 120, 1); break;
      case 'cacti': { // heat haze drifting across the desert
        for (let i = 0; i < 3; i++) {
          const hz = this.add.image(W * 0.3 * i, 240 + i * 90, 'puff')
            .setScrollFactor(0.12).setDepth(-14).setScale(9, 2.2).setAlpha(0.09).setTint(0xffe0b0);
          this.tweens.add({ targets: hz, x: hz.x + 320, duration: 17000 + i * 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        birds();
        break;
      }
      case 'mesas': balloon(W * 0.7, 130, 1.4); birds(); break;
      case 'rocks': birds(); break;
      case 'autumn': fallingParticles(0xd9822b, [26, 55], 40, 26, 0.34); birds(); break;
      case 'snow': fallingParticles(0xffffff, [30, 70], 24, 60, 0.3); break;
      case 'night': { // aurora + fireflies
        const a1 = this.add.image(W * 0.35, 130, 'aurora').setScrollFactor(0.04).setDepth(-19).setTint(0x54e8a0).setScale(2.4, 1.4).setAlpha(0.5);
        const a2 = this.add.image(W * 0.7, 180, 'aurora').setScrollFactor(0.05).setDepth(-19).setTint(0x9a6bff).setScale(2, 1.2).setAlpha(0.4);
        this.tweens.add({ targets: a1, alpha: 0.2, scaleY: 1.7, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.tweens.add({ targets: a2, alpha: 0.15, scaleY: 1.5, duration: 6800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        for (let i = 0; i < 9; i++) {
          const f = this.add.image((i * 149) % W, H - 140 - (i * 67) % 180, 'dot')
            .setScrollFactor(0.45).setDepth(-12).setScale(0.25).setTint(0xd8ff9a).setAlpha(0);
          this.tweens.add({ targets: f, alpha: 0.9, duration: 900 + i * 180, yoyo: true, repeat: -1, delay: i * 320 });
          this.tweens.add({ targets: f, x: f.x + 40, y: f.y - 26, duration: 4200 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
        break;
      }
    }
  }

  private createTerrainBodies(): void {
    const { points, step, baseY } = this.terrain;
    const t = this.theme;
    const bottom = baseY + KILL_MARGIN + 200;

    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      if (Number.isNaN(a) || Number.isNaN(b)) continue;
      const x1 = i * step, x2 = (i + 1) * step;
      const len = Math.hypot(x2 - x1, b - a);
      this.matter.add.rectangle((x1 + x2) / 2, (a + b) / 2 + 9, len + 2, 20, {
        isStatic: true, angle: Math.atan2(b - a, x2 - x1), friction: 1, frictionStatic: 2, label: 'ground',
      });
    }
    this.matter.add.rectangle(-20, baseY - 400, 40, 1600, { isStatic: true, label: 'ground' });

    const g = this.add.graphics().setDepth(-5);
    const drawSpan = (from: number, to: number) => {
      const poly: Phaser.Math.Vector2[] = [];
      for (let i = from; i <= to; i++) poly.push(new Phaser.Math.Vector2(i * step, points[i]));
      poly.push(new Phaser.Math.Vector2(to * step, bottom));
      poly.push(new Phaser.Math.Vector2(from * step, bottom));
      g.fillStyle(t.ground, 1);
      g.fillPoints(poly, true);
      g.fillStyle(t.groundDark, 0.4);
      g.fillPoints(poly.map(p => new Phaser.Math.Vector2(p.x, Math.min(p.y + 90, bottom))), true);
      // dirt speckles for texture
      g.fillStyle(t.groundDark, 0.5);
      for (let i = from; i <= to; i += 2) {
        const x = i * step + (i * 53) % 17;
        g.fillCircle(x, points[i] + 26 + (i * 37) % 48, 2.4);
        if (i % 5 === 0) g.fillCircle(x + 9, points[i] + 60 + (i * 91) % 70, 3);
      }
      // surface ribbon
      g.lineStyle(11, t.top, 1);
      g.beginPath();
      g.moveTo(from * step, points[from]);
      for (let i = from + 1; i <= to; i++) g.lineTo(i * step, points[i]);
      g.strokePath();
      g.lineStyle(4, t.topDark, 0.65);
      g.beginPath();
      g.moveTo(from * step, points[from] + 8);
      for (let i = from + 1; i <= to; i++) g.lineTo(i * step, points[i] + 8);
      g.strokePath();
    };

    let spanStart: number | null = null;
    for (let i = 0; i < points.length; i++) {
      const solid = !Number.isNaN(points[i]);
      if (solid && spanStart === null) spanStart = i;
      if ((!solid || i === points.length - 1) && spanStart !== null) {
        drawSpan(spanStart, solid ? i : i - 1);
        spanStart = null;
      }
    }
    this.drawDecor(g);
  }

  /** Theme-specific props, placed on flat-ish ground — each level reads differently. */
  private drawDecor(g: Phaser.GameObjects.Graphics): void {
    const { points, step } = this.terrain;
    const t = this.theme;
    for (let i = 12; i < points.length - 12; i += 7) {
      if (Number.isNaN(points[i]) || Number.isNaN(points[i - 1]) || Number.isNaN(points[i + 1])) continue;
      const hash = (i * 7919) % 10;
      if (hash > 4) continue;
      if (Math.abs(points[i + 1] - points[i - 1]) > 14) continue; // needs level footing
      const x = i * step, y = points[i] + 2;
      switch (t.decor) {
        case 'houses': {
          if (hash < 2) { // colourful village houses
            const c = HOUSE_COLORS[(i * 31) % HOUSE_COLORS.length];
            g.fillStyle(c, 1);
            g.fillRect(x - 17, y - 30, 34, 30);
            g.fillStyle(0x8d4a3a, 1);
            g.fillTriangle(x - 21, y - 30, x + 21, y - 30, x, y - 48);
            g.fillStyle(0xfff3b0, 1);
            g.fillRect(x - 10, y - 22, 8, 8);
            g.fillStyle(0x6b4226, 1);
            g.fillRect(x + 3, y - 16, 9, 16);
          } else this.tree(g, x, y, 0x2f7d4a, 0x58b368);
          break;
        }
        case 'pines': this.pine(g, x, y, 0x1e5f38, 0x2f7d4a, false); break;
        case 'cacti': {
          g.fillStyle(0x3d8b4f, 1);
          g.fillRoundedRect(x - 5, y - 38, 10, 38, 5);
          g.fillRoundedRect(x - 16, y - 28, 8, 14, 4);
          g.fillRect(x - 16, y - 16, 11, 6);
          g.fillRoundedRect(x + 8, y - 34, 8, 14, 4);
          g.fillRect(x + 5, y - 22, 11, 6);
          g.fillStyle(0x66bb6a, 0.6);
          g.fillRoundedRect(x - 5, y - 38, 4, 38, 2);
          break;
        }
        case 'mesas': {
          g.fillStyle(0x8c3f2a, 1);
          g.fillCircle(x - 6, y - 6, 8);
          g.fillCircle(x + 6, y - 5, 6);
          g.fillStyle(0xd98e5f, 0.7);
          g.fillCircle(x - 8, y - 9, 3);
          if (hash === 0) { // dead bush
            g.lineStyle(2, 0x6b4226, 1);
            for (let b = -2; b <= 2; b++) g.lineBetween(x + 20, y, x + 20 + b * 5, y - 14);
          }
          break;
        }
        case 'rocks': {
          g.fillStyle(0x5d6770, 1);
          g.fillCircle(x - 7, y - 8, 10);
          g.fillCircle(x + 7, y - 6, 8);
          g.fillStyle(0x8b97a3, 0.8);
          g.fillCircle(x - 9, y - 11, 4);
          break;
        }
        case 'autumn': this.tree(g, x, y, 0xc0392b, [0xd9822b, 0xe67e22, 0xc0392b][(i * 13) % 3]); break;
        case 'snow': this.pine(g, x, y, 0x1e5f38, 0x2f7d4a, true); break;
        case 'night': {
          g.fillStyle(0x2b3350, 1);
          g.fillCircle(x - 6, y - 7, 9);
          g.fillCircle(x + 6, y - 5, 7);
          g.fillStyle(0x7fe8ff, 0.9); // glowing crystals
          g.fillTriangle(x + 14, y, x + 18, y - 14, x + 22, y);
          g.fillStyle(0xb8f4ff, 0.5);
          g.fillCircle(x + 18, y - 8, 8);
          break;
        }
      }
    }
  }

  private tree(g: Phaser.GameObjects.Graphics, x: number, y: number, dark: number, light: number): void {
    g.fillStyle(0x6b4226, 1);
    g.fillRect(x - 4, y - 32, 8, 32);
    g.fillStyle(dark, 1);
    g.fillCircle(x, y - 44, 19);
    g.fillStyle(light, 1);
    g.fillCircle(x - 8, y - 38, 11);
    g.fillCircle(x + 7, y - 50, 9);
  }

  private pine(g: Phaser.GameObjects.Graphics, x: number, y: number, dark: number, light: number, snowCap: boolean): void {
    g.fillStyle(0x5c3a22, 1);
    g.fillRect(x - 3, y - 12, 6, 12);
    g.fillStyle(dark, 1);
    g.fillTriangle(x - 18, y - 10, x + 18, y - 10, x, y - 38);
    g.fillStyle(light, 1);
    g.fillTriangle(x - 13, y - 26, x + 13, y - 26, x, y - 52);
    if (snowCap) {
      g.fillStyle(0xffffff, 0.95);
      g.fillTriangle(x - 8, y - 40, x + 8, y - 40, x, y - 52);
      g.fillCircle(x - 10, y - 28, 4);
      g.fillCircle(x + 9, y - 27, 4);
    }
  }

  private createCar(x: number, y: number): void {
    this.chassis = this.matter.add.image(x, y, 'car');
    this.chassis.setBody({ type: 'rectangle', width: 96, height: 30 }, {
      label: 'chassis', chamfer: { radius: 8 }, density: 0.0022, friction: 0.6,
    });

    const mkWheel = (wx: number, label: string) => {
      const w = this.matter.add.image(x + wx, y + 26, 'wheel');
      w.setCircle(WHEEL_R, { label, friction: 1.1, frictionStatic: 3, density: 0.0035, restitution: 0.05 });
      return w;
    };
    this.wheelL = mkWheel(-32, 'wheelL');
    this.wheelR = mkWheel(32, 'wheelR');

    const cBody = this.chassis.body as MatterJS.BodyType;
    const attach = (wheel: Phaser.Physics.Matter.Image, ox: number) => {
      const wBody = wheel.body as MatterJS.BodyType;
      this.matter.add.constraint(cBody, wBody, 24, 0.22, { pointA: { x: ox, y: 8 }, damping: 0.12 });
      this.matter.add.constraint(cBody, wBody, 30, 0.32, { pointA: { x: ox + (ox < 0 ? 16 : -16), y: 8 }, damping: 0.1 });
    };
    attach(this.wheelL, -32);
    attach(this.wheelR, 32);

    if (this.def.cargo) this.cargoSprite = this.add.image(x, y - 26, 'cargo').setDepth(4);
    this.brakeLight = this.add.image(x, y, 'brakeglow').setDepth(7).setAlpha(0);
    this.headlight = this.add.image(x, y, 'lightcone').setOrigin(0, 0.5).setDepth(3)
      .setAlpha(this.theme.night ? 0.55 : 0);
    this.chassis.setDepth(5);
    this.wheelL.setDepth(6);
    this.wheelR.setDepth(6);
  }

  private createPickupsAndFinish(): void {
    for (let c = 0; c < this.def.fuelCans; c++) {
      const fx = this.def.length * (0.22 + (0.62 * (c + 0.5)) / this.def.fuelCans);
      let x = fx;
      while (this.terrain.isGap(x) && x < this.def.length - 300) x += 40;
      const y = this.terrain.heightAt(x) - 26;
      const img = this.add.image(x, y, 'fuel').setDepth(3);
      this.tweens.add({ targets: img, y: y - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const body = this.matter.add.circle(x, y, 24, { isStatic: true, isSensor: true, label: 'fuel' });
      (body as unknown as { gameObject: Phaser.GameObjects.Image }).gameObject = img;
    }

    // coins along the route
    const coinPos: { x: number; y: number }[] = [];
    for (let c = 0; c < this.def.coins; c++) {
      let x = this.def.length * (0.14 + (0.74 * c) / this.def.coins) + ((c * 97) % 60);
      while (this.terrain.isGap(x) && x < this.def.length - 300) x += 45;
      coinPos.push({ x, y: this.terrain.heightAt(x) - 34 });
    }
    // coin arcs over every gap — they mark the flight path
    const { points, step } = this.terrain;
    let gapStart = -1;
    for (let i = 0; i < points.length; i++) {
      if (Number.isNaN(points[i]) && gapStart < 0) gapStart = i;
      if (!Number.isNaN(points[i]) && gapStart >= 0) {
        const x0 = (gapStart - 1) * step, x1 = i * step;
        const yEdge = points[gapStart - 1];
        for (let k = 0; k <= 4; k++) {
          const t = k / 4;
          coinPos.push({ x: x0 + (x1 - x0) * t, y: yEdge - 40 - Math.sin(t * Math.PI) * 70 });
        }
        // every gap gets a boost pad on its run-up — hit it and commit
        // two pads: one mid-run-up, one right before the lip so the burst carries into the jump
        for (const bx of [x0 - 450, x0 - 160]) {
          if (this.terrain.isGap(bx)) continue;
          const by = this.terrain.heightAt(bx);
          this.add.image(bx, by - 8, 'boost').setDepth(2).setRotation(Math.atan(this.slopeAt(bx)));
          const bBody = this.matter.add.circle(bx, by - 14, 30, { isStatic: true, isSensor: true, label: 'boost' });
          (bBody as unknown as { armedAt: number }).armedAt = 0;
        }
        gapStart = -1;
      }
    }
    for (const p of coinPos) {
      const img = this.add.image(p.x, p.y, 'coin').setDepth(3);
      this.tweens.add({ targets: img, scaleX: 0.25, duration: 500 + (p.x % 200), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const body = this.matter.add.circle(p.x, p.y, 17, { isStatic: true, isSensor: true, label: 'coin' });
      (body as unknown as { gameObject: Phaser.GameObjects.Image }).gameObject = img;
    }

    // boost pads on level ground
    for (let b = 0; b < this.def.boosts; b++) {
      let x = this.def.length * (0.3 + (0.5 * b) / Math.max(1, this.def.boosts - 1 || 1));
      while ((this.terrain.isGap(x) || this.slopeAt(x) > 0.25) && x < this.def.length - 400) x += 60;
      const y = this.terrain.heightAt(x);
      this.add.image(x, y - 8, 'boost').setDepth(2).setRotation(Math.atan(this.slopeAt(x)));
      const body = this.matter.add.circle(x, y - 14, 30, { isStatic: true, isSensor: true, label: 'boost' });
      (body as unknown as { armedAt: number }).armedAt = 0;
    }

    // checkpoint flag at 55%
    if (this.def.checkpoint) {
      let x = this.def.length * 0.55;
      while (this.terrain.isGap(x)) x += 45;
      const y = this.terrain.heightAt(x);
      this.add.image(x, y - 36, 'checkpoint').setDepth(3).setAlpha(this.cpTaken ? 0.4 : 1);
      if (!this.cpTaken) {
        this.matter.add.rectangle(x, y - 50, 26, 130, { isStatic: true, isSensor: true, label: 'checkpoint' });
      }
    }

    let flagX = this.def.length - 160;
    while (this.terrain.isGap(flagX)) flagX -= 40;
    const flagY = this.terrain.heightAt(flagX);
    this.add.image(flagX, flagY - 46, 'flag').setDepth(3);
    this.matter.add.rectangle(flagX, flagY - 60, 30, 160, { isStatic: true, isSensor: true, label: 'flag' });
  }

  private slopeAngleAt(x: number): number | null {
    const a = this.terrain.heightAt(x - 30), b = this.terrain.heightAt(x + 30);
    if (Number.isNaN(a) || Number.isNaN(b)) return null;
    return Math.atan2(b - a, 60);
  }

  private slopeAt(x: number): number {
    const a = this.terrain.heightAt(x - 30), b = this.terrain.heightAt(x + 30);
    if (Number.isNaN(a) || Number.isNaN(b)) return 1;
    return Math.abs(b - a) / 60;
  }

  private createParticles(): void {
    this.dust = this.add.particles(0, 0, 'puff', {
      speed: { min: 20, max: 70 },
      angle: { min: 200, max: 340 },
      scale: { start: 0.7, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 500,
      tint: this.theme.dust,
      emitting: false,
    }).setDepth(2);
  }

  // -------------------------------------------------------------------- HUD

  /** Premium-style floating dark rounded cards. */
  private card(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    g.fillStyle(0x000000, 0.25);
    g.fillRoundedRect(x + 2, y + 3, w, h, 14);
    g.fillStyle(PALETTE.uiCard, 0.86);
    g.fillRoundedRect(x, y, w, h, 14);
    g.lineStyle(2, 0xffffff, 0.09);
    g.strokeRoundedRect(x, y, w, h, 14);
  }

  private createHud(): void {
    const s = <T extends Phaser.GameObjects.Text>(t: T): T => t.setScrollFactor(0).setDepth(100);
    const cards = this.add.graphics().setScrollFactor(0).setDepth(99);

    // level card
    this.card(cards, 14, 12, 244, 62);
    s(this.add.text(30, 20, `LEVEL ${this.def.id}`, {
      fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#9db4c8',
    }));
    s(this.add.text(30, 38, this.def.name.toUpperCase(), {
      fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ffffff',
    }));

    // timer card
    this.card(cards, GAME_WIDTH / 2 - 92, 12, 184, 62);
    this.timerText = s(this.add.text(GAME_WIDTH / 2, 18, '0.0', {
      fontFamily: FONT, fontSize: '32px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5, 0));
    s(this.add.text(GAME_WIDTH / 2, 52, `PAR ${this.def.parTime}s`, {
      fontFamily: FONT, fontSize: '13px', color: '#9db4c8',
    }).setOrigin(0.5, 0));

    // score card
    this.card(cards, GAME_WIDTH - 240, 12, 226, 62);
    this.scoreText = s(this.add.text(GAME_WIDTH - 32, 18, '0', {
      fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#ffd23f',
    }).setOrigin(1, 0));
    s(this.add.text(GAME_WIDTH - 32, 52, 'SCORE', {
      fontFamily: FONT, fontSize: '13px', color: '#9db4c8',
    }).setOrigin(1, 0));
    this.comboText = s(this.add.text(GAME_WIDTH - 32, 84, '', {
      fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#ef476f',
    }).setOrigin(1, 0).setStroke('#ffffff', 3));

    // fuel / cargo cards
    this.card(cards, 14, 84, 244, 38);
    s(this.add.text(26, 92, '⛽', { fontSize: '18px' }));
    this.fuelBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    if (this.def.cargo) {
      this.card(cards, 14, 128, 244, 38);
      s(this.add.text(26, 136, '📦', { fontSize: '18px' }));
      this.cargoBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    } else {
      this.cargoBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    }

    // progress card
    this.card(cards, GAME_WIDTH / 2 - 250, GAME_HEIGHT - 52, 500, 40);
    const track = this.add.graphics().setScrollFactor(0).setDepth(100);
    track.fillStyle(0xffffff, 0.15);
    track.fillRoundedRect(GAME_WIDTH / 2 - 225, GAME_HEIGHT - 36, 450, 8, 4);
    track.fillStyle(PALETTE.accent, 0.9);
    track.fillCircle(GAME_WIDTH / 2 + 225, GAME_HEIGHT - 32, 6);
    this.progressCar = this.add.image(GAME_WIDTH / 2 - 225, GAME_HEIGHT - 32, 'car')
      .setScale(0.26).setScrollFactor(0).setDepth(101);

    s(this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 68,
      '→ Gas   ← Brake   A/D Tilt   Esc Pause   R Restart   M Mute',
      { fontFamily: FONT, fontSize: '14px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5).setAlpha(0.7).setShadow(0, 2, 'rgba(0,0,0,0.5)', 3));

    this.flashRect = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0)
      .setOrigin(0).setScrollFactor(0).setDepth(150);
  }

  private bindShortcuts(): void {
    this.inputMgr.onKey('ESC', () => {
      if (this.over || !this.started) return;
      this.audio.engineStop();
      this.scene.pause();
      this.scene.launch('Pause', { level: this.def.id });
    });
    this.inputMgr.onKey('R', () => this.quickRestart());
    this.inputMgr.onKey('M', () => this.audio.toggleMute());
  }

  private quickRestart(): void {
    if (!this.over) {
      const key = `retries-${this.def.id}`;
      this.registry.set(key, (this.registry.get(key) ?? 0) + 1);
    }
    this.audio.engineStop();
    this.scene.stop('Pause');
    this.scene.restart({ level: this.def.id, fromCheckpoint: true });
  }

  // ------------------------------------------------------------ collisions

  private setupCollisions(): void {
    this.matter.world.on('collisionstart', (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
      for (const pair of event.pairs) this.onPairStart(pair.bodyA as MatterJS.BodyType, pair.bodyB as MatterJS.BodyType);
    });
    this.matter.world.on('collisionend', (event: Phaser.Physics.Matter.Events.CollisionEndEvent) => {
      for (const pair of event.pairs) {
        const labels = [pair.bodyA.label, pair.bodyB.label];
        if (labels.includes('ground') && (labels.includes('wheelL') || labels.includes('wheelR'))) {
          this.groundContacts = Math.max(0, this.groundContacts - 1);
        }
      }
    });
  }

  private onPairStart(a: MatterJS.BodyType, b: MatterJS.BodyType): void {
    const has = (l: string) => a.label === l || b.label === l;

    if (has('ground') && (has('wheelL') || has('wheelR'))) this.groundContacts++;

    if (has('fuel') && (has('chassis') || has('wheelL') || has('wheelR'))) {
      const fuelBody = a.label === 'fuel' ? a : b;
      const tagged = fuelBody as unknown as { collected?: boolean };
      if (!tagged.collected) {
        tagged.collected = true; // chassis + wheel can both hit the sensor in one tick
        this.collectFuel(fuelBody);
      }
    }

    if (has('coin') && (has('chassis') || has('wheelL') || has('wheelR'))) {
      const cBody = a.label === 'coin' ? a : b;
      const tagged = cBody as unknown as { collected?: boolean };
      if (!tagged.collected) { tagged.collected = true; this.collectCoin(cBody); }
    }

    if (has('boost') && (has('wheelL') || has('wheelR') || has('chassis'))) {
      this.hitBoost(a.label === 'boost' ? a : b);
    }

    if (has('checkpoint') && has('chassis')) {
      const cpBody = a.label === 'checkpoint' ? a : b;
      this.hitCheckpoint(cpBody);
    }

    if (has('flag') && has('chassis')) this.completeLevel();

    if (has('ground') && has('chassis') && !this.over && this.started) {
      const cBody = this.chassis.body as MatterJS.BodyType;
      const angle = Phaser.Math.Angle.Wrap(cBody.angle);
      const impact = cBody.speed;
      if (Math.abs(angle) > 2.2) {
        this.fail('FLIPPED OVER!');
        return;
      }
      if (impact > 7 && this.time.now - this.lastImpactAt > 250) {
        this.lastImpactAt = this.time.now;
        this.cameras.main.shake(140, 0.004 + Math.min(impact, 16) * 0.0006);
        this.audio.thud(impact * 0.4);
        if (this.def.cargo) this.damageCargo(impact * 2.2);
      }
    }
  }

  private collectFuel(body: MatterJS.BodyType): void {
    const img = (body as unknown as { gameObject?: Phaser.GameObjects.Image }).gameObject;
    this.matter.world.remove(body);
    if (img) {
      this.add.particles(img.x, img.y, 'dot', {
        speed: { min: 60, max: 160 }, scale: { start: 0.7, end: 0 },
        lifespan: 450, quantity: 14, tint: PALETTE.accent, emitting: false,
      }).setDepth(20).explode(14);
      this.tweens.add({ targets: img, scale: 1.6, alpha: 0, duration: 200, onComplete: () => img.destroy() });
    }
    this.fuel = Math.min(this.fuelMax, this.fuel + this.fuelMax * 0.45);
    this.audio.pickup();
    this.popup('+FUEL', this.chassis.x, this.chassis.y - 70, '#ffd23f');
  }

  private collectCoin(body: MatterJS.BodyType): void {
    const img = (body as unknown as { gameObject?: Phaser.GameObjects.Image }).gameObject;
    this.matter.world.remove(body);
    if (img) {
      this.add.particles(img.x, img.y, 'dot', {
        speed: { min: 40, max: 110 }, scale: { start: 0.5, end: 0 },
        lifespan: 350, quantity: 8, tint: 0xffd23f, emitting: false,
      }).setDepth(20).explode(8);
      this.tweens.add({ targets: img, y: img.y - 24, alpha: 0, scale: 1.4, duration: 180, onComplete: () => img.destroy() });
    }
    this.score += 15;
    this.audio.coin();
  }

  private hitBoost(body: MatterJS.BodyType): void {
    const tagged = body as unknown as { armedAt: number };
    if (this.time.now < tagged.armedAt) return;
    tagged.armedAt = this.time.now + 2000; // re-arms after 2s
    const cBody = this.chassis.body as MatterJS.BodyType;
    this.chassis.setVelocityX(Math.min(cBody.velocity.x + 7, 15));
    for (const w of [this.wheelL, this.wheelR]) w.setAngularVelocity(MAX_SPIN * 1.7);
    this.audio.boost();
    this.popup('BOOST!', this.chassis.x, this.chassis.y - 70, '#2ecc71');
    this.cameras.main.shake(100, 0.003);
    this.add.particles(this.chassis.x - 40, this.chassis.y + 10, 'dot', {
      speed: { min: 80, max: 200 }, angle: { min: 160, max: 200 },
      scale: { start: 0.7, end: 0 }, lifespan: 400, quantity: 12,
      tint: [0x2ecc71, 0xffffff], emitting: false,
    }).setDepth(20).explode(12);
  }

  private hitCheckpoint(body: MatterJS.BodyType): void {
    if (this.cpTaken) return;
    this.cpTaken = true;
    this.matter.world.remove(body);
    this.registry.set(`cp-${this.def.id}`, {
      x: this.chassis.x, time: this.elapsed, score: Math.round(this.score),
    });
    this.audio.checkpoint();
    this.popup('CHECKPOINT!', this.chassis.x, this.chassis.y - 80, '#2ec4b6', true);
  }

  private damageCargo(amount: number): void {
    this.cargoHp = Math.max(0, this.cargoHp - amount);
    this.flashRect.setFillStyle(PALETTE.danger, 1).setAlpha(0.22);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 220 });
    if (this.cargoSprite) {
      this.tweens.add({ targets: this.cargoSprite, alpha: 0.3, duration: 70, yoyo: true, repeat: 2 });
    }
    if (this.cargoHp <= 0) this.fail('CARGO DESTROYED!');
  }

  // ------------------------------------------------------------- game flow

  private showTutorial(): void {
    const cx = GAME_WIDTH / 2;
    const panel = this.add.container(cx, GAME_HEIGHT / 2).setScrollFactor(0).setDepth(200);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.uiCard, 0.94);
    g.fillRoundedRect(-330, -190, 660, 380, 24);
    g.lineStyle(4, PALETTE.secondary, 1);
    g.strokeRoundedRect(-330, -190, 660, 380, 24);
    panel.add(g);
    panel.add(this.add.text(0, -140, 'HOW TO DRIVE', {
      fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#ffd23f',
    }).setOrigin(0.5));
    const lines = [
      ['→  (or W/↑)', 'Gas — climb hills, build speed'],
      ['←  (or S/↓)', 'Brake / reverse'],
      ['A  /  D', 'Tilt in mid-air — land on your wheels!'],
      ['⛽', 'Watch the fuel bar, grab cans on the road'],
      ['🏁', 'Reach the flag. Beat par time for 3 stars'],
    ];
    lines.forEach((l, i) => {
      panel.add(this.add.text(-290, -80 + i * 44, l[0], {
        fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#2ec4b6',
      }));
      panel.add(this.add.text(-90, -80 + i * 44, l[1], {
        fontFamily: FONT, fontSize: '20px', color: '#ffffff',
      }));
    });
    const hint = this.add.text(0, 150, 'Press any key or click to start', {
      fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#ffd23f',
    }).setOrigin(0.5);
    panel.add(hint);
    this.tweens.add({ targets: hint, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    panel.setScale(0.7).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 300, ease: 'Back.easeOut' });

    const dismiss = () => {
      SaveManager.setTutorialSeen();
      this.input.keyboard?.off('keydown', dismiss);
      this.input.off('pointerdown', dismiss);
      this.tweens.add({
        targets: panel, scale: 0.8, alpha: 0, duration: 200,
        onComplete: () => { panel.destroy(); this.showGo(); },
      });
    };
    this.time.delayedCall(400, () => {
      this.input.keyboard?.once('keydown', dismiss);
      this.input.once('pointerdown', dismiss);
    });
  }

  private showGo(): void {
    const go = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'GO!', {
      fontFamily: FONT, fontSize: '110px', fontStyle: 'bold', color: '#ffd23f',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setStroke('#16324f', 12).setScale(0);
    this.audio.countGo();
    this.tweens.add({
      targets: go, scale: 1.2, duration: 260, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({
        targets: go, alpha: 0, scale: 1.6, duration: 300, delay: 240,
        onComplete: () => go.destroy(),
      }),
    });
    this.matter.world.resume();
    this.started = true;
    this.audio.engineStart();
  }

  private popup(msg: string, x: number, y: number, color: string, big = false): void {
    const t = this.add.text(x, y, msg, {
      fontFamily: FONT, fontSize: big ? '44px' : '28px', fontStyle: 'bold', color,
    }).setOrigin(0.5).setDepth(50).setStroke('#16324f', 6).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 900, delay: 250, ease: 'Sine.easeIn', onComplete: () => t.destroy() });
  }

  private addTrickScore(points: number, label: string): void {
    this.combo++;
    this.comboTimer = 4;
    const mult = 1 + (this.combo - 1) * 0.5;
    const gained = Math.round(points * mult);
    this.score += gained;
    this.audio.combo(this.combo);
    this.popup(`${label} +${gained}`, this.chassis.x, this.chassis.y - 90, '#ffffff', this.combo > 2);
    if (this.combo > 1) {
      this.comboText.setText(`COMBO x${mult.toFixed(1)}`);
      this.comboText.setScale(1.4);
      this.tweens.add({ targets: this.comboText, scale: 1, duration: 200, ease: 'Back.easeOut' });
    }
  }

  private fail(reason: string): void {
    if (this.over) return;
    this.over = true;
    this.audio.engineStop();
    this.audio.crash();
    this.cameras.main.shake(300, 0.012);
    this.flashRect.setFillStyle(0xffffff, 1).setAlpha(0.5);
    this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 350 });
    this.add.particles(this.chassis.x, this.chassis.y, 'dot', {
      speed: { min: 100, max: 300 }, scale: { start: 0.9, end: 0 },
      lifespan: 700, quantity: 24, tint: [PALETTE.danger, PALETTE.accent, 0xffffff], emitting: false,
    }).setDepth(20).explode(24);

    const key = `retries-${this.def.id}`;
    this.registry.set(key, (this.registry.get(key) ?? 0) + 1);

    this.time.delayedCall(650, () => {
      this.scene.pause();
      this.scene.launch('GameOver', {
        level: this.def.id, reason, score: this.score, time: this.elapsed,
        hasCheckpoint: !!this.registry.get(`cp-${this.def.id}`),
      });
    });
  }

  private completeLevel(): void {
    if (this.over) return;
    this.over = true;
    this.audio.engineStop();
    this.audio.win();
    this.score += Math.max(0, Math.round((this.def.parTime * 2 - this.elapsed) * 10));
    if (this.def.cargo) this.score += Math.round(this.cargoHp * 5);

    const retries = (this.registry.get(`retries-${this.def.id}`) as number) ?? 0;
    // 3★ beat par on first try, 2★ finished within 1.5x par, 1★ otherwise
    let stars: number;
    if (retries === 0 && this.elapsed <= this.def.parTime) stars = 3;
    else if (this.elapsed <= this.def.parTime * 1.5) stars = 2;
    else stars = 1;

    this.registry.set(`cp-${this.def.id}`, null);
    const { newBestTime } = SaveManager.recordResult(this.def.id, this.elapsed, this.score, stars);

    this.add.particles(this.chassis.x, this.chassis.y - 40, 'star', {
      speed: { min: 120, max: 280 }, scale: { start: 0.8, end: 0 }, rotate: { start: 0, end: 360 },
      lifespan: 1100, quantity: 20, tint: PALETTE.accent, emitting: false,
    }).setDepth(20).explode(20);
    this.cameras.main.flash(300, 255, 255, 255);

    this.time.delayedCall(900, () => {
      this.scene.pause();
      this.scene.launch('Victory', {
        level: this.def.id, time: this.elapsed, score: this.score, stars, newBestTime,
      });
    });
  }

  // ---------------------------------------------------------------- update

  update(_time: number, deltaMs: number): void {
    if (!this.started || this.over) return;
    const dt = deltaMs / 1000;
    this.elapsed += dt;

    const cBody = this.chassis.body as MatterJS.BodyType;
    const vx = cBody.velocity.x;
    const speed01 = Phaser.Math.Clamp(Math.abs(vx) / 14, 0, 1);
    const grounded = this.groundContacts > 0;

    const gas = this.inputMgr.gas && this.fuel > 0;
    const brake = this.inputMgr.brake;
    const chassisAngle = Phaser.Math.Angle.Wrap(cBody.angle);

    // Grounded stability assist: damp rotation and pull the chassis toward the
    // terrain slope — this is what stops full-throttle wheelie flips and makes
    // the game fair. Air control stays fully manual (that's the skill).
    if (grounded) {
      const slope = this.slopeAngleAt(this.chassis.x);
      if (slope !== null) {
        const err = Phaser.Math.Angle.Wrap(cBody.angle - slope);
        this.chassis.setAngularVelocity(cBody.angularVelocity * 0.82 - err * 0.022);
      } else {
        this.chassis.setAngularVelocity(cBody.angularVelocity * 0.9);
      }
    }

    // Wheelie protection: ease off drive torque once the nose lifts too far
    const wheelie = grounded && chassisAngle < -0.5;
    const target = gas ? MAX_SPIN * (wheelie ? 0.45 : 1 + speed01 * 0.15) : brake ? -MAX_SPIN * 0.55 : 0;
    for (const w of [this.wheelL, this.wheelR]) {
      const wb = w.body as MatterJS.BodyType;
      w.setAngularVelocity(Phaser.Math.Linear(wb.angularVelocity, target, gas || brake ? 0.28 : 0.06));
    }
    if (gas) this.fuel = Math.max(0, this.fuel - this.def.fuelDrain * dt);
    this.audio.engineUpdate(speed01, gas ? 1 : 0);

    if (!grounded) {
      if (!this.airborne) { this.airborne = true; this.airTime = 0; this.airRotation = 0; this.maxAirTilt = 0; }
      this.airTime += dt;
      this.airRotation += cBody.angularVelocity;
      this.maxAirTilt = Math.max(this.maxAirTilt, Math.abs(Phaser.Math.Angle.Wrap(cBody.angle)));
      const tilt = (this.inputMgr.tiltRight ? 1 : 0) - (this.inputMgr.tiltLeft ? 1 : 0);
      if (tilt !== 0) {
        this.chassis.setAngularVelocity(Phaser.Math.Clamp(cBody.angularVelocity + tilt * 0.007 * (deltaMs / 16.6), -0.18, 0.18));
      }
    } else if (this.airborne) {
      this.airborne = false;
      const upright = Math.abs(Phaser.Math.Angle.Wrap(cBody.angle)) < 0.9;
      const flips = Math.floor(Math.abs(this.airRotation) / (Math.PI * 1.7));
      if (upright) {
        if (flips > 0) this.addTrickScore(150 * flips, this.airRotation < 0 ? `BACKFLIP x${flips}` : `FRONTFLIP x${flips}`);
        else if (this.airTime > 0.55) this.addTrickScore(Math.round(this.airTime * 60), 'BIG AIR');
        if (flips === 0 && this.maxAirTilt > 1.55) {
          this.audio.nearMiss();
          this.popup('CLOSE CALL!', this.chassis.x, this.chassis.y - 60, '#ef476f');
          this.score += 25;
        }
      }
      if (this.airTime > 0.35) {
        this.dust.explode(10, this.chassis.x, this.chassis.y + 30);
        this.cameras.main.shake(90, 0.002 + this.airTime * 0.002);
      }
    }

    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.comboText.setText(''); }
    }

    if (grounded && Math.abs(vx) > 3 && gas) {
      this.dust.emitParticleAt(this.wheelL.x, this.wheelL.y + 10, 1);
    }

    if (this.chassis.x > this.maxX) {
      this.score += (this.chassis.x - this.maxX) * 0.04;
      this.maxX = this.chassis.x;
    }

    if (this.chassis.y > this.terrain.baseY + KILL_MARGIN) { this.fail('FELL INTO THE CHASM!'); return; }
    if (this.fuel <= 0 && grounded && Math.abs(vx) < 0.4) {
      this.lowFuelStill += dt;
      if (this.lowFuelStill > 1.6) { this.fail('OUT OF FUEL!'); return; }
    } else {
      this.lowFuelStill = 0;
    }

    // attached visuals follow the chassis
    const rot = this.chassis.rotation;
    if (this.cargoSprite) {
      const off = new Phaser.Math.Vector2(-18, -28).rotate(rot);
      this.cargoSprite.setPosition(this.chassis.x + off.x, this.chassis.y + off.y).setRotation(rot);
    }
    const rear = new Phaser.Math.Vector2(-52, -3).rotate(rot);
    this.brakeLight.setPosition(this.chassis.x + rear.x, this.chassis.y + rear.y)
      .setAlpha(brake ? 1 : 0.12);
    const front = new Phaser.Math.Vector2(52, -2).rotate(rot);
    this.headlight.setPosition(this.chassis.x + front.x, this.chassis.y + front.y).setRotation(rot);

    const cam = this.cameras.main;
    cam.setFollowOffset(Phaser.Math.Clamp(-vx * 16, -240, 120), 60);
    this.ridgeFar.tilePositionX = cam.scrollX * 0.12;
    this.ridgeMid.tilePositionX = cam.scrollX * 0.3;

    this.updateHud();
  }

  private updateHud(): void {
    this.timerText.setText(this.elapsed.toFixed(1));
    this.timerText.setColor(this.elapsed > this.def.parTime ? '#ef476f' : '#ffffff');

    this.displayScore = Phaser.Math.Linear(this.displayScore, this.score, 0.15);
    this.scoreText.setText(String(Math.round(this.displayScore)));

    const fuelFrac = this.fuel / this.fuelMax;
    this.fuelBar.clear();
    this.fuelBar.fillStyle(0xffffff, 0.12);
    this.fuelBar.fillRoundedRect(54, 92, 190, 16, 8);
    this.fuelBar.fillStyle(fuelFrac < 0.25 ? PALETTE.danger : PALETTE.accent, 1);
    if (fuelFrac > 0.02) this.fuelBar.fillRoundedRect(56, 94, 186 * fuelFrac, 12, 6);

    if (this.def.cargo) {
      this.cargoBar.clear();
      this.cargoBar.fillStyle(0xffffff, 0.12);
      this.cargoBar.fillRoundedRect(54, 136, 190, 16, 8);
      this.cargoBar.fillStyle(this.cargoHp < 35 ? PALETTE.danger : PALETTE.secondary, 1);
      if (this.cargoHp > 2) this.cargoBar.fillRoundedRect(56, 138, 186 * (this.cargoHp / 100), 12, 6);
    }

    const prog = Phaser.Math.Clamp(this.chassis.x / (this.def.length - 160), 0, 1);
    this.progressCar.setX(GAME_WIDTH / 2 - 225 + prog * 450);
  }
}
