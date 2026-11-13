/** The stage's display face and three interface faces (src/styles/global.css). */
const FACES = ["600 160px 'Doto'", "300 200px 'Geist'", "500 24px 'Geist'", "500 14px 'Geist Mono'"];

/** Waits for every face, at most 3 s, so the first frame never shows a fallback font. */
export function loadFonts(): Promise<void> {
  const all = Promise.all(FACES.map((f) => document.fonts.load(f))).then(
    () => undefined,
    () => undefined,
  );
  const cap = new Promise<void>((r) => setTimeout(r, 3000));
  return Promise.race([all, cap]);
}
