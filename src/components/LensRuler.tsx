import { useEffect, useRef, useState } from "react";
import { RULER_LABEL, formatTemp, tempForStep } from "../content";
import { run } from "../lib/engine";
import { loadFonts } from "../lib/fonts";
import { STEPS, fitScale } from "../lib/optics";
import { createScene } from "../lib/scene";
import { Counter } from "./Counter";
import { DemoCursor } from "./DemoCursor";
import s from "./LensRuler.module.css";

const TEMP_STEPS = Array.from({ length: STEPS }, (_, i) => i + 1);

/**
 * The stage: the temperature readout, the ruler (lens, numbers, ticks) and the demo's cursor, on a 1080 × 1080
 * artboard centred in the window. Fits it, waits for the fonts and starts the engine.
 */
export function LensRuler() {
  const stage = useRef<HTMLDivElement>(null);
  const ruler = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [held, setHeld] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return localStorage.getItem("lens-ruler-theme") === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.__redraw?.();
    try {
      localStorage.setItem("lens-ruler-theme", theme);
    } catch {
      // Keep the selected theme for the current session if storage is unavailable.
    }
  }, [theme]);

  useEffect(() => {
    const el = stage.current!;
    const fit = () => {
      el.style.transform = `translate(-50%,-50%) scale(${fitScale(innerWidth, innerHeight)})`;
    };
    fit();
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const el = stage.current!;
    const q = <T extends Element>(part: string) => el.querySelector<T>(`[data-part="${part}"]`)!;
    let stop: (() => void) | null = null;
    let dead = false;
    loadFonts().then(() => {
      if (dead) return;
      const scene = createScene({
        nums: [...el.querySelectorAll<HTMLElement>('[data-part="num"]')],
        lens: q<HTMLElement>("lens"),
        ticks: q<HTMLCanvasElement>("ticks"),
        units: q<HTMLElement>("units"),
        tens: q<HTMLElement>("tens"),
        fraction: q<HTMLElement>("fraction"),
        degree: q<HTMLElement>("degree"),
        cursor: q<SVGElement>("cursor"),
      });
      stop = run(scene, { stage: el, ruler: ruler.current!, onStep: setStep, onHold: setHeld });
    });
    return () => {
      dead = true;
      stop?.();
    };
  }, []);

  return (
    <>
      <button
        className={s.themeToggle}
        type="button"
        aria-label={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"}
        title={theme === "light" ? "Тёмная тема" : "Светлая тема"}
        onClick={() => setTheme((value) => (value === "light" ? "dark" : "light"))}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {theme === "light" ? (
            <path d="M20.3 15.2A8.6 8.6 0 0 1 8.8 3.7 8.7 8.7 0 1 0 20.3 15.2Z" />
          ) : (
            <>
              <circle cx="12" cy="12" r="3.8" />
              <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
            </>
          )}
        </svg>
      </button>
      <div ref={stage} className={held ? `${s.stage} ${s.held}` : s.stage}>
        <Counter />
        <div
          ref={ruler}
          className={s.ruler}
          role="slider"
          tabIndex={0}
          aria-label={RULER_LABEL}
          aria-valuemin={16}
          aria-valuemax={32}
          aria-valuenow={tempForStep(step)}
          aria-valuetext={`${formatTemp(tempForStep(step))} degrees Celsius`}
        >
          <div className={`${s.abs} ${s.lens}`} data-part="lens" />
          <div aria-hidden="true">
            {TEMP_STEPS.map((n) => (
              <div key={n} className={s.n} data-part="num">
                {formatTemp(tempForStep(n))}
              </div>
            ))}
          </div>
          <canvas className={s.ticks} data-part="ticks" width={2160} height={120} aria-hidden="true" />
        </div>
        <DemoCursor />
      </div>
    </>
  );
}
