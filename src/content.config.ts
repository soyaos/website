import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/*
 * Docs live as plain markdown under src/content/docs/<locale>/<slug>.md.
 * The entry id encodes the locale + slug; the routing page in
 * src/pages/[locale]/docs/[...slug].astro splits that back apart.
 *
 * Category + order drive sidebar grouping. Keep category values in lockstep
 * with src/i18n/docs-sidebar.ts (where the human-readable category labels
 * live and stay translatable).
 */
const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    category: z.enum(["getting-started", "concepts", "guides", "reference"]),
  }),
});

export const collections = { docs };
