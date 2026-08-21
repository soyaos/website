/*
 * Cloudflare Pages — Advanced mode worker.
 *
 * Owns root-path language negotiation. Every other request is delegated to
 * the ASSETS binding (i.e. the static files Astro put into `dist/`).
 *
 * The Accept-Language logic mirrors src/i18n/config.ts and the AppForges
 * i18n guidelines §3:
 *   - URL `/<locale>/...` is the authoritative source; we don't touch those.
 *   - `/` with no Accept-Language (missing / empty / `*`) → defaultLocale (zh).
 *   - `/` with Accept-Language present but no item matches → unmatchedLocale
 *     (en). Don't push Chinese onto a user who already told us they don't
 *     read it.
 *   - 302 redirect (never rewrite) so the user lands on the canonical
 *     `/<locale>/` URL.
 *
 * Kept in plain JS so it can be served straight out of `public/` without a
 * build step.
 */

const LOCALES = ["zh", "zh-hant", "en"];
const DEFAULT_LOCALE = "zh";
const UNMATCHED_LOCALE = "en";
const HANT_REGIONS = new Set(["TW", "HK", "MO"]);
const CANONICAL_ORIGIN = "https://soyaos.ai";

function mapToLocale(tag) {
  const lower = tag.toLowerCase().trim();
  if (!lower || lower === "*") return null;
  if (lower === "zh-hant" || lower.startsWith("zh-hant-")) return "zh-hant";
  if (lower === "zh-hans" || lower.startsWith("zh-hans-")) return "zh";
  const [lang, region] = lower.split("-");
  if (lang === "zh" && region && HANT_REGIONS.has(region.toUpperCase()))
    return "zh-hant";
  if (lang === "zh") return "zh";
  if (lang === "en") return "en";
  return null;
}

function parseAcceptLanguage(header) {
  if (!header) return [];
  const trimmed = header.trim();
  if (!trimmed || trimmed === "*") return [];
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => {
      const [code, ...params] = item.split(";").map((s) => s.trim());
      let q = 1;
      for (const p of params) {
        const m = /^q=([0-9.]+)$/i.exec(p);
        if (m) q = parseFloat(m[1]);
      }
      return { code, q };
    })
    .filter(({ code }) => code && code !== "*")
    .sort((a, b) => b.q - a.q);
}

function pickLocale(acceptLanguage) {
  const tags = parseAcceptLanguage(acceptLanguage);
  if (tags.length === 0) return DEFAULT_LOCALE;
  for (const { code } of tags) {
    const m = mapToLocale(code);
    if (m) return m;
  }
  return UNMATCHED_LOCALE;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Only the bare root needs negotiation. Everything else (including
    // /<locale>/..., /assets/..., /favicon.svg, /_worker.js itself) is
    // served by the static asset binding.
    if (url.pathname === "/") {
      const locale = pickLocale(request.headers.get("accept-language"));
      const dest = new URL(`/${locale}/`, url);
      dest.search = url.search;
      return Response.redirect(dest.toString(), 302);
    }

    const response = await env.ASSETS.fetch(request);
    if (!url.pathname.endsWith(".md") || !response.ok) return response;

    const canonicalPath = url.pathname.slice(0, -3);
    const headers = new Headers(response.headers);
    headers.set("cache-control", "public, max-age=300");
    headers.set("content-disposition", "inline");
    headers.set("content-type", "text/markdown; charset=utf-8");
    headers.set("link", `<${CANONICAL_ORIGIN}${canonicalPath}/>; rel="canonical"`);
    headers.set("x-robots-tag", "noindex");
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
