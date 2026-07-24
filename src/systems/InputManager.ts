import Phaser from 'phaser';

/**
 * Unified input across keyboard, mouse pointer, and touch.
 * Gameplay code reads the boolean intents (gas/brake/tiltLeft/tiltRight)
 * without caring where they came from.
 *
 * Touch layout (mobile-ready): right 40% of screen = gas, left 40% = brake.
 * While airborne the same zones double as tilt (right = nose down, left = nose up),
 * matching the keyboard's A/D behaviour.
 *
 * Default bindings (see README for remapping):
 *   RIGHT / UP / W  -> gas        LEFT / DOWN / S -> brake
 *   D -> tilt right (nose down)   A -> tilt left (nose up)
 *   ESC -> pause    R -> restart  M -> mute
 */
export class InputManager {
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private touchGas = false;
  private touchBrake = false;

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys('RIGHT,LEFT,UP,DOWN,A,D,W,S') as Record<string, Phaser.Input.Keyboard.Key>;
    }
    scene.input.addPointer(1); // allow two simultaneous touches

    const evalPointer = () => {
      this.touchGas = false;
      this.touchBrake = false;
      const w = scene.scale.width;
      for (const p of [scene.input.pointer1, scene.input.pointer2, scene.input.mousePointer]) {
        if (!p || !p.isDown) continue;
        if (p.wasTouch || p === scene.input.pointer1 || p === scene.input.pointer2) {
          if (p.x > w * 0.6) this.touchGas = true;
          else if (p.x < w * 0.4) this.touchBrake = true;
        }
      }
    };
    scene.input.on('pointerdown', evalPointer);
    scene.input.on('pointerup', evalPointer);
    scene.input.on('pointermove', evalPointer);
  }

  get gas(): boolean {
    return this.isDown('RIGHT') || this.isDown('UP') || this.isDown('W') || this.touchGas;
  }
  get brake(): boolean {
    return this.isDown('LEFT') || this.isDown('DOWN') || this.isDown('S') || this.touchBrake;
  }
  get tiltRight(): boolean { return this.isDown('D') || this.touchGas; }
  get tiltLeft(): boolean { return this.isDown('A') || this.touchBrake; }

  private isDown(k: string): boolean {
    return this.keys[k] ? this.keys[k].isDown : false;
  }

  /** Bind a one-shot action key (pause, restart, mute). */
  onKey(code: string, handler: () => void): void {
    this.scene.input.keyboard?.on(`keydown-${code}`, handler);
  }
}
