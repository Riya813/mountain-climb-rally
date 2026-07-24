import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, LEVELS, PALETTE } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { UIButton } from '../ui/Button';

export class VictoryScene extends Phaser.Scene {
  constructor() { super('Victory'); }

  create(data: { level: number; time: number; score: number; stars: number; newBestTime: boolean }): void {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const isLast = data.level >= LEVELS.length;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0d2e1b, 0.55).setOrigin(0);

    const panel = this.add.container(cx, cy);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.uiCard, 0.97);
    g.fillRoundedRect(-270, -230, 540, 460, 24);
    g.lineStyle(4, PALETTE.accent, 1);
    g.strokeRoundedRect(-270, -230, 540, 460, 24);
    panel.add(g);

    panel.add(this.add.text(0, -178, isLast ? 'RALLY CHAMPION!' : 'LEVEL COMPLETE!', {
      fontFamily: FONT, fontSize: '42px', fontStyle: 'bold', color: '#ffd23f',
    }).setOrigin(0.5).setShadow(0, 3, 'rgba(0,0,0,0.4)', 4));

    // star reveal, one at a time
    for (let s = 0; s < 3; s++) {
      const star = this.add.image(-90 + s * 90, -90, 'star')
        .setScale(0).setTint(s < data.stars ? PALETTE.accent : 0x3c4f63);
      panel.add(star);
      this.tweens.add({
        targets: star, scale: s < data.stars ? 1.35 : 1, angle: 360,
        delay: 350 + s * 320, duration: 380, ease: 'Back.easeOut',
        onStart: () => { if (s < data.stars) AudioManager.instance.star(); },
      });
    }

    panel.add(this.add.text(0, -8, `TIME  ${data.time.toFixed(1)}s   (par ${LEVELS[data.level - 1].parTime}s)`, {
      fontFamily: FONT, fontSize: '24px', color: '#ffffff',
    }).setOrigin(0.5));
    panel.add(this.add.text(0, 30, `SCORE  ${Math.round(data.score)}`, {
      fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#2ec4b6',
    }).setOrigin(0.5));
    if (data.newBestTime) {
      const nb = this.add.text(150, -8, 'NEW BEST!', {
        fontFamily: FONT, fontSize: '18px', fontStyle: 'bold', color: '#ef476f',
      }).setOrigin(0, 0.5).setAngle(-8);
      panel.add(nb);
      this.tweens.add({ targets: nb, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
    }

    if (!isLast) {
      panel.add(new UIButton(this, 0, 100, 'NEXT LEVEL →', () => {
        this.registry.set(`retries-${data.level + 1}`, 0);
        this.registry.set(`cp-${data.level + 1}`, null);
        this.scene.stop();
        this.scene.get('Game').scene.restart({ level: data.level + 1 });
      }, { width: 300 }));
    } else {
      panel.add(this.add.text(0, 100, 'All 10 levels conquered. 🏆', {
        fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffd23f',
      }).setOrigin(0.5));
    }
    panel.add(new UIButton(this, -120, 178, 'RETRY', () => {
      this.registry.set(`retries-${data.level}`, 0);
      this.registry.set(`cp-${data.level}`, null);
      this.scene.stop();
      this.scene.get('Game').scene.restart({ level: data.level });
    }, { width: 200, color: PALETTE.secondary }));
    panel.add(new UIButton(this, 120, 178, 'LEVELS', () => {
      this.scene.stop('Game');
      this.scene.start('LevelSelect');
    }, { width: 200, color: 0x51606e }));

    panel.setScale(0.7).setAlpha(0).setDepth(2);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });

    // celebratory confetti
    this.add.particles(cx, -20, 'dot', {
      x: { min: -500, max: 500 },
      speedY: { min: 120, max: 260 },
      speedX: { min: -40, max: 40 },
      scale: { start: 0.6, end: 0.2 },
      rotate: { start: 0, end: 360 },
      lifespan: 3200,
      quantity: 2,
      frequency: 60,
      tint: [PALETTE.primary, PALETTE.secondary, PALETTE.accent, 0xffffff],
    }).setDepth(1);
  }
}
