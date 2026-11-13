export const tempForStep = (step: number) => 16 + (step - 1) * 0.5;
export const formatTemp = (temp: number) => temp.toFixed(1);

/** The ruler's name for screen readers (it is a slider: arrow keys, Home and End move it). */
export const RULER_LABEL = "Temperature";
