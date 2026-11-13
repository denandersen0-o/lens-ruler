import { CX, DRAG_PX, HIT_PX, STEPS, STAGE, mapX } from "./optics";
import { band, clampStep, glideAt, glideTo, release, unband, type Glide } from "./motion";
import type { Scene } from "./scene";
import { LOOP, cAt, curAt, vAt } from "./timeline";

declare global {
  interface Window {
    /** Draws the demo at any moment: __render(t), t in seconds (wraps every __LOOP). Set once the fonts are in. */
    __render?: (t: number) => void;
    /** Repaints the current frame when display settings change. */
    __redraw?: () => void;
    /** The demo's length in seconds (8). */
    __LOOP?: number;
    /** Set it before the page loads (or open the page with ?rec) to keep the page still and call __render(t) yourself. */
    __RENDERING__?: boolean;
  }
}

type Hooks = {
  /** The stage (to turn pointer positions into stage px) and the ruler (the strip you drag; a slider for keys). */
  stage: HTMLElement;
  ruler: HTMLElement;
  /** Called whenever the setting under the lens (rounded) changes, for aria-valuenow. */
  onStep: (n: number) => void;
  /** Called with true while a finger or the mouse holds the strip (for the grabbing cursor). */
  onHold: (held: boolean) => void;
};

/**
 * Runs the ruler: the 8-s demo loop until you press on the ruler or use a key on it, then it's yours for good: drag,
 * throw, tap a number, arrows / Page Up / Page Down / Home / End. Reduced motion: one still frame and no glides (it
 * jumps). Returns a function that stops everything.
 */
