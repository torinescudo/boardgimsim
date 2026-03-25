// ============================================================
// Seeded RNG Service – deterministic random for the game engine
// ============================================================

export class RngService {
  private state: number;

  constructor(seed?: number) {
    this.state = seed ?? Date.now();
  }

  /** Get current seed/state for serialization */
  getState(): number {
    return this.state;
  }

  /** Restore state for deserialization */
  setState(state: number): void {
    this.state = state;
  }

  /** Returns a pseudo-random number in [0, 1) using xorshift32 */
  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return (this.state % 1000000) / 1000000;
  }

  /** Roll a d6 (1-6) */
  rollD6(): number {
    return Math.floor(this.next() * 6) + 1;
  }

  /** Roll N d6s */
  rollMultipleD6(count: number): number[] {
    const results: number[] = [];
    for (let i = 0; i < count; i++) {
      results.push(this.rollD6());
    }
    return results;
  }

  /** Shuffle array in place (Fisher-Yates) */
  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Pick random element */
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

/** Singleton instance – created per game */
let globalRng = new RngService();

export function getGlobalRng(): RngService {
  return globalRng;
}

export function setGlobalRng(rng: RngService): void {
  globalRng = rng;
}

export function createRng(seed?: number): RngService {
  return new RngService(seed);
}
