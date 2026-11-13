import s from "./LensRuler.module.css";

/** The demo's arrow cursor (drawn, not the real one); hidden once you take the ruler over. */
export function DemoCursor() {
  return (
    <svg className={s.cursor} data-part="cursor" width="26" height="26" viewBox="0 0 22 22" aria-hidden="true">
      <path
        d="M2 1.5 L2 17.5 L6.4 13.4 L9.3 20 L12.1 18.8 L9.3 12.4 L15.3 12.2 Z"
        fill="#111"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
