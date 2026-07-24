import { LEVELS } from '../config';

export interface SaveData {
  unlocked: number;                 // highest playable level id
  stars: number[];                  // per level, 0..3
  bestTimes: (number | null)[];     // seconds
  bestScores: number[];
  muted: boolean;
  tutorialSeen: boolean;
}

const KEY = 'mcr-save-v1';

function defaults(): SaveData {
  return {
    unlocked: 1,
    stars: LEVELS.map(() => 0),
    bestTimes: LEVELS.map(() => null),
    bestScores: LEVELS.map(() => 0),
    muted: false,
    tutorialSeen: false,
  };
}

export class SaveManager {
  private static _data: SaveData | null = null;

  static get data(): SaveData {
    if (!this._data) {
      let loaded = defaults();
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) loaded = { ...loaded, ...(JSON.parse(raw) as Partial<SaveData>) };
      } catch { /* corrupt or unavailable storage: fall back to defaults */ }
      this._data = loaded;
    }
    return this._data;
  }

  static save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable (private mode) — play session still works */
    }
  }

  /** Returns { newBestTime, newBestScore } for UI celebration. */
  static recordResult(levelId: number, time: number, score: number, stars: number) {
    const d = this.data;
    const i = levelId - 1;
    const newBestTime = d.bestTimes[i] === null || time < (d.bestTimes[i] as number);
    const newBestScore = score > d.bestScores[i];
    if (newBestTime) d.bestTimes[i] = Math.round(time * 100) / 100;
    if (newBestScore) d.bestScores[i] = score;
    if (stars > d.stars[i]) d.stars[i] = stars;
    if (levelId < LEVELS.length) d.unlocked = Math.max(d.unlocked, levelId + 1);
    this.save();
    return { newBestTime, newBestScore };
  }

  static setMuted(m: boolean) { this.data.muted = m; this.save(); }
  static setTutorialSeen() { this.data.tutorialSeen = true; this.save(); }
}
