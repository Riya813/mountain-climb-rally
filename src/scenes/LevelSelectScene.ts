import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, LEVELS, PALETTE } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { SaveManager } from '../systems/SaveManager';
import { UIButton } from '../ui/Button';

export class LevelSelectScene extends Phaser.Scene {
  constructor() { super('LevelSelect'); }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.image(0, GAME_HEIGHT - 260, 'ridge-far').setOrigin(0).setAlpha(0.5).setTint(0x8093c8);

    this.add.text(cx, 60, 'SELECT LEVEL', {
      fontFamily: FONT, fontSize: '52px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setStroke('#16324f', 8).setShadow(0, 4, 'rgba(22,50,79,0.5)', 6);

    const save = SaveManager.data;
    const cols = 5;
    const cardW = 200, cardH = 200, gapX = 30, gapY = 34;
    const startX = cx - ((cols - 1) * (cardW + gapX)) / 2;
    const startY = 220;

    LEVELS.forEach((def, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY);
      const locked = def.id > save.unlocked;

      const card = this.add.container(x, y + 40).setAlpha(0);
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.2);
      g.fillRoundedRect(-cardW / 2 + 4, -cardH / 2 + 6, cardW, cardH, 18);
      g.fillStyle(locked ? 0x51606e : PALETTE.uiCard, 1);
      g.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
      g.lineStyle(3, locked ? 0x76858f : PALETTE.secondary, 0.9);
      g.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
      card.add(g);

      const num = this.add.text(0, -62, String(def.id), {
        fontFamily: FONT, fontSize: '46px', fontStyle: 'bold',
        color: locked ? '#93a3ad' : '#ffd23f',
      }).setOrigin(0.5);
      card.add(num);

      if (locked) {
        card.add(this.add.text(0, 8, '🔒', { fontSize: '42px' }).setOrigin(0.5));
        card.add(this.add.text(0, 62, 'LOCKED', {
          fontFamily: FONT, fontSize: '16px', color: '#93a3ad',
        }).setOrigin(0.5));
      } else {
        card.add(this.add.text(0, -22, def.name, {
          fontFamily: FONT, fontSize: '17px', fontStyle: 'bold', color: '#ffffff',
          align: 'center', wordWrap: { width: cardW - 24 },
        }).setOrigin(0.5));

        const stars = save.stars[i];
        for (let s = 0; s < 3; s++) {
          card.add(this.add.image(-36 + s * 36, 20, 'star')
            .setScale(0.62)
            .setTint(s < stars ? PALETTE.accent : 0x3c4f63));
        }

        const best = save.bestTimes[i];
        card.add(this.add.text(0, 58, best !== null ? `BEST ${best.toFixed(1)}s` : `PAR ${def.parTime}s`, {
          fontFamily: FONT, fontSize: '15px', color: best !== null ? '#2ec4b6' : '#bcd2e8',
        }).setOrigin(0.5));
        card.add(this.add.text(0, 80, `Score ${save.bestScores[i]}`, {
          fontFamily: FONT, fontSize: '13px', color: '#bcd2e8',
        }).setOrigin(0.5).setAlpha(0.8));

        card.setSize(cardW, cardH);
        card.setInteractive(new Phaser.Geom.Rectangle(0, 0, cardW, cardH), Phaser.Geom.Rectangle.Contains);
        if (card.input) card.input.cursor = 'pointer';
        card.on('pointerover', () => this.tweens.add({ targets: card, scale: 1.06, duration: 120, ease: 'Back.easeOut' }));
        card.on('pointerout', () => this.tweens.add({ targets: card, scale: 1, duration: 120 }));
        card.on('pointerdown', () => {
          AudioManager.instance.click();
          this.registry.set(`retries-${def.id}`, 0);
          this.registry.set(`cp-${def.id}`, null);
          this.cameras.main.fadeOut(220, 22, 50, 79);
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Game', { level: def.id }));
        });
      }

      this.tweens.add({ targets: card, alpha: 1, y, delay: i * 45, duration: 320, ease: 'Back.easeOut' });
    });

    new UIButton(this, 110, GAME_HEIGHT - 50, '← MENU', () => this.scene.start('Menu'), { width: 160, height: 52, color: PALETTE.uiCard, fontSize: 20 });

    const total = save.stars.reduce((a, b) => a + b, 0);
    this.add.image(GAME_WIDTH - 170, GAME_HEIGHT - 50, 'star').setScale(0.7).setTint(PALETTE.accent);
    this.add.text(GAME_WIDTH - 140, GAME_HEIGHT - 50, `${total} / 30`, {
      fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#16324f',
    }).setOrigin(0, 0.5);

    this.cameras.main.fadeIn(250, 22, 50, 79);
  }
}
