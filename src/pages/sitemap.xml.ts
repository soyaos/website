import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { sitemapXml } from "../lib/discovery";

export const prerender = true;

export const GET: APIRoute = async () => new Response(
  sitemapXml(await getCollection("docs")),
  { headers: { "content-type": "application/xml; charset=utf-8" } },
);
