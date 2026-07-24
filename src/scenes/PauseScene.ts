import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH, PALETTE } from '../config';
import { UIButton } from '../ui/Button';

export class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  create(data: { level: number }): void {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0d1b2e, 0.6).setOrigin(0);

    const panel = this.add.container(cx, cy);
    const g = this.add.graphics();
    g.fillStyle(PALETTE.uiCard, 0.97);
    g.fillRoundedRect(-220, -190, 440, 380, 24);
    g.lineStyle(4, PALETTE.secondary, 1);
    g.strokeRoundedRect(-220, -190, 440, 380, 24);
    panel.add(g);
    panel.add(this.add.text(0, -130, 'PAUSED', {
      fontFamily: FONT, fontSize: '48px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5));

    const resume = () => { this.scene.stop(); this.scene.resume('Game'); };
    panel.add(new UIButton(this, 0, -40, 'RESUME', resume, { width: 280 }));
    panel.add(new UIButton(this, 0, 40, 'RESTART (R)', () => {
      this.scene.stop();
      const game = this.scene.get('Game');
      game.scene.restart({ level: data.level });
    }, { width: 280, color: PALETTE.secondary }));
    panel.add(new UIButton(this, 0, 120, 'LEVEL SELECT', () => {
      this.scene.stop('Game');
      this.scene.start('LevelSelect');
    }, { width: 280, color: 0x51606e }));

    panel.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 200, ease: 'Back.easeOut' });

    this.input.keyboard?.on('keydown-ESC', resume);
  }
}
