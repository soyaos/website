import type { Dictionary } from "./types";

export const en = {
  meta: {
    siteTitle: "SoyaOS — Agent Operating System",
    homeTitle: "SoyaOS — Agent Operating System",
    homeDescription:
      "One binary, six editions, three node roles. SoyaOS gets out of your way: bring your own LLM, deploy any Agent as an OpenAI-compatible model.",
    editionsTitle: "Editions · SoyaOS",
    editionsDescription:
      "SoyaOS ships as one binary in six deployment shapes — Solo, Cluster, Cloud, Hybrid, Enterprise Cloud, Enterprise Private. Pick the one that fits today; switch later without rewriting.",
    pricingTitle: "Pricing · SoyaOS",
    pricingDescription:
      "Solo remains MIT-licensed; Cloud v0.2.0 is currently free with daily quotas. Paid plans, metering, and billing are not live.",
    docsTitle: "Documentation · SoyaOS",
  },

  common: {
    nav: {
      editions: "Editions",
      pricing: "Pricing",
      docs: "Docs",
      github: "GitHub",
      alpha: "alpha",
    },
    footer: {
      tagline: "Agent OS · MIT-licensed",
      editions: "Editions",
      pricing: "Pricing",
      docs: "Docs",
      github: "GitHub",
      license: "LICENSE",
      discordSoon: "Discord (soon)",
      copyright: "© 2026 SoyaOS Contributors",
    },
    localeSwitcher: {
      label: "Language",
    },
  },

  home: {
    hero: {
      pill: "Public alpha · v0.1",
      titleLine1: "Agent Operating System —",
      titleLine2: "one binary, six editions, three node roles.",
      subtitle:
        "SoyaOS gets out of your way. Bring your own LLM. Deploy any Agent as an OpenAI-compatible model — locally, on your cluster, or hosted.",
      ctaPrimary: "Get the binary",
      ctaSecondary: "Read the spec",
      platforms: "MIT-licensed · no telemetry · runs on macOS / Linux / Windows",
    },
    quickstart: {
      label: "60-second quickstart",
      pathLabel: "~/projects",
      comment1: "# paste 127.0.0.1:7474/v1 into Cherry Studio.",
      comment2: "# done.",
      caption:
        "One process. Speaks OpenAI on /v1/chat/completions. Loads a SoyaPack, schedules a Comet, talks to your model of choice.",
    },
    stories: {
      eyebrow: "Four flagship stories",
      title: "What people are building.",
      intro:
        "The alpha ships with four reference Agents — each a complete SoyaPack you can run, fork, or read for inspiration.",
      allRepos: "All reference repos →",
      referenceRepo: "Reference repo",
      list: [
        {
          persona: "Parents tutoring grade-school writing",
          aha: "Drop a model essay + topic; print an A4 writing guide your kid can actually follow.",
        },
        {
          persona: "Knowledge workers tracking a beat",
          aha: 'Type "watch USB-C policy in EU" in Chinese — get a long-image digest in DingTalk at 9am daily.',
        },
        {
          persona: "Real-estate self-media operators",
          aha: 'One sentence in → 500-row Excel out; each row has a "make post / make reel" button that just works.',
        },
        {
          persona: "Solo short-video creators",
          aha: "Natural-language brief → Remotion timeline → Comet renders MP4 → lands on your NAS overnight.",
        },
      ],
    },
    why: {
      eyebrow: "Why SoyaOS",
      title: "Built like a kitchen, not a laboratory.",
      intro:
        "Three properties we refuse to compromise on, even as the alpha ships weekly.",
      list: [
        {
          title: "One binary, six editions",
          body: "Solo on a laptop to Enterprise on-prem. Same kernel, same SoyaPack manifest format, different deployment shapes. You graduate without rewriting.",
        },
        {
          title: "OpenAI-compatible in & out",
          body: "Talk to SoyaOS through any OpenAI SDK. SoyaOS talks to any OpenAI-compatible upstream. Bring your own LLM — Claude, GPT, Qwen, a local Ollama — and swap freely.",
        },
        {
          title: "MIT-licensed, fail-closed by default",
          body: "Capability tokens, signed SoyaPacks, an end-to-end audit trail in SoyaScope. No telemetry, no phone-home — your agents stay on your hardware unless you say otherwise.",
        },
      ],
    },
    closing: {
      eyebrow: "Ready when you are",
      title: "Three node roles. One binary. Your hardware.",
      body: "Planet (control) · Moon (UI / edge) · Comet (worker). Start with all three on your laptop, peel them apart as you grow.",
      ctaDownload: "Download v0.1",
      ctaEditions: "See editions",
    },
  },

  editions: {
    hero: {
      pill: "Deployment shapes",
      title: "Six editions. One kernel.",
      subtitleParts: {
        lead: "The ",
        em: "edition",
        tail:
          " describes where the control plane and workloads run and who operates them. Solo uses the local binary; Cloud v0.2.0 uses the hosted Portal and API.",
      },
      codeComment: "# local Solo entry point",
    },
    table: {
      colEdition: "Edition",
      colCli: "Entry point",
      colPersona: "Persona",
      colCost: "Typical cost",
      colStatus: "Status",
      badgeAlpha: "alpha now",
      badgeStable: "Stable v0.2.0",
      badgePlanned: "planned",
    },
    detail: {
      eyebrow: "Where things run",
      title: "Control plane vs. data plane, per edition.",
      intro:
        "Solo and Cloud are available now; the remaining shapes are roadmap items. Cloud v0.2.0 is a controlled text-Agent service, not the full target Cloud architecture.",
      controlPlane: "Control plane",
      dataPlane: "Data plane",
    },
    list: [
      {
        persona: "One dev, one laptop.",
        cost: "Free · your hardware",
        controlPlane: "in-process",
        dataPlane: "in-process",
        description:
          "Planet, Moon and Comet collapse into a single process on your machine. No registry, no auth, no network surface — the fastest way to feel SoyaOS.",
      },
      {
        persona: "A team + a VPS + intranet devices.",
        cost: "~$0.10 / Comet·hr (est.)",
        controlPlane: "self-hosted Planet on your VPS",
        dataPlane: "self-hosted Comets in your LAN / VPC",
        description:
          "One Planet you run, Comets you scale. Auth via shared org token, manifest registry on your S3-compatible bucket. The default shape for a startup engineering team.",
      },
      {
        persona: "Register, get an API key, ship.",
        cost: "currently free · daily quotas",
        controlPlane: "SoyaOS-hosted personal tenant and API keys",
        dataPlane: "platform-reviewed hosted text Agent",
        description:
          "Stable v0.2.0: sign in with GitHub, create an API key, call soya:starter through the OpenAI-compatible API, and inspect 24-hour trace metadata. Currently free, single-region, best-effort, and without an SLA.",
      },
      {
        persona: "SaaS Planet, your Moon.",
        cost: "per-token (control plane only)",
        controlPlane: "soyaos.ai-managed Planet",
        dataPlane: "your Comets in your VPC / on-prem",
        description:
          "The orchestration is hosted, the workload stays inside your perimeter. Useful when your data can't leave but you don't want to babysit a control plane.",
      },
      {
        persona: "Multi-tenant SaaS with SSO and SLA.",
        cost: "contact us",
        controlPlane: "dedicated Planet (region pinned)",
        dataPlane: "dedicated Comet pool",
        description:
          "Dedicated regions, SSO/SAML, SOC 2 controls, signed audit log export. Same kernel as Solo — only the operations are different.",
      },
      {
        persona: "On-prem or air-gapped.",
        cost: "annual license",
        controlPlane: "customer-operated Planet",
        dataPlane: "customer-operated Comets",
        description:
          "Ship the same binary into a sealed network. Update via signed offline bundles. Tested against banks and labs where outbound is denied by default.",
      },
    ],
    closing: {
      title: "Not sure which fits?",
      bodyParts: {
        lead: "Choose ",
        solo: "Cloud",
        mid: " for no installation or operations; choose ",
        cluster: "Solo",
        tail: " to run fully on your own computer. Other shapes remain planned.",
      },
      cta: "Cloud quickstart",
    },
  },

  pricing: {
    hero: {
      pill: "Pricing",
      title: "Solo and Cloud v0.2.0 are currently free.",
      subtitle:
        "Solo is MIT-licensed open source. Cloud is live as Stable v0.2.0 with API keys and daily quotas, but no paid plans, metered bill, or SLA.",
    },
    banner: {
      eyebrow: "Alpha",
      title: "Free. Forever-MIT core. No phone-home.",
      body: "Run as many Solo instances as you want, on as many machines as you want. No telemetry, no usage caps, no signup. The only limit is your hardware.",
      bullets: [
        "MIT-licensed — fork, embed, resell.",
        "No telemetry, no analytics, no remote config.",
        "Bring your own LLM keys — Claude / GPT / Qwen / Ollama.",
        "Signed SoyaPacks, capability tokens, audit trail.",
      ],
      ctaDownload: "Download v0.1",
      ctaSource: "Source on GitHub",
    },
    future: {
      eyebrow: "When we monetize",
      title: "The plan after GA.",
      intro:
        "Cloud v0.2.0 is live and free. The paid, BYOK, sandbox, and enterprise capabilities below are not live and are not being billed.",
      futureLabel: "Future",
      list: [
        {
          title: "Future Cloud paid plans",
          body: "We plan transparent per-token and per-sandbox-second metering and are evaluating BYOK. These are not current v0.2.0 capabilities or pricing commitments.",
        },
        {
          title: "Enterprise",
          body: "Annual seats + dedicated regions + SSO/SAML + SOC 2. Signed audit log export, offline upgrade bundles, support contracts with response-time SLAs.",
        },
        {
          title: "Core kernel + SoyaPack + CLI",
          body: "Always MIT. The format never gets a paid tier — if it did, the “portable agent” promise would die the moment we tried to monetize it.",
        },
        {
          title: "Forge & Studio",
          body: "Forge (the Agent Factory) and Studio (the local UI) are MIT-licensed and embedded in the same binary as the kernel. They ship together, they version together.",
        },
      ],
    },
    faq: {
      items: [
        {
          question: "Will the MIT core ever get a paid tier?",
          answer:
            "No. The kernel, SoyaPack manifest format, CLI, Forge and Studio will always be MIT. Paid tiers attach to operations we run on your behalf — never to the format or the binary itself.",
        },
        {
          question: "Can I commercially deploy SoyaOS today?",
          answerBeforeLink:
            "Yes — MIT means yes. The alpha label is about API stability, not legal restriction. Ship it; just pin a release and read ",
          linkLabel: "CHANGELOG",
          answerAfterLink: " before upgrading.",
          answer: "",
        },
      ],
    },
  },

  docs: {
    indexTitle: "Documentation",
    indexIntro:
      "Run your first SoyaOS Agent with hosted Cloud or local Solo, then explore the architecture, SoyaPack, API, and CLI.",
    indexCtaQuickstart: "Start with Quickstart",
    searchPlaceholder: "Search docs…",
    searchLabel: "Search",
    searchEmpty: "No matches.",
    onThisPage: "On this page",
    previous: "Previous",
    next: "Next",
    editOnGitHub: "Edit this page on GitHub",
    sidebarCategories: {
      "getting-started": "Getting started",
      concepts: "Concepts",
      guides: "Guides",
      reference: "Reference",
    },
  },
} satisfies Dictionary;
