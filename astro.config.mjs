import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

/*
 * i18n strategy — see src/i18n/ and docs/system-design/i18n/guidelines.md
 *   - All locales carry a URL prefix (`/zh`, `/zh-hant`, `/en`).
 *   - The root path `/` is owned by public/_worker.js on Cloudflare Pages
 *     (Advanced mode) which negotiates Accept-Language and 302s onward.
 *     `src/pages/index.astro` provides a client-side fallback for
 *     `astro dev` / `astro preview` and any non-CF host.
 *   - Old paths like `/zh-cn/**` simply don't match any route, so they 404
 *     naturally — no compat redirects.
 */
export default defineConfig({
  site: "https://soyaos.ai",
  i18n: {
    defaultLocale: "zh",
    locales: ["zh", "zh-hant", "en"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: false,
    },
  },
  integrations: [tailwind({ applyBaseStyles: false })],
});
