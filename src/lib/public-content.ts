import type { CollectionEntry } from "astro:content";
import { getDictionary } from "../i18n/dictionaries";
import type { Locale } from "../i18n/config";

export const storyMeta = [
  { id: "DD-008", emoji: "📝", name: "Compo", repo: "https://github.com/soyaos/example-essay-tutor" },
  { id: "DD-009", emoji: "📡", name: "NewsBeam", repo: "https://github.com/soyaos/example-newsbeam" },
  { id: "DD-010", emoji: "🏘️", name: "EstateMuse", repo: "https://github.com/soyaos/example-estatemuse" },
  { id: "DD-011", emoji: "🎬", name: "SilentCut", repo: "https://github.com/soyaos/example-silentcut" },
] as const;

export type EditionStatus = "alpha" | "stable" | "planned";
export const editionMeta: Array<{ name: string; cli: string; entry: string; status: EditionStatus }> = [
  { name: "Solo", cli: "solo", entry: "soyaos start --edition solo", status: "alpha" },
  { name: "Cluster", cli: "cluster", entry: "soyaos start --edition cluster", status: "planned" },
  { name: "Cloud", cli: "cloud", entry: "developer.soyaos.ai", status: "stable" },
  { name: "Hybrid", cli: "hybrid", entry: "soyaos start --edition hybrid", status: "planned" },
  { name: "Enterprise Cloud", cli: "ent-cloud", entry: "soyaos start --edition ent-cloud", status: "planned" },
  { name: "Enterprise Private", cli: "ent-private", entry: "soyaos start --edition ent-private", status: "planned" },
];

export type MarketingPage = "home" | "editions" | "pricing";

function sourceFooter(locale: Locale, path: string): string {
  return `\n\n---\n\nCanonical HTML: https://soyaos.ai/${locale}${path}`;
}

function homeMarkdown(locale: Locale): string {
  const dict = getDictionary(locale);
  const stories = storyMeta.map((meta, index) => ({ ...meta, ...dict.home.stories.list[index] }));
  const storySections = stories.map((story) => [
    `### ${story.name} (${story.id})`,
    story.persona,
    story.aha,
    `[${dict.home.stories.referenceRepo}](${story.repo})`,
  ].join("\n\n")).join("\n\n");
  const whySections = dict.home.why.list
    .map((item) => `### ${item.title}\n\n${item.body}`)
    .join("\n\n");
  return [
    `# ${dict.home.hero.titleLine1} ${dict.home.hero.titleLine2}`,
    dict.home.hero.subtitle,
    `## ${dict.home.quickstart.label}\n\n\`\`\`sh\ncurl -L https://soyaos.ai/install | sh\nsoyaos start\n\`\`\`\n\n${dict.home.quickstart.caption}`,
    `## ${dict.home.stories.title}\n\n${dict.home.stories.intro}\n\n${storySections}`,
    `## ${dict.home.why.title}\n\n${dict.home.why.intro}\n\n${whySections}`,
    `## ${dict.home.closing.title}\n\n${dict.home.closing.body}`,
  ].join("\n\n") + sourceFooter(locale, "");
}

function editionsMarkdown(locale: Locale): string {
  const dict = getDictionary(locale);
  const editions = editionMeta.map((meta, index) => ({ ...meta, ...dict.editions.list[index] }));
  const rows = editions.map((edition) =>
    `| ${edition.name} | \`${edition.entry}\` | ${edition.persona} | ${edition.cost} | ${edition.status === "alpha" ? dict.editions.table.badgeAlpha : edition.status === "stable" ? dict.editions.table.badgeStable : dict.editions.table.badgePlanned} |`,
  ).join("\n");
  const details = editions.map((edition) => [
    `## ${edition.name}`,
    `\`${edition.entry}\``,
    edition.description,
    `- ${dict.editions.detail.controlPlane}: ${edition.controlPlane}`,
    `- ${dict.editions.detail.dataPlane}: ${edition.dataPlane}`,
  ].join("\n\n")).join("\n\n");
  return [
    `# ${dict.editions.hero.title}`,
    `${dict.editions.hero.subtitleParts.lead}${dict.editions.hero.subtitleParts.em}${dict.editions.hero.subtitleParts.tail}`,
    `| ${dict.editions.table.colEdition} | ${dict.editions.table.colCli} | ${dict.editions.table.colPersona} | ${dict.editions.table.colCost} | ${dict.editions.table.colStatus} |\n| --- | --- | --- | --- | --- |\n${rows}`,
    details,
    `## ${dict.editions.closing.title}\n\n${dict.editions.closing.bodyParts.lead}${dict.editions.closing.bodyParts.solo}${dict.editions.closing.bodyParts.mid}${dict.editions.closing.bodyParts.cluster}${dict.editions.closing.bodyParts.tail}`,
  ].join("\n\n") + sourceFooter(locale, "/editions");
}

function pricingMarkdown(locale: Locale): string {
  const dict = getDictionary(locale);
  const future = dict.pricing.future.list
    .map((item) => `### ${item.title}\n\n${item.body}`)
    .join("\n\n");
  const faq = dict.pricing.faq.items.map((item) =>
    `### ${item.question}\n\n${item.answer || `${item.answerBeforeLink ?? ""}${item.linkLabel ?? ""}${item.answerAfterLink ?? ""}`}`,
  ).join("\n\n");
  return [
    `# ${dict.pricing.hero.title}`,
    dict.pricing.hero.subtitle,
    `## ${dict.pricing.banner.title}\n\n${dict.pricing.banner.body}\n\n${dict.pricing.banner.bullets.map((item) => `- ${item}`).join("\n")}`,
    `## ${dict.pricing.future.title}\n\n${dict.pricing.future.intro}\n\n${future}`,
    `## FAQ\n\n${faq}`,
  ].join("\n\n") + sourceFooter(locale, "/pricing");
}

export function marketingMarkdown(locale: Locale, page: MarketingPage): string {
  if (page === "home") return homeMarkdown(locale);
  if (page === "editions") return editionsMarkdown(locale);
  return pricingMarkdown(locale);
}

export function docsIndexMarkdown(
  locale: Locale,
  entries: CollectionEntry<"docs">[],
): string {
  const dict = getDictionary(locale);
  const list = entries
    .sort((left, right) => left.data.order - right.data.order)
    .map((entry) => {
      const slug = entry.id.slice(`${locale}/`.length);
      return `- [${entry.data.title}](https://soyaos.ai/${locale}/docs/${slug}.md) — ${entry.data.description}`;
    })
    .join("\n");
  return `# ${dict.docs.indexTitle}\n\n${dict.docs.indexIntro}\n\n${list}${sourceFooter(locale, "/docs")}\n`;
}

export function docMarkdown(locale: Locale, entry: CollectionEntry<"docs">): string {
  const slug = entry.id.slice(`${locale}/`.length);
  return `# ${entry.data.title}\n\n${entry.data.description}\n\n${(entry.body ?? "").trim()}${sourceFooter(locale, `/docs/${slug}`)}\n`;
}

export function markdownResponse(body: string, canonicalPath: string): Response {
  const canonical = `https://soyaos.ai${canonicalPath}`;
  return new Response(`${body.trim()}\n`, {
    headers: {
      "cache-control": "public, max-age=300",
      "content-disposition": "inline",
      "content-type": "text/markdown; charset=utf-8",
      link: `<${canonical}>; rel="canonical"`,
      "x-robots-tag": "noindex",
    },
  });
}
