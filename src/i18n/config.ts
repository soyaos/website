import type { Dictionary } from "./types";

export type Locale = "zh" | "zh-hant" | "en";

export const locales = ["zh", "zh-hant", "en"] as const;

/**
 * Used when we have NO language information at all (no Accept-Language header,
 * empty header, or only `*`). Assume the home market.
 */
export const defaultLocale: Locale = "zh";

/**
 * Used when the user HAS declared language preferences via Accept-Language,
 * but none of them map to a supported locale. Falling back to Chinese would be
 * paternalistic — they already told us they don't read it. Drop to English as
 * the international lingua franca instead.
 */
export const unmatchedLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  "zh": "简体中文",
  "zh-hant": "繁體中文",
  "en": "English",
};

/** Internal locale → BCP-47 (used for <html lang>, hreflang, JSON-LD inLanguage). */
export const localeBcp47: Record<Locale, string> = {
  "zh": "zh-CN",
  "zh-hant": "zh-Hant",
  "en": "en-US",
};

/**
 * Internal locale → OpenGraph locale. OG only accepts language_TERRITORY (no
 * script subtag), so zh-hant maps to zh_TW per Meta's prevailing convention.
 */
export const localeOg: Record<Locale, string> = {
  "zh": "zh_CN",
  "zh-hant": "zh_TW",
  "en": "en_US",
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Strip a leading `/<locale>` from a pathname; returns ['', '/about', etc.]. */
export function stripLocale(pathname: string): string {
  for (const l of locales) {
    if (pathname === `/${l}`) return "/";
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(`/${l}`.length);
  }
  return pathname;
}

/** Build a path with the given locale prefix. */
export function withLocale(locale: Locale, path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === "/") return `/${locale}/`;
  return `/${locale}${clean}`;
}

/** Strongly-typed helper around the dictionary record. */
export type { Dictionary };
