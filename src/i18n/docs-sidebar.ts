import type { Dictionary } from "./types";

/*
 * Sidebar structure — single source of truth for which doc slugs belong in
 * which category and in what order. Localized category labels live in the
 * dictionary (dict.docs.sidebarCategories.*) so this file stays pure data.
 *
 * Slugs here MUST match the markdown file names under
 * src/content/docs/<locale>/<slug>.md. Mismatches surface as 404s in the
 * sidebar links, not as compile errors — so keep this list in lockstep with
 * the actual content tree.
 */
export type DocCategory = keyof Dictionary["docs"]["sidebarCategories"];

export interface SidebarEntry {
  slug: string;
}

export interface SidebarSection {
  category: DocCategory;
  entries: SidebarEntry[];
}

export const sidebar: SidebarSection[] = [
  {
    category: "getting-started",
    entries: [
      { slug: "quickstart" },
      { slug: "architecture" },
      { slug: "editions" },
    ],
  },
  {
    category: "concepts",
    entries: [
      { slug: "capabilities-sandbox" },
      { slug: "virtual-models" },
      { slug: "scope-events" },
    ],
  },
  {
    category: "guides",
    entries: [
      { slug: "writing-an-agent" },
      { slug: "self-host-moon" },
      { slug: "sign-and-publish" },
    ],
  },
  {
    category: "reference",
    entries: [
      { slug: "soyapack-v0" },
      { slug: "cli-v0" },
      { slug: "http-api" },
    ],
  },
];

/**
 * Flat ordering used for prev/next navigation. Derived from `sidebar` so
 * categories preserve their declared order and entries inside a category
 * follow the array order.
 */
export const flatOrder: string[] = sidebar.flatMap((section) =>
  section.entries.map((e) => e.slug),
);
