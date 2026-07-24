import Phaser from 'phaser';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { AudioManager } from '../systems/AudioManager';
import { UIButton } from '../ui/Button';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(): void {
    const cx = GAME_WIDTH / 2;

    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.image(0, GAME_HEIGHT - 300, 'ridge-far').setOrigin(0).setAlpha(0.7).setTint(0x8093c8);
    this.add.image(0, GAME_HEIGHT - 210, 'ridge-mid').setOrigin(0).setAlpha(0.85).setTint(0x5fb3a1);

    for (let i = 0; i < 4; i++) {
      const c = this.add.image(150 + i * 320, 90 + (i % 2) * 70, 'cloud').setAlpha(0.85).setScale(0.8 + (i % 3) * 0.25);
      this.tweens.add({ targets: c, x: c.x + 40, duration: 6000 + i * 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    // Ground strip with a parked truck for flavour
    const ground = this.add.graphics();
    ground.fillStyle(0x58b368, 1);
    ground.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 120);
    ground.fillStyle(0x2f7d4a, 1);
    ground.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 10);
    const car = this.add.container(cx + 320, GAME_HEIGHT - 158, [
      this.add.image(-30, 12, 'wheel'),
      this.add.image(34, 12, 'wheel'),
      this.add.image(0, -8, 'car'),
    ]).setScale(1.4);
    this.tweens.add({ targets: car, y: car.y - 4, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const title = this.add.text(cx, -80, 'MOUNTAIN CLIMB', {
      fontFamily: FONT, fontSize: '84px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0.5).setShadow(0, 6, 'rgba(22,50,79,0.55)', 8).setStroke('#16324f', 10);
    const title2 = this.add.text(cx, -10, 'RALLY', {
      fontFamily: FONT, fontSize: '110px', fontStyle: 'bold', color: '#ffd23f',
    }).setOrigin(0.5).setShadow(0, 6, 'rgba(22,50,79,0.55)', 8).setStroke('#16324f', 12);

    this.tweens.add({ targets: title, y: 150, duration: 700, ease: 'Bounce.easeOut' });
    this.tweens.add({ targets: title2, y: 250, duration: 700, delay: 150, ease: 'Bounce.easeOut', onComplete: () => {
      this.tweens.add({ targets: title2, scale: 1.03, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }});

    const play = new UIButton(this, cx, 420, 'PLAY', () => {
      AudioManager.instance.start();
      this.cameras.main.fadeOut(250, 22, 50, 79);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('LevelSelect'));
    }, { width: 300, height: 80, fontSize: 34 });
    play.setAlpha(0);
    this.tweens.add({ targets: play, alpha: 1, delay: 600, duration: 300 });

    const mute = this.add.text(GAME_WIDTH - 24, 24, AudioManager.instance.muted ? '🔇' : '🔊', { fontSize: '32px' })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true });
    mute.on('pointerdown', () => { mute.setText(AudioManager.instance.toggleMute() ? '🔇' : '🔊'); });
    this.input.keyboard?.on('keydown-M', () => { mute.setText(AudioManager.instance.toggleMute() ? '🔇' : '🔊'); });

    this.add.text(cx, GAME_HEIGHT - 40,
      '→ Gas   ← Brake   A / D Tilt in air   Esc Pause   R Restart   M Mute',
      { fontFamily: FONT, fontSize: '18px', color: '#16324f' }).setOrigin(0.5).setAlpha(0.8);

    this.cameras.main.fadeIn(300, 22, 50, 79);
  }
}
