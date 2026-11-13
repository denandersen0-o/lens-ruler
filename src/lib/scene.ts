import { clamp, lerp } from "./math";
import { CX, LENS_BASE_W, STEPS, mapS, mapX } from "./optics";
import type { Cursor } from "./timeline";

/** The elements a frame writes to (found by data-part in the component). */
export type Parts = {
  nums: HTMLElement[];
  lens: HTMLElement;
  ticks: HTMLCanvasElement;
  units: HTMLElement;
  tens: HTMLElement;
  fraction: HTMLElement;
  degree: HTMLElement;
  cursor: SVGElement;
};

export type Scene = {
  /** One frame: setting position c (stops), velocity v (stops / s), the demo cursor or null to hide it. */
  draw: (c: number, v: number, cur: Cursor | null) => void;
  /** Repaints the current frame after a theme change without changing the setting. */
  redraw: () => void;
};

/** Digit rows in the counter are 204 px tall; the units column sits 124 px right of the tens. */
const ROW = 204;
const COL = 100;
const COUNTER_GUTTER = 32;
const COUNTER_NUMERIC_SHIFT = 62;
export function createScene(p: Parts): Scene {
  const tk = p.ticks.getContext("2d")!;
  let cursorShown = true;
  let lastFrame: [number, number, Cursor | null] = [1, 0, null];

  const draw = (c: number, v: number, cur: Cursor | null) => {
    lastFrame = [c, v, cur];
    const sp = Math.abs(v);
    const dark = document.documentElement.dataset.theme === "dark";
    // numbers under the lens
    p.nums.forEach((el, i) => {
      const d = i + 1 - c;
      if (Math.abs(d) > 7.5) {
        el.style.opacity = String(0);
        return;
      }
      const s = mapS(d),
        w = Math.exp((-d * d) / 0.3);
      const g = Math.round(lerp(150, 255, w));
      el.style.opacity = String(lerp(lerp(0.9, 0.25, clamp(Math.abs(d) / 5)), 1, w));
      el.style.zIndex = w > 0.5 ? "2" : "0";
      el.style.color = w > 0.5 ? `rgb(${g},${g},${g})` : dark ? "#e9e7e5" : "#111113";
      el.style.transform = `translate(${CX + mapX(d) - 40}px,0) scale(${s * (1 + Math.min(sp, 14) * 0.02)},${s})`;
      el.style.filter = sp > 1.5 ? `blur(${Math.min(5, sp * 0.22) * (1 - w * 0.5)}px)` : "none";
    });
    // the lens stretches with speed and ticks softly as it passes each half-degree setting
    const lw = LENS_BASE_W + Math.min(sp, 14) * 5,
      click = Math.pow(Math.abs(Math.cos(Math.PI * c)), 8) * (sp > 0.3 ? 1 : 0);
    p.lens.style.width = lw + "px";
    p.lens.style.transform = `translate(${CX - lw / 2 - clamp(v, -14, 14) * 1.2}px,${click * -1.5}px)`;
    // ruler ticks swell in a wave around the lens (a 2× bitmap of the 1080 × 60 strip)
    tk.setTransform(2, 0, 0, 2, 0, 0);
    tk.clearRect(0, 0, 1080, 60);
    for (let k = Math.floor((c - 8) * 5); k <= (c + 8) * 5; k++) {
      const n = k / 5;
      if (n < 1 || n > STEPS) continue;
      const d = n - c,
        x = CX + mapX(d),
        maj = k % 10 === 0,
        half = k % 5 === 0,
        w = Math.exp((-d * d) / 1.4);
      const h = (maj ? 14 : half ? 10 : 7) + 20 * w,
        a = (maj ? 0.75 : half ? 0.55 : 0.32) * lerp(1, 0.35, clamp(Math.abs(d) / 6));
      tk.fillStyle = dark ? `rgba(244,243,242,${a})` : `rgba(17,17,19,${a})`;
      tk.fillRect(x - 1 - Math.min(sp, 14) * 0.2, 6, 2 + Math.min(sp, 14) * 0.4, h);
    }
    // Mechanical temperature counter: whole degrees and tenths roll in fixed columns.
    const temperature = 16 + (c - 1) * 0.5;
    const heat = clamp((temperature - 16) / 16);
    const cool = dark ? [12, 29, 52] : [150, 200, 255];
    const neutral = dark ? [25, 28, 37] : [248, 238, 221];
    const warm = dark ? [76, 36, 23] : [255, 146, 82];
    const left = cool.map((value, i) => Math.round(lerp(value, neutral[i], heat)));
    const right = neutral.map((value, i) => Math.round(lerp(value, warm[i], heat)));
    document.documentElement.style.setProperty(
      "--page",
      `linear-gradient(135deg, rgb(${left.join(" ")}) 0%, rgb(${right.join(" ")}) 100%)`,
    );
    const whole = Math.floor(temperature + 1e-8);
    const u = whole % 10;
    const tens = Math.floor(whole / 10);
    const fraction = temperature - whole;
    p.units.style.transform = `translate(${COUNTER_GUTTER + COUNTER_NUMERIC_SHIFT + COL}px,${-u * ROW}px)`;
    p.tens.style.transform = `translate(${COUNTER_GUTTER + COUNTER_NUMERIC_SHIFT}px,${-tens * ROW}px)`;
    p.fraction.style.transform = `translate(${COUNTER_GUTTER + COUNTER_NUMERIC_SHIFT + COL * 2}px,${-fraction * 2 * ROW}px)`;
    p.degree.style.transform = `translate(${COUNTER_GUTTER + COUNTER_NUMERIC_SHIFT + 392}px,0)`;
    p.tens.style.filter = sp > 1 ? `blur(${Math.min(10, sp * 0.7)}px)` : "none";
    p.units.style.filter = sp > 1 ? `blur(${Math.min(10, sp * 0.7)}px)` : "none";
    p.fraction.style.filter = sp > 1 ? `blur(${Math.min(10, sp * 0.7)}px)` : "none";
    p.degree.style.filter = sp > 1 ? `blur(${Math.min(10, sp * 0.7)}px)` : "none";
    // the demo's cursor
    if (cur) {
      const [cx, cy, down] = cur;
      p.cursor.style.transform = `translate(${cx - 2}px,${cy - 2}px) scale(${down ? 0.86 : 1})`;
    }
    if (!cur !== !cursorShown) {
      cursorShown = !!cur;
      p.cursor.style.visibility = cur ? "" : "hidden";
    }
  };

  return { draw, redraw: () => draw(...lastFrame) };
}
