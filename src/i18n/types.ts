/*
 * Dictionary shape — single source of truth for what every locale must
 * provide. en.ts / zh.ts / zh-hant.ts are checked against this type via
 * `satisfies Dictionary`, so a missing key or a typo'd path becomes a
 * compile-time error rather than a silent fallback at runtime.
 */
export interface Dictionary {
  meta: {
    siteTitle: string;
    homeTitle: string;
    homeDescription: string;
    editionsTitle: string;
    editionsDescription: string;
    pricingTitle: string;
    pricingDescription: string;
    docsTitle: string;
  };

  common: {
    nav: {
      editions: string;
      pricing: string;
      docs: string;
      github: string;
      alpha: string;
    };
    footer: {
      tagline: string;
      editions: string;
      pricing: string;
      docs: string;
      github: string;
      license: string;
      discordSoon: string;
      copyright: string;
    };
    localeSwitcher: {
      label: string;
    };
  };

  home: {
    hero: {
      pill: string;
      titleLine1: string;
      titleLine2: string;
      subtitle: string;
      ctaPrimary: string;
      ctaSecondary: string;
      platforms: string;
    };
    quickstart: {
      label: string;
      pathLabel: string;
      comment1: string;
      comment2: string;
      caption: string;
    };
    stories: {
      eyebrow: string;
      title: string;
      intro: string;
      allRepos: string;
      referenceRepo: string;
      list: Array<{ persona: string; aha: string }>;
    };
    why: {
      eyebrow: string;
      title: string;
      intro: string;
      list: Array<{ title: string; body: string }>;
    };
    closing: {
      eyebrow: string;
      title: string;
      body: string;
      ctaDownload: string;
      ctaEditions: string;
    };
  };

  editions: {
    hero: {
      pill: string;
      title: string;
      subtitleParts: { lead: string; em: string; tail: string };
      codeComment: string;
    };
    table: {
      colEdition: string;
      colCli: string;
      colPersona: string;
      colCost: string;
      colStatus: string;
      badgeAlpha: string;
      badgePlanned: string;
    };
    detail: {
      eyebrow: string;
      title: string;
      intro: string;
      controlPlane: string;
      dataPlane: string;
    };
    list: Array<{
      persona: string;
      cost: string;
      controlPlane: string;
      dataPlane: string;
      description: string;
    }>;
    closing: {
      title: string;
      bodyParts: { lead: string; solo: string; mid: string; cluster: string; tail: string };
      cta: string;
    };
  };

  pricing: {
    hero: {
      pill: string;
      title: string;
      subtitle: string;
    };
    banner: {
      eyebrow: string;
      title: string;
      body: string;
      bullets: string[];
      ctaDownload: string;
      ctaSource: string;
    };
    future: {
      eyebrow: string;
      title: string;
      intro: string;
      futureLabel: string;
      list: Array<{ title: string; body: string }>;
    };
    faq: {
      items: Array<{ question: string; answer: string; answerBeforeLink?: string; linkLabel?: string; answerAfterLink?: string }>;
    };
  };

  docs: {
    indexTitle: string;
    indexIntro: string;
    indexCtaQuickstart: string;
    searchPlaceholder: string;
    searchLabel: string;
    searchEmpty: string;
    onThisPage: string;
    previous: string;
    next: string;
    editOnGitHub: string;
    sidebarCategories: {
      "getting-started": string;
      concepts: string;
      guides: string;
      reference: string;
    };
  };
}
