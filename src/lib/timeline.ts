import { eIO, fling, lerp } from "./math";

/** The demo loop's length in seconds. */
export const LOOP = 8;

/**
 * The demo moves through half-degree temperature settings: 16 → 16.5, a flick to 24, a tap to 28, then a throw back
 * to 16 °C. c is the setting index, from 1 through 33.
 */
export function cAt(t: number): number {
  if (t < 0.7) return 1;
  if (t < 1.4) return 1 + eIO((t - 0.7) / 0.7);
  if (t < 1.9) return 2;
  if (t < 3.7) return 2 + 15 * fling((t - 1.9) / 1.8);
  if (t < 4.25) return 17;
  if (t < 4.9) return 17 + 8 * eIO((t - 4.25) / 0.65);
  if (t < 5.45) return 25;
  if (t < 7.4) return 25 - 24 * fling((t - 5.45) / 1.95);
  return 1;
}

/** Velocity in settings per second, as a central difference over one 60-fps frame. */
export const vAt = (t: number) => (cAt(t + 1 / 120) - cAt(t - 1 / 120)) * 60;

/** The demo's cursor: [x, y, pressed (0 | 1)] in stage px. */
export type Cursor = [number, number, number];

export function curAt(t: number): Cursor {
  const c = cAt(t);
  const mv = (a: number, b: number, u: number) => lerp(a, b, eIO(u));
  if (t < 0.6) return [mv(720, 720, 0), mv(960, 850, t / 0.6), 0];
  if (t < 1.45) return [720 - (c - 1) * 100, 850, t >= 0.66 && t < 1.42 ? 1 : 0];
  if (t < 1.85) return [mv(620, 780, (t - 1.45) / 0.4), 850, 0];
  if (t < 3.5) {
    const k = Math.min(c - 2, 2.3);
    return [780 - k * 100, 850, c - 2 < 2.3 ? 1 : 0];
  }
  if (t < 4.2) return [mv(550, 1076, (t - 3.5) / 0.6), mv(850, 756, (t - 3.5) / 0.6), 0];
  if (t < 4.5) return [1076, 756, Math.abs(t - 4.25) < 0.07 ? 1 : 0];
  if (t < 5.4) return [mv(1076, 400, (t - 4.5) / 0.8), mv(756, 850, (t - 4.5) / 0.8), 0];
  if (t < 7.2) {
    const k = Math.min(25 - c, 2.4);
    return [400 + k * 100, 850, t >= 5.45 && 25 - c < 2.4 ? 1 : 0];
  }
  return [mv(640, 720, (t - 7.2) / 0.7), mv(850, 960, (t - 7.2) / 0.7), 0];
}
