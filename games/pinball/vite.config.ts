import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single self-contained HTML (JS + CSS inlined) so the release is one file that
// works from GitHub Pages' deep subpath AND straight off disk. See scripts/release.mjs.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    watch: {
      // examples/*.zip are reference archives; on Windows a locked zip in a
      // watched folder crashes chokidar with EBUSY (lesson from itOps).
      ignored: ['**/*.zip', '**/examples/**'],
    },
  },
});
