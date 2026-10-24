import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import { WORKS } from "./src/data/bibliography.ts";
import { checkAtlasIntegrity, orphanWorks } from "./src/data/integrity.ts";
import { RECORDS_A } from "./src/data/records-a.ts";
import { RECORDS_B } from "./src/data/records-b.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fails the build if the records and the bibliography have come apart.
 *
 * The equivalent check in src/data/index.ts is gated on `import.meta.env.DEV`
 * and so vanishes from a production build — which meant, until this plugin
 * existed, that `npm run build` would happily emit a dist with citations
 * pointing at nothing.  The verification data is hand-made and hard to
 * reproduce; it should not be possible to ship a broken version of it quietly.
 *
 * Imports the data modules directly rather than through src/data/index.ts,
 * which touches `import.meta.env` and has no business being evaluated here.
 */
function atlasIntegrity(): Plugin {
  return {
    name: "atlas-integrity",
    buildStart() {
      const records = [...RECORDS_A, ...RECORDS_B];
      const problems = checkAtlasIntegrity(records, WORKS);
      if (problems.length) {
        throw new Error(
          `Atlas data integrity — ${problems.length} problem(s):\n  ${problems.join("\n  ")}`,
        );
      }
      const orphans = orphanWorks(records, WORKS);
      if (orphans.length) {
        this.warn(`${orphans.length} uncited work(s) in the bibliography: ${orphans.join(", ")}`);
      }
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [atlasIntegrity(), react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    // The portfolio reserves a bare index.html for its root hub; every stub
    // site is <concept>-index.html.  The singlefile plugin follows the input
    // basename, so the build emits dist/thresholds-index.html.
    rolldownOptions: {
      input: path.resolve(__dirname, "thresholds-index.html"),
    },
  },
});
