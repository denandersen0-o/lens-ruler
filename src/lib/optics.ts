/** Half-degree temperature settings from 16 °C through 32 °C, inclusive. */
export const STEPS = 33;
/** The stage is a 1080 × 1080 artboard; the lens sits on its centre line. */
export const STAGE = 1080;
export const CX = 540;
/** Resting lens width; it stretches further with fling speed. */
export const LENS_BASE_W = 160;

/** Fisheye spacing: a setting d stops from the lens sits mapX(d) px from it (112 px apart under the lens, 62 far out). */
export const mapX = (d: number) => Math.sign(d) * (62 * Math.abs(d) + 40 * (1 - Math.exp(-Math.abs(d) * 1.25)));
/** Fisheye size: the number under the lens is 2.15× its neighbours far out. */
export const mapS = (d: number) => 1 + 1.15 * Math.exp((-d * d) / 0.42);

/** How far the strip moves under a finger: 100 stage px per setting (the demo's cursor drags at this rate too). */
export const DRAG_PX = 100;
/** A tap within this many stage px of a number's centre picks that number. */
export const HIT_PX = 56;

/** Stage scale: min(w, h) / 1080 as in the concept; on portrait screens narrower than 760 / 1080 the stage fills the
 * width at 760 px instead (card and lens whole, the ruler's faded ends run off the sides). Landscape and square
 * windows: identical to min(w, h) / 1080. */
export const fitScale = (w: number, h: number) => Math.min(w / 760, h / STAGE);
