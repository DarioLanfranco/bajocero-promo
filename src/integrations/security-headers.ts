import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { renderHeadersFile } from "../config/security";

/**
 * Emite `_headers` en `dist/` a partir de `src/config/security.ts`, de modo que
 * la política de seguridad y las reglas de caché tengan una sola definición.
 */
export const securityHeaders = (): AstroIntegration => ({
  name: "bajocero:security-headers",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      await fs.writeFile(
        fileURLToPath(new URL("_headers", dir)),
        renderHeadersFile(),
        "utf8",
      );
    },
  },
});
