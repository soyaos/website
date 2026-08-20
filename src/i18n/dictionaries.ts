import { en } from "./en";
import { zh } from "./zh";
import { zhHant } from "./zh-hant";
import type { Locale } from "./config";
import type { Dictionary } from "./types";

const dictionaries: Record<Locale, Dictionary> = {
  "zh": zh,
  "zh-hant": zhHant,
  "en": en,
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
