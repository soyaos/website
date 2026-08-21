import type { APIRoute } from "astro";
import { robotsText } from "../lib/discovery";

export const prerender = true;

export const GET: APIRoute = () => new Response(robotsText(), {
  headers: { "content-type": "text/plain; charset=utf-8" },
});
