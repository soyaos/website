import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { isLocale, locales } from "../../i18n/config";
import {
  docsIndexMarkdown,
  markdownResponse,
  marketingMarkdown,
  type MarketingPage,
} from "../../lib/public-content";

const PAGES = ["editions", "pricing", "docs"] as const;

export function getStaticPaths() {
  return locales.flatMap((locale) =>
    PAGES.map((page) => ({ params: { locale, page } })),
  );
}

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale;
  const page = params.page;
  if (!isLocale(locale) || !page || !(PAGES as readonly string[]).includes(page)) {
    return new Response("Not found.", { status: 404 });
  }
  if (page === "docs") {
    const entries = await getCollection("docs", (entry) => entry.id.startsWith(`${locale}/`));
    return markdownResponse(docsIndexMarkdown(locale, entries), `/${locale}/docs`);
  }
  return markdownResponse(
    marketingMarkdown(locale, page as Exclude<MarketingPage, "home">),
    `/${locale}/${page}`,
  );
};
