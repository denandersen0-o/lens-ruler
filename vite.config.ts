import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  // GitHub Pages hosts this repository under /lens-ruler/; local dev stays at /.
  base: mode === "production" ? "/lens-ruler/" : "/",
  plugins: [react()],
}));
