import s from "./LensRuler.module.css";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const FRACTIONS = [".0", ".5", ".0"];

/** The temperature readout, shown directly on the stage. */
export function Counter() {
  const column = (part: string) => (
    <div className={`${s.abs} ${s.col}`} data-part={part}>
      {DIGITS.map((d, i) => (
        <div key={i}>{d}</div>
      ))}
    </div>
  );
  return (
    <div className={s.odo} aria-hidden="true">
      {column("tens")}
      {column("units")}
      <div className={s.fraction} data-part="fraction">
        {FRACTIONS.map((value, i) => (
          <div key={i}>{value}</div>
        ))}
      </div>
      <div className={s.degree} data-part="degree">
        °
      </div>
    </div>
  );
}
