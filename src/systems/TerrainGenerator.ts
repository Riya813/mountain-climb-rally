import { LevelDef, ProfileKind } from '../config';

export interface TerrainData {
  step: number;
  points: number[];          // surface y per sample; NaN marks a gap
  baseY: number;
  heightAt(x: number): number;
  isGap(x: number): boolean;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Triangle wave 0→1→0 over each unit of t — gives sharp ridge crests. */
const zig = (t: number) => Math.abs((((t % 1) + 1) % 1) * 2 - 1);

/**
 * Each profile family produces a structurally different level:
 *  rolling  — classic smooth hills
 *  dunes    — long low-frequency sand waves
 *  ridged   — sharp sawtooth crests
 *  plateaus — flat mesas connected by ramps (quantized + smoothed)
 *  stairs   — ascending terraces (quantized climb)
 *  valley   — one huge descent into a basin and back out
 *  mixed    — the level morphs through several families
 */
export function generateTerrain(def: LevelDef): TerrainData {
  const step = 30;
  const n = Math.ceil(def.length / step) + 1;
  const rnd = mulberry32(def.seed);
  const baseY = 620;

  const p1 = rnd() * Math.PI * 2, p2 = rnd() * Math.PI * 2, p3 = rnd() * Math.PI * 2;
  const amp = def.amplitude;
  const f1 = 0.0025 * def.steepness, f2 = 0.006 * def.steepness, f3 = 0.016;

  const profileH = (x: number, prof: ProfileKind): number => {
    switch (prof) {
      case 'rolling':
        return Math.sin(x * f1 + p1) * amp
             + Math.sin(x * f2 + p2) * amp * 0.45
             + Math.sin(x * f3 + p3) * amp * def.roughness;
      case 'dunes':
        return Math.sin(x * f1 * 0.55 + p1) * amp * 1.3
             + Math.sin(x * f2 * 0.4 + p2) * amp * 0.35
             + Math.sin(x * f3 + p3) * amp * def.roughness * 0.4;
      case 'ridged':
        return (zig(x * f1 * 0.38 + p1) * 2 - 1) * amp * 1.15
             + (zig(x * f2 * 0.3 + p2) * 2 - 1) * amp * 0.35
             + Math.sin(x * f3 + p3) * amp * def.roughness * 0.5;
      case 'plateaus':
      case 'stairs':
        // quantization happens after the trend is applied
        return profileH(x, 'rolling') * (prof === 'stairs' ? 0.35 : 0.9);
      case 'valley':
        return -((1 - Math.cos((x / def.length) * Math.PI * 2)) / 2) * amp * 2.1
             + profileH(x, 'rolling') * 0.5;
      case 'mixed': {
        const fams: ProfileKind[] = ['rolling', 'ridged', 'dunes', 'plateaus'];
        const w = (x / def.length) * 4;
        const i = Math.min(3, Math.floor(w));
        const hA = profileH(x, fams[i] === 'plateaus' ? 'rolling' : fams[i]);
        const hB = profileH(x, fams[Math.min(3, i + 1)] === 'plateaus' ? 'rolling' : fams[Math.min(3, i + 1)]);
        const frac = w - i;
        const blend = Phaser_smoothstep(Math.max(0, (frac - 0.8) / 0.2));
        return hA + (hB - hA) * blend;
      }
    }
  };

  // 1) raw heights + linear climb trend
  const h: number[] = [];
  for (let i = 0; i < n; i++) {
    const x = i * step;
    h.push(profileH(x, def.profile) + def.trend * (x / def.length));
  }

  // 2) quantize into terraces where the profile calls for it
  if (def.profile === 'plateaus' || def.profile === 'stairs') {
    const stepH = amp * (def.profile === 'stairs' ? 0.95 : 0.75);
    for (let i = 0; i < n; i++) h[i] = Math.round(h[i] / stepH) * stepH;
  }

  // 3) smoothing passes (quantized profiles get wide ramps, ridged stays sharp)
  const passes = def.profile === 'plateaus' ? 5 : def.profile === 'stairs' ? 4 : def.profile === 'mixed' ? 2 : 1;
  for (let p = 0; p < passes; p++) {
    for (let i = 1; i < n - 1; i++) h[i] = (h[i - 1] + h[i] * 2 + h[i + 1]) / 4;
  }

  // 3.5) slope clamp — uphill capped at ~34°, downhill at ~45°, so every
  // hill is climbable and no profile can generate an accidental wall
  const maxRise = 20, maxFall = 30;
  for (let i = 0; i < n - 1; i++) {
    if (h[i + 1] > h[i] + maxRise) h[i + 1] = h[i] + maxRise;
    if (h[i + 1] < h[i] - maxFall) h[i + 1] = h[i] - maxFall;
  }

  // 4) flat launch pad, then convert to world y
  const points: number[] = [];
  for (let i = 0; i < n; i++) {
    const flat = Math.min(1, (i * step) / 500);
    points.push(baseY - h[i] * flat);
  }

  // 5) gaps: each one gets a FLAT corridor (blended into the terrain) so the
  // approach is always full-speed and level, a short launch lip, and a landing
  // pad slightly below takeoff. Gap edits run after the slope clamp, so the
  // corridor design itself guarantees no steep kinks are introduced.
  if (def.gaps > 0) {
    const usable = n - 40;
    for (let g = 0; g < def.gaps; g++) {
      const frac = 0.3 + (0.55 * (g + rnd() * 0.5)) / def.gaps;
      const start = Math.floor(usable * Math.min(frac, 0.88));
      const width = Math.ceil(def.gapWidth / step);
      const corA = Math.max(1, start - 30);            // 900px flat run-up
      const corB = Math.min(n - 8, start + width + 12);
      const refH = points[start];
      let overlaps = Number.isNaN(refH);
      for (let i = corA; i <= corB; i++) if (Number.isNaN(points[i])) overlaps = true;
      if (overlaps) continue;                          // don't stack gaps
      for (let i = corA; i <= corB; i++) {
        // long entrance blend: no crest can launch the truck over the run-up
        const blend = Math.min(1, Math.min((i - corA) / 12, (corB - i) / 6));
        points[i] = points[i] * (1 - blend) + refH * blend;
      }
      for (let i = 0; i < 5; i++) points[start - 5 + i] = refH - (i + 1) * 7;
      for (let i = 0; i < width; i++) points[start + i] = NaN;
      for (let i = 0; i < 10; i++) {
        const idx = start + width + i;
        if (idx <= corB) points[idx] = refH + 55 - i * 5;
      }
    }
  }

  // 6) final slope clamp across everything the gap edits touched — no matter
  // how the corridor meets the surrounding terrain, there can never be a wall
  for (let i = 1; i < n; i++) {
    if (Number.isNaN(points[i - 1]) || Number.isNaN(points[i])) continue;
    if (points[i] < points[i - 1] - 20) points[i] = points[i - 1] - 20;
    if (points[i] > points[i - 1] + 30) points[i] = points[i - 1] + 30;
  }

  const heightAt = (x: number): number => {
    const i = Math.floor(x / step);
    if (i < 0) return points[0];
    if (i >= n - 1) return points[n - 1];
    const a = points[i], b = points[i + 1];
    if (Number.isNaN(a) || Number.isNaN(b)) return NaN;
    return a + (b - a) * ((x - i * step) / step);
  };

  return { step, points, baseY, heightAt, isGap: (x: number) => Number.isNaN(heightAt(x)) };
}

function Phaser_smoothstep(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}
