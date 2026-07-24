import { SaveManager } from './SaveManager';

/**
 * All audio is synthesized with the Web Audio API — no files.
 * A singleton so mute state and the engine loop survive scene changes.
 */
export class AudioManager {
  private static _instance: AudioManager | null = null;
  static get instance(): AudioManager {
    if (!this._instance) this._instance = new AudioManager();
    return this._instance;
  }

  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  muted = SaveManager.data.muted;

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ctx.destination);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    SaveManager.setMuted(this.muted);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'sine',
               vol = 0.3, slideTo?: number, delay = 0) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, vol = 0.3, freq = 800) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const size = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start();
  }

  // ---- one-shots ------------------------------------------------------
  click()    { this.tone(680, 0.06, 'square', 0.12); }
  start()    { this.tone(392, 0.12, 'square', 0.2); this.tone(523, 0.12, 'square', 0.2, undefined, 0.12); this.tone(784, 0.25, 'square', 0.25, undefined, 0.24); }
  countGo()  { this.tone(880, 0.3, 'square', 0.25, 1200); }
  pickup()   { this.tone(880, 0.08, 'sine', 0.25); this.tone(1320, 0.15, 'sine', 0.25, undefined, 0.07); }
  nearMiss() { this.tone(220, 0.2, 'sawtooth', 0.2, 440); }
  combo(n: number) {
    const base = 520 + Math.min(n, 8) * 90;
    this.tone(base, 0.1, 'square', 0.22);
    this.tone(base * 1.5, 0.14, 'square', 0.22, undefined, 0.08);
  }
  thud(power: number) { this.noise(0.12, Math.min(0.35, 0.1 + power * 0.05), 300); }
  crash() {
    this.noise(0.5, 0.4, 500);
    this.tone(160, 0.5, 'sawtooth', 0.3, 55);
  }
  lose() { this.tone(330, 0.2, 'sawtooth', 0.25, 220); this.tone(220, 0.4, 'sawtooth', 0.25, 110, 0.2); }
  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'square', 0.22, undefined, i * 0.13));
    this.tone(1318, 0.5, 'triangle', 0.25, undefined, 0.55);
  }
  star()     { this.tone(1200, 0.12, 'triangle', 0.3, 1800); }
  coin()     { this.tone(1568, 0.05, 'triangle', 0.2); this.tone(2093, 0.09, 'triangle', 0.2, undefined, 0.05); }
  boost()    { this.noise(0.25, 0.22, 1400); this.tone(300, 0.3, 'sawtooth', 0.2, 950); }
  checkpoint() { this.tone(660, 0.1, 'square', 0.2); this.tone(990, 0.18, 'square', 0.22, undefined, 0.1); }

  // ---- engine loop ----------------------------------------------------
  engineStart() {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.engineOsc) return;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(filter).connect(this.engineGain).connect(this.master);
    this.engineOsc.start();
  }

  /** speed 0..1, throttle 0..1 */
  engineUpdate(speed: number, throttle: number) {
    if (!this.engineOsc || !this.engineGain || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(50 + speed * 130 + throttle * 40, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.05 + throttle * 0.07 + speed * 0.03, t, 0.1);
  }

  engineStop() {
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
    const osc = this.engineOsc;
    if (osc && this.ctx) osc.stop(this.ctx.currentTime + 0.3);
    this.engineOsc = null;
    this.engineGain = null;
  }
}
