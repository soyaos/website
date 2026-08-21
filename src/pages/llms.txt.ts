import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { llmsText } from "../lib/discovery";

export const prerender = true;

export const GET: APIRoute = async () => new Response(
  llmsText(await getCollection("docs")),
  { headers: { "content-type": "text/markdown; charset=utf-8" } },
);
