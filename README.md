# 🏔️ Mountain Climb Rally

A 2D side-view physics driving game. Balance throttle against gravity, keep the truck on its wheels, and chase 3-star par times across 10 hand-tuned levels.

Built with **TypeScript + Vite + Phaser 3** (Matter physics). Every sprite, background, and sound is generated in code — zero external assets.

## Run it

```bash
npm install
npm run dev        # open the printed localhost URL
```

Production build:

```bash
npm run build      # type-checks, then bundles to dist/
npm run preview
```

## Controls (desktop)

| Input | Action |
|---|---|
| `→` / `↑` / `W` | Gas |
| `←` / `↓` / `S` | Brake / reverse |
| `A` / `D` | Tilt in mid-air (nose up / nose down) |
| `Esc` | Pause |
| `R` | Instant restart ("one more try") |
| `M` | Mute |

**Touch (mobile-ready):** press-and-hold the right 40% of the screen for gas, left 40% for brake; the same zones tilt the truck while airborne. All input flows through `src/systems/InputManager.ts`.

### Remapping defaults

Bindings live in one place — `InputManager`:

- Drive keys: the `addKeys('RIGHT,LEFT,UP,DOWN,A,D,W,S')` list plus the `gas` / `brake` / `tiltLeft` / `tiltRight` getters.
- Action keys (`ESC`, `R`, `M`): bound via `InputManager.onKey()` in `GameScene.bindShortcuts()`.

Change a key string in those two spots and the whole game follows.

## Levels

Terrain is deterministic per level (seeded), so par times are fair. Level 10 is driven at night — the truck's headlight beam comes on, and the brake light works on every level.

| # | Name | Theme | Layout profile | Length | Gaps | Fuel cans | Cargo | Par |
|---|---|---|---|---|---|---|---|---|
| 1 | Rolling Meadows | Green village, windmill + balloon | Rolling hills | 4200 | – | – | – | 15s |
| 2 | Green Ridge | Pine forest | Rolling, hillier, slight climb | 4800 | – | 1 | – | 20s |
| 3 | Dusty Dunes | Golden desert, cacti, heat haze | Long smooth dunes | 5400 | 1 | 2 | – | 20s |
| 4 | Cargo Run | Sunset farmland | Flat mesas + ramps (plateaus) | 6000 | – | 2 | ✅ | 25s |
| 5 | Canyon Hops | Red canyon | One huge valley descent/ascent | 6400 | 3 | 2 | – | 25s |
| 6 | Fuel Fever | Purple badlands dusk | Sharp sawtooth ridges | 7000 | 1 | 4 (fast drain) | – | 35s |
| 7 | Spine Ridge | Slate mountain | Extreme sawtooth ridges | 7600 | 1 | 3 | – | 45s |
| 8 | Fragile Express | Autumn forest, falling leaves | Ascending terraces (stairs) | 8200 | 1 | 3 | ✅ | 35s |
| 9 | Thin Air | Snowfield, live snowfall | Huge rolling peaks, big net climb | 8800 | 3 | 4 | – | 45s |
| 10 | Summit Rally | Night summit: aurora, fireflies, headlights | Mixed: morphs through all families | 9600 | 2 | 2 pads/gap | ✅ | 50s |

Each level pairs a unique visual theme (sky gradient, terrain palette, parallax tint, decor set — village houses, pines, cacti, red rocks, boulders, autumn trees, snow pines, glowing crystals) with a distinct terrain *profile* from `TerrainGenerator` (rolling / dunes / ridged / plateaus / stairs / valley / mixed), so no two levels drive or look the same.

**New in v3:** coins along the route (+15 each) with coin arcs tracing the flight path over every gap; green boost pads (every gap has two on its run-up — hit them and commit); mid-level checkpoint flags on levels 5+ (R and Retry continue from the checkpoint with your time and score); grounded stability assist + wheelie protection so full throttle never flips you on its own — air control stays fully manual.

**Verified beatable:** every level is play-tested by an automated driver in a headless test rig (jsdom + node-canvas running the real build); all 10 complete without retries. Par times are set at ~1.4x the bot's measured completion times.

**Mechanics:** gas drains fuel (cans refill 45%); running dry while stopped ends the run. Fragile cargo takes damage from hard chassis impacts — a red flash warns you; at 0 HP the run ends. Landing on the roof = flipped = game over. Gaps have built-in launch lips; commit to them with speed.

**Stars:** 3★ = finish under par with zero retries on that attempt chain · 2★ = finish within 1.5× par · 1★ = any finish. Progress (unlocks, stars, best times, best scores, mute) persists in `localStorage`.

**Scoring:** distance + trick points (flips, big air, near-miss saves) × a streak combo multiplier (+0.5× per trick, 4s window) + a time bonus and remaining cargo HP on finish.

## Architecture

```
src/
  main.ts                 Phaser config + scene registry
  config.ts               palette, fonts, the 10 LevelDefs
  scenes/
    BootScene.ts          generates every texture programmatically
    MenuScene.ts          animated title screen
    LevelSelectScene.ts   lock/unlock grid, stars, best times
    GameScene.ts          Matter car, terrain, HUD, tricks, win/lose
    PauseScene.ts         overlay (Esc)
    GameOverScene.ts      overlay + instant-R retry
    VictoryScene.ts       star reveal, next-level flow
  systems/
    InputManager.ts       keyboard + pointer + touch abstraction
    AudioManager.ts       Web Audio synth (engine loop + one-shots)
    SaveManager.ts        localStorage progress
    TerrainGenerator.ts   seeded layered-sine heightmaps with gaps
  ui/
    Button.ts             animated reusable button
```

Physics model: chassis rectangle + two wheel circles on paired spring constraints; drive torque is applied as wheel angular velocity, air tilt as chassis angular velocity. Terrain is a chain of thin static rotated rectangles matching the drawn surface.
