// @ts-check
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { securityHeaders } from "./src/integrations/security-headers";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL,
  integrations: [securityHeaders()],
  build: {
    inlineStylesheets: "never",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
