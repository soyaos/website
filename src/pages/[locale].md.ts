import type { APIRoute } from "astro";
import { isLocale, locales } from "../i18n/config";
import { markdownResponse, marketingMarkdown } from "../lib/public-content";

export function getStaticPaths() {
  return locales.map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = ({ params }) => {
  const locale = params.locale;
  if (!isLocale(locale)) return new Response("Not found.", { status: 404 });
  return markdownResponse(marketingMarkdown(locale, "home"), `/${locale}`);
};
