import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: "https://soyaos.ai",
  integrations: [tailwind({ applyBaseStyles: false })],
});