export function run(scene: Scene, { stage, ruler, onStep, onHold }: Hooks): () => void {
  const wrap = (t: number) => ((t % LOOP) + LOOP) % LOOP;
  const still = (t: number) => {
    const u = wrap(t);
    scene.draw(cAt(u), vAt(u), curAt(u));
  };
  window.__render = still;
  window.__redraw = scene.redraw;
  window.__LOOP = LOOP;
  const stopHook = () => {
    if (window.__render === still) window.__render = undefined;
    if (window.__redraw === scene.redraw) window.__redraw = undefined;
  };

  if (window.__RENDERING__ || new URLSearchParams(location.search).has("rec")) {
    // t = 0 on the next frame, not at once: the numbers' layers are then first painted untransformed, as in normal
    // play, so Chrome rasterises them the same way and __render(t) gives the same pixels as the running demo
    const first = requestAnimationFrame(() => still(0));
    return () => {
      cancelAnimationFrame(first);
      stopHook();
    };
  }

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nowS = () => performance.now() / 1000;
  const t0 = nowS();
  let live = false;
  // live state: the glide in progress (null while held or at rest), the position and velocity drawn last
  let glide: Glide | null = null;
  let c = cAt(0);
  let v = 0;
  // the drag: pointer id, where it went down (client x, stage-scale), the unbanded position it grabbed, samples
  let drag: { id: number; x0: number; raw0: number; scale: number; moved: number; at: number } | null = null;
  let samples: { t: number; c: number }[] = [];
  let shown = -1;
  let raf = 0;

  const reportStep = (n: number) => {
    const r = clampStep(Math.round(n));
    if (r !== shown) onStep((shown = r));
  };

  const frame = () => {
    const now = nowS();
    if (!live) {
      const t = (((now - t0) % LOOP) + LOOP) % LOOP;
      const cc = cAt(t);
      scene.draw(cc, vAt(t), curAt(t));
      reportStep(cc);
    } else {
      if (glide) {
        const g = glideAt(glide, now);
        c = g.c;
        v = g.v;
        if (g.done) glide = null;
      } else if (drag) {
        // the strip's speed over the last 0.1 s of the drag (0 once the finger stops)
        samples = samples.filter((s) => s.t >= now - 0.1);
        const s0 = samples[0];
        v = s0 && now - s0.t > 0.008 ? (c - s0.c) / (now - s0.t) : 0;
      } else v = 0;
      scene.draw(c, reduce ? 0 : v, null);
      reportStep(c);
    }
    raf = requestAnimationFrame(frame);
  };

  // reduced motion: draw once now (no loop runs)
  const drawStill = () => {
    scene.draw(c, 0, null);
    reportStep(c);
  };

  // the first touch of the ruler hands it over: carry the demo's position and speed onto the live clock
  const takeOver = () => {
    if (live) return;
    live = true;
    const t = wrap(nowS() - t0);
    if (!reduce) {
      c = cAt(t);
      v = vAt(t);
    }
  };

  const goTo = (n: number) => {
    const target = clampStep(n);
    if (reduce) {
      c = target;
      drawStill();
      return;
    }
    glide = glideTo(nowS(), c, v, target);
  };

  const toStage = (clientX: number) => {
    const r = stage.getBoundingClientRect();
    return (clientX - r.left) / (r.width / STAGE);
  };

  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || drag) return;
    takeOver();
    if (glide) {
      const g = glideAt(glide, nowS());
      c = g.c;
      v = g.v;
      glide = null;
    }
    const r = stage.getBoundingClientRect();
    drag = { id: e.pointerId, x0: e.clientX, raw0: unband(c), scale: r.width / STAGE, moved: 0, at: nowS() };
    samples = [{ t: nowS(), c }];
    ruler.setPointerCapture(e.pointerId);
    onHold(true);
    if (reduce) drawStill();
  };

  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = (e.clientX - drag.x0) / drag.scale;
    drag.moved = Math.max(drag.moved, Math.abs(e.clientX - drag.x0));
    c = band(drag.raw0 - dx / DRAG_PX);
    samples.push({ t: nowS(), c });
    if (reduce) drawStill();
  };

  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const tap = e.type === "pointerup" && drag.moved < 6 && nowS() - drag.at < 0.5;
    drag = null;
    onHold(false);
    if (ruler.hasPointerCapture(e.pointerId)) ruler.releasePointerCapture(e.pointerId);
    if (tap) {
      // a tap picks the number under it (nearest within HIT_PX of its centre), or settles where it is
      const x = toStage(e.clientX);
      let best = Math.round(c);
      let bd = Infinity;
      for (let n = 1; n <= STEPS; n++) {
        const dd = Math.abs(CX + mapX(n - c) - x);
        if (dd < bd) [bd, best] = [dd, n];
      }
      return goTo(bd <= HIT_PX ? best : Math.round(c));
    }
    if (reduce) return goTo(Math.round(c));
    const now = nowS();
    samples = samples.filter((s) => s.t >= now - 0.1);
    const s0 = samples[0];
    const vv = s0 && now - s0.t > 0.008 ? (c - s0.c) / (now - s0.t) : 0;
    glide = release(now, c, vv);
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const at = glide ? glide.target : Math.round(c);
    const step: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 };
    let n: number | null = null;
    if (e.key in step) n = at + step[e.key];
    else if (e.key === "Home") n = 1;
    else if (e.key === "End") n = STEPS;
    if (n === null) return;
    e.preventDefault();
    if (drag) return;
    takeOver();
    if (glide) {
      const g = glideAt(glide, nowS());
      c = g.c;
      v = g.v;
    }
    goTo(n);
  };

  ruler.addEventListener("pointerdown", onDown);
  ruler.addEventListener("pointermove", onMove);
  ruler.addEventListener("pointerup", onUp);
  ruler.addEventListener("pointercancel", onUp);
  ruler.addEventListener("keydown", onKey);

  if (reduce) {
    // the demo's first frame, without its cursor
    live = true;
    drawStill();
  } else raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ruler.removeEventListener("pointerdown", onDown);
    ruler.removeEventListener("pointermove", onMove);
    ruler.removeEventListener("pointerup", onUp);
    ruler.removeEventListener("pointercancel", onUp);
    ruler.removeEventListener("keydown", onKey);
    stopHook();
  };
}
