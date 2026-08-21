import type { CollectionEntry } from "astro:content";
import { localeBcp47, locales, type Locale } from "../i18n/config";

const ORIGIN = "https://soyaos.ai";
const MARKETING_PATHS = ["", "/editions", "/pricing", "/docs"] as const;

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function canonicalPath(locale: Locale, path: string): string {
  return `/${locale}${path}`;
}

function localizedPaths(entries: CollectionEntry<"docs">[]): string[] {
  const slugs = entries
    .filter((entry) => entry.id.startsWith("en/"))
    .map((entry) => entry.id.slice("en/".length))
    .sort();
  return [...MARKETING_PATHS, ...slugs.map((slug) => `/docs/${slug}`)];
}

export function robotsText(): string {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${ORIGIN}/sitemap.xml`,
    "",
  ].join("\n");
}

export function sitemapXml(entries: CollectionEntry<"docs">[]): string {
  const urls = localizedPaths(entries).flatMap((path) =>
    locales.map((locale) => {
      const alternates = locales.map((candidate) =>
        `    <xhtml:link rel="alternate" hreflang="${localeBcp47[candidate]}" href="${escapeXml(`${ORIGIN}${canonicalPath(candidate, path)}`)}" />`,
      );
      alternates.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${ORIGIN}${canonicalPath("zh", path)}`)}" />`,
      );
      return [
        "  <url>",
        `    <loc>${escapeXml(`${ORIGIN}${canonicalPath(locale, path)}`)}</loc>`,
        ...alternates,
        "  </url>",
      ].join("\n");
    }),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

export function llmsText(entries: CollectionEntry<"docs">[]): string {
  const paths = localizedPaths(entries);
  const localeSections = locales.map((locale) => {
    const links = paths.map((path) => {
      const label = path === "" ? "SoyaOS" : path.slice(1);
      return `- [${label}](${ORIGIN}/${locale}${path}.md)`;
    });
    return [`## ${locale}`, "", ...links].join("\n");
  });
  return [
    "# SoyaOS",
    "",
    "SoyaOS is an agent operating system. These links expose the same public content as the canonical HTML pages in Markdown form.",
    "",
    ...localeSections.flatMap((section) => [section, ""]),
  ].join("\n");
}
