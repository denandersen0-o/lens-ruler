import { clamp } from "./math";
import { STEPS } from "./optics";

/**
 * Live motion after you take over: the strip either follows your finger (drag) or glides to a setting on a critically
 * damped curve, pos(t) = target + (A + B·t)·e^(−t/τ), which starts at the current position and velocity, so a
 * throw, a tap and a key press all blend into whatever the strip was doing.
 */
export type Glide = { ts: number; target: number; A: number; B: number; tau: number };

/** A tap or a key press: about 0.5 s to a setting 4 stops away, like the demo's click. */
export const TAP_TAU = 0.13;
/** A fast throw coasts on τ = 0.3 s (a slow release settles on TAP_TAU; in between it blends). */
export const THROW_TAU = 0.3;
/** Fastest throw the strip takes, settings / s. */
export const MAX_THROW = 40;
/** Thrown past either end, the strip overshoots the last setting by at most this much and comes back. */
const MAX_OVERSHOOT = 0.4;
/** Below this the glide counts as settled. */
const EPS = 1e-4;

export const clampStep = (n: number) => clamp(n, 1, STEPS);

/** Glide from (c, v) to a setting. */
export function glideTo(ts: number, c: number, v: number, target: number, tau = TAP_TAU): Glide {
  const A = c - target;
  return { ts, target, A, B: v + A / tau, tau };
}

/** Release after a drag: project the throw, land on the nearest setting to where it would coast to. */
export function release(ts: number, c: number, v: number): Glide {
  v = clamp(v, -MAX_THROW, MAX_THROW);
  const tau = TAP_TAU + (THROW_TAU - TAP_TAU) * clamp(Math.abs(v) / 6);
  const aim = Math.round(c + v * tau);
  const target = clampStep(aim);
  if (aim !== target) {
    // thrown past an end: keep the overshoot short (the peak of (A + B·t)·e^(−t/τ) is about B·τ/e past the setting)
    const A = c - target;
    const bMax = (MAX_OVERSHOOT * Math.E) / tau;
  const out = target === STEPS ? 1 : -1;
    const lim = Math.max(0, bMax - (out * A) / tau);
    if (out * v > lim) v = out * lim;
  }
  return glideTo(ts, c, v, target, tau);
}

/** Position, velocity and whether it has settled, at time t (s). */
export function glideAt(g: Glide, t: number): { c: number; v: number; done: boolean } {
  const u = Math.max(0, t - g.ts);
  const e = Math.exp(-u / g.tau);
  const off = (g.A + g.B * u) * e;
  const v = (g.B - (g.A + g.B * u) / g.tau) * e;
  const done = Math.abs(off) < EPS && Math.abs(v) < EPS * 10;
  return done ? { c: g.target, v: 0, done } : { c: g.target + off, v, done };
}

/** Rubber band past either end while dragging: at most 0.6 setting beyond the first and last. */
export function band(raw: number): number {
  if (raw < 1) return 1 - (0.6 * (1 - raw)) / (1 + (1 - raw));
  if (raw > STEPS) return STEPS + (0.6 * (raw - STEPS)) / (1 + (raw - STEPS));
  return raw;
}

/** The inverse of band(), so a drag picks up from a banded position without a jump. */
export function unband(c: number): number {
  if (c < 1) {
    const y = (1 - c) / 0.6;
    return 1 - y / (1 - y);
  }
  if (c > STEPS) {
    const y = (c - STEPS) / 0.6;
    return STEPS + y / (1 - y);
  }
  return c;
}
