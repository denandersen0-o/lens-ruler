export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** Cubic ease in-out. */
export const eIO = (u: number) => {
  u = clamp(u);
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
};

/** A throw: a quick ramp-in (the first 14%), then a long quartic coast. */
export const fling = (u: number) => {
  u = clamp(u);
  return (1 - Math.pow(1 - u, 4)) * Math.pow(Math.min(1, u / 0.14), 1.5);
};
