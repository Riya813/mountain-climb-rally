export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PALETTE = {
  primary: 0xff6b35,
  secondary: 0x2ec4b6,
  accent: 0xffd23f,
  danger: 0xef476f,
  uiCard: 0x141c28,       // dark rounded HUD cards
  textLight: 0xffffff,
  textDim: 0x9db4c8,
} as const;

export const FONT = '"Trebuchet MS", "Verdana", sans-serif';

export type DecorKind = 'houses' | 'pines' | 'cacti' | 'mesas' | 'rocks' | 'autumn' | 'snow' | 'night';
export type ProfileKind = 'rolling' | 'dunes' | 'ridged' | 'plateaus' | 'stairs' | 'valley' | 'mixed';

/** Everything visual that changes per level. */
export interface ThemeDef {
  skyTop: number;
  skyBottom: number;
  sun: number;
  night?: boolean;        // moon + stars + headlights instead of sun
  top: number;            // surface line (grass / sand / snow)
  topDark: number;
  ground: number;         // dirt body
  groundDark: number;
  ridgeFar: number;
  ridgeMid: number;
  cloud: number;
  dust: number;
  decor: DecorKind;
}

export interface LevelDef {
  id: number;
  name: string;
  length: number;
  amplitude: number;
  roughness: number;
  steepness: number;
  profile: ProfileKind;   // terrain shape family — the level's structural identity
  trend: number;          // net climb (px) across the level
  gaps: number;
  gapWidth: number;
  fuelStart: number;
  fuelDrain: number;
  fuelCans: number;
  cargo: boolean;
  coins: number;       // score pickups along the route (+ arcs over gaps)
  boosts: number;      // boost pads
  checkpoint: boolean; // mid-level respawn flag
  parTime: number;
  seed: number;
  theme: ThemeDef;
}

