import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { UIButton } from '../ui/Button';

export class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create(data: { level: number; reason: string; score: number; time: number; hasCheckpoint?: boolean }): void {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    AudioManager.instance.lose();
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x2a0a14, 0.55).setOrigin(0);

    const panel = this.add.container(cx, cy);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.uiCard, 0.97);
    g.fillRoundedRect(-250, -200, 500, 400, 24);
    g.lineStyle(4, PALETTE.danger, 1);
    g.strokeRoundedRect(-250, -200, 500, 400, 24);
    panel.add(g);

    const title = this.add.text(0, -140, data.reason, {
      fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: '#ef476f',
    }).setOrigin(0.5).setStroke('#ffffff', 2);
    panel.add(title);
    this.tweens.add({ targets: title, angle: { from: -2, to: 2 }, duration: 90, yoyo: true, repeat: 3 });

    panel.add(this.add.text(0, -72, `Score ${Math.round(data.score)}   ·   ${data.time.toFixed(1)}s`, {
      fontFamily: FONT, fontSize: '24px', color: '#bcd2e8',
    }).setOrigin(0.5));

    // "one more try" — R restarts instantly, no menus in the way
    const rHint = this.add.text(0, -24, data.hasCheckpoint ? 'Press  R  — continue from checkpoint' : 'Press  R  for one more try', {
      fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#ffd23f',
    }).setOrigin(0.5);
    panel.add(rHint);
    this.tweens.add({ targets: rHint, alpha: 0.45, duration: 500, yoyo: true, repeat: -1 });

    const retry = () => {
      this.scene.stop();
      this.scene.get('Game').scene.restart({ level: data.level, fromCheckpoint: !!data.hasCheckpoint });
    };
    panel.add(new UIButton(this, 0, 50, 'RETRY', retry, { width: 280 }));
    panel.add(new UIButton(this, 0, 130, 'LEVEL SELECT', () => {
      this.scene.stop('Game');
      this.scene.start('LevelSelect');
    }, { width: 280, color: 0x51606e }));

    panel.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 220, ease: 'Back.easeOut' });

    this.input.keyboard?.on('keydown-R', retry);
  }
}
