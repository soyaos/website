import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { isLocale } from "../../../i18n/config";
import { docMarkdown, markdownResponse } from "../../../lib/public-content";

export const getStaticPaths = (async () => {
  const entries = await getCollection("docs");
  return entries.map((entry) => {
    const slash = entry.id.indexOf("/");
    return {
      params: {
        locale: entry.id.slice(0, slash),
        slug: entry.id.slice(slash + 1),
      },
      props: { entry },
    };
  });
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params, props }) => {
  const locale = params.locale;
  const slug = params.slug;
  const entry = props.entry as CollectionEntry<"docs"> | undefined;
  if (!isLocale(locale) || !slug || !entry || entry.id !== `${locale}/${slug}`) {
    return new Response("Not found.", { status: 404 });
  }
  return markdownResponse(docMarkdown(locale, entry), `/${locale}/docs/${slug}`);
};