export const LEVELS: LevelDef[] = [
  {
    id: 1, name: 'Rolling Meadows', length: 4200, amplitude: 55, roughness: 0.10, steepness: 0.85,
    profile: 'rolling', trend: 0, gaps: 0, gapWidth: 0,
    fuelStart: 100, fuelDrain: 1.6, fuelCans: 0, cargo: false, coins: 14, boosts: 0, checkpoint: false, parTime: 15, seed: 101,
    theme: {
      skyTop: 0x6ec9f5, skyBottom: 0xeafbd8, sun: 0xffd23f,
      top: 0x58b368, topDark: 0x2f7d4a, ground: 0x8a5a3b, groundDark: 0x6b4226,
      ridgeFar: 0x8093c8, ridgeMid: 0x5fb3a1, cloud: 0xffffff, dust: 0xd9c9a8, decor: 'houses',
    },
  },
  {
    id: 2, name: 'Green Ridge', length: 4800, amplitude: 85, roughness: 0.18, steepness: 0.95,
    profile: 'rolling', trend: 60, gaps: 0, gapWidth: 0,
    fuelStart: 100, fuelDrain: 1.8, fuelCans: 1, cargo: false, coins: 16, boosts: 1, checkpoint: false, parTime: 20, seed: 202,
    theme: {
      skyTop: 0x5bb7e8, skyBottom: 0xd6f2c9, sun: 0xfff1a8,
      top: 0x3f9d5a, topDark: 0x27713c, ground: 0x7a4f34, groundDark: 0x5c3a22,
      ridgeFar: 0x6f86b8, ridgeMid: 0x4a9a7f, cloud: 0xffffff, dust: 0xc9c0a0, decor: 'pines',
    },
  },
  {
    id: 3, name: 'Dusty Dunes', length: 5400, amplitude: 100, roughness: 0.12, steepness: 1.0,
    profile: 'dunes', trend: 0, gaps: 1, gapWidth: 140,
    fuelStart: 90, fuelDrain: 2.0, fuelCans: 2, cargo: false, coins: 18, boosts: 1, checkpoint: false, parTime: 20, seed: 303,
    theme: {
      skyTop: 0xffd98a, skyBottom: 0xffb26b, sun: 0xfff6d0,
      top: 0xe8c06a, topDark: 0xc79a4a, ground: 0xd0a05a, groundDark: 0xa87b3e,
      ridgeFar: 0xd98e5f, ridgeMid: 0xc0764a, cloud: 0xfff3e0, dust: 0xf0d8a0, decor: 'cacti',
    },
  },
  {
    id: 4, name: 'Cargo Run', length: 6000, amplitude: 95, roughness: 0.18, steepness: 0.95,
    profile: 'plateaus', trend: 0, gaps: 0, gapWidth: 0,
    fuelStart: 95, fuelDrain: 2.0, fuelCans: 2, cargo: true, coins: 18, boosts: 1, checkpoint: false, parTime: 25, seed: 404,
    theme: {
      skyTop: 0xff9e7d, skyBottom: 0xffe3a3, sun: 0xffb26b,
      top: 0x74b85e, topDark: 0x4c8a3f, ground: 0x8a5a3b, groundDark: 0x6b4226,
      ridgeFar: 0x9b6b95, ridgeMid: 0x77577f, cloud: 0xffe8d0, dust: 0xd9c9a8, decor: 'houses',
    },
  },
  {
    id: 5, name: 'Canyon Hops', length: 6400, amplitude: 115, roughness: 0.22, steepness: 1.05,
    profile: 'valley', trend: 0, gaps: 3, gapWidth: 140,
    fuelStart: 90, fuelDrain: 2.2, fuelCans: 2, cargo: false, coins: 20, boosts: 2, checkpoint: true, parTime: 25, seed: 505,
    theme: {
      skyTop: 0xffb27d, skyBottom: 0xffe0c2, sun: 0xfff0d8,
      top: 0xc4674a, topDark: 0x9c4c33, ground: 0xb5563b, groundDark: 0x8c3f2a,
      ridgeFar: 0xc47a5a, ridgeMid: 0xa05a40, cloud: 0xffe0c8, dust: 0xe0a080, decor: 'mesas',
    },
  },
  {
    id: 6, name: 'Fuel Fever', length: 7000, amplitude: 105, roughness: 0.28, steepness: 1.05,
    profile: 'ridged', trend: 0, gaps: 1, gapWidth: 140,
    fuelStart: 72, fuelDrain: 2.8, fuelCans: 4, cargo: false, coins: 20, boosts: 2, checkpoint: true, parTime: 35, seed: 606,
    theme: {
      skyTop: 0x8f6bb5, skyBottom: 0xffb787, sun: 0xffc890,
      top: 0xb08968, topDark: 0x8a684c, ground: 0x7d5c48, groundDark: 0x5f4536,
      ridgeFar: 0x6d5a9e, ridgeMid: 0x51447c, cloud: 0xe8c8e0, dust: 0xc8a888, decor: 'rocks',
    },
  },
  {
    id: 7, name: 'Spine Ridge', length: 7600, amplitude: 120, roughness: 0.3, steepness: 1.08,
    profile: 'ridged', trend: 100, gaps: 1, gapWidth: 140,
    fuelStart: 85, fuelDrain: 2.4, fuelCans: 3, cargo: false, coins: 22, boosts: 2, checkpoint: true, parTime: 45, seed: 707,
    theme: {
      skyTop: 0x9fb8cc, skyBottom: 0xe6eef2, sun: 0xfff8e0,
      top: 0x8b97a3, topDark: 0x66727d, ground: 0x5d6770, groundDark: 0x454e56,
      ridgeFar: 0x7d8fa3, ridgeMid: 0x5d708a, cloud: 0xf0f4f8, dust: 0xa8b0b8, decor: 'rocks',
    },
  },
  {
    id: 8, name: 'Fragile Express', length: 8200, amplitude: 110, roughness: 0.22, steepness: 1.1,
    profile: 'stairs', trend: 220, gaps: 1, gapWidth: 120,
    fuelStart: 85, fuelDrain: 2.5, fuelCans: 3, cargo: true, coins: 22, boosts: 2, checkpoint: true, parTime: 35, seed: 808,
    theme: {
      skyTop: 0xffd7a8, skyBottom: 0xfff1d8, sun: 0xffe8b0,
      top: 0xd88f3c, topDark: 0xa8681f, ground: 0x8a5a3b, groundDark: 0x6b4226,
      ridgeFar: 0xb87a4a, ridgeMid: 0x96603a, cloud: 0xfff0dc, dust: 0xe0b878, decor: 'autumn',
    },
  },
  {
    id: 9, name: 'Thin Air', length: 8800, amplitude: 130, roughness: 0.28, steepness: 1.1,
    profile: 'rolling', trend: 260, gaps: 3, gapWidth: 120,
    fuelStart: 70, fuelDrain: 2.9, fuelCans: 4, cargo: false, coins: 24, boosts: 3, checkpoint: true, parTime: 45, seed: 909,
    theme: {
      skyTop: 0xbfe3f7, skyBottom: 0xf2fbff, sun: 0xfffbe8,
      top: 0xffffff, topDark: 0xd6e6f0, ground: 0x9db6c8, groundDark: 0x7a93a8,
      ridgeFar: 0xa8c4d8, ridgeMid: 0x8aa8c0, cloud: 0xffffff, dust: 0xffffff, decor: 'snow',
    },
  },
  {
    id: 10, name: 'Summit Rally', length: 9600, amplitude: 140, roughness: 0.3, steepness: 1.12,
    profile: 'mixed', trend: 320, gaps: 2, gapWidth: 120,
    fuelStart: 65, fuelDrain: 3.0, fuelCans: 5, cargo: true, coins: 26, boosts: 3, checkpoint: true, parTime: 50, seed: 1010,
    theme: {
      skyTop: 0x141b3c, skyBottom: 0x3b2f5e, sun: 0xf4f0dc, night: true,
      top: 0xcdd9ec, topDark: 0xa0b0cc, ground: 0x3c4668, groundDark: 0x2b3350,
      ridgeFar: 0x2b3555, ridgeMid: 0x3d4a75, cloud: 0x4a5578, dust: 0xb8c8e0, decor: 'night',
    },
  },
];
