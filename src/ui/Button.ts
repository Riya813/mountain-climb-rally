import Phaser from 'phaser';
import { FONT, PALETTE } from '../config';
import { AudioManager } from '../systems/AudioManager';

export interface ButtonOptions {
  width?: number;
  height?: number;
  color?: number;
  fontSize?: number;
}

export class UIButton extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    opts: ButtonOptions = {}
  ) {
    super(scene, x, y);
    const w = opts.width ?? 250;
    const h = opts.height ?? 62;
    const color = opts.color ?? PALETTE.primary;

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 16);

    const bg = scene.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    bg.lineStyle(3, 0xffffff, 0.35);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);

    const text = scene.add
      .text(0, 0, label, {
        fontFamily: FONT,
        fontSize: `${opts.fontSize ?? 26}px`,
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setShadow(0, 2, 'rgba(0,0,0,0.4)', 3);

    this.add([shadow, bg, text]);
    this.setSize(w, h);
    // Container hit areas are origin-normalized by Phaser: rect must be (0,0,w,h)
    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    if (this.input) this.input.cursor = 'pointer';

    this.on('pointerover', () => {
      scene.tweens.add({ targets: this, scale: 1.07, duration: 120, ease: 'Back.easeOut' });
    });
    this.on('pointerout', () => {
      scene.tweens.add({ targets: this, scale: 1, duration: 120, ease: 'Sine.easeOut' });
    });
    this.on('pointerdown', () => {
      AudioManager.instance.click();
      scene.tweens.add({ targets: this, scale: 0.94, duration: 60, yoyo: true, onComplete: onClick });
    });

    scene.add.existing(this);
  }
}
