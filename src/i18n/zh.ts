import type { Dictionary } from "./types";

export const zh = {
  meta: {
    siteTitle: "SoyaOS — Agent 操作系统",
    homeTitle: "SoyaOS — Agent 操作系统",
    homeDescription:
      "一份二进制，六种版本，三种节点角色。SoyaOS 不挡你的路：自带模型、把任意 Agent 部署为 OpenAI 兼容模型。",
    editionsTitle: "版本 · SoyaOS",
    editionsDescription:
      "SoyaOS 同一份二进制，六种部署形态——Solo、Cluster、Cloud、Hybrid、Enterprise Cloud、Enterprise Private。先选当下合适的，将来切换不用重写。",
    pricingTitle: "定价 · SoyaOS",
    pricingDescription:
      "Alpha 期间 SoyaOS 对所有人免费——MIT 开源、零遥测、无用量上限。未来云版按 token + 沙箱秒计费；核心内核永远 MIT。",
    docsTitle: "文档 · SoyaOS",
  },

  common: {
    nav: {
      editions: "版本",
      pricing: "定价",
      docs: "文档",
      github: "GitHub",
      alpha: "alpha",
    },
    footer: {
      tagline: "Agent OS · MIT 开源",
      editions: "版本",
      pricing: "定价",
      docs: "文档",
      github: "GitHub",
      license: "LICENSE",
      discordSoon: "Discord（即将）",
      copyright: "© 2026 SoyaOS Contributors",
    },
    localeSwitcher: {
      label: "语言",
    },
  },

  home: {
    hero: {
      pill: "公开 alpha · v0.1",
      titleLine1: "Agent 操作系统 —",
      titleLine2: "一份二进制，六种版本，三种节点角色。",
      subtitle:
        "SoyaOS 不挡你的路。自带任何 LLM。把任意 Agent 部署为 OpenAI 兼容模型——本地、集群，或托管。",
      ctaPrimary: "下载二进制",
      ctaSecondary: "阅读规范",
      platforms: "MIT 开源 · 零遥测 · 运行于 macOS / Linux / Windows",
    },
    quickstart: {
      label: "60 秒上手",
      pathLabel: "~/projects",
      comment1: "# 把 127.0.0.1:7474/v1 粘到 Cherry Studio 即可。",
      comment2: "# 完成。",
      caption:
        "一个进程，在 /v1/chat/completions 上讲 OpenAI 协议；加载一个 SoyaPack，调度一个 Comet，连到你选的模型。",
    },
    stories: {
      eyebrow: "四个旗舰案例",
      title: "用户都在搭什么。",
      intro:
        "Alpha 自带四个参考 Agent——每一个都是完整的 SoyaPack，可直接运行、fork、或当作灵感来源阅读。",
      allRepos: "全部参考仓库 →",
      referenceRepo: "参考仓库",
      list: [
        {
          persona: "辅导孩子写作文的家长",
          aha: "丢一篇范文 + 一个题目，打印出一份 A4 写作指南，孩子真的能跟着写。",
        },
        {
          persona: "盯一条新闻线的知识工作者",
          aha: "中文输入「关注欧盟 USB-C 政策」——每天早上 9 点钉钉收到一张长图日报。",
        },
        {
          persona: "做房产自媒体的运营",
          aha: "一句话进 → 500 行 Excel 出；每一行都有一个「出图文 / 出短视频」按钮，按下就出。",
        },
        {
          persona: "独立短视频创作者",
          aha: "自然语言写需求 → Remotion 时间轴 → Comet 渲染 MP4 → 一夜之间落到你的 NAS。",
        },
      ],
    },
    why: {
      eyebrow: "为什么选 SoyaOS",
      title: "厨房思路，不是实验室。",
      intro:
        "三条底线，alpha 周迭代也绝不让步。",
      list: [
        {
          title: "一份二进制，六种版本",
          body: "从笔记本上的 Solo 到企业内网的 Enterprise，同一个内核、同一份 SoyaPack 清单格式，只是部署形态不同。规模上去了，不需要重写。",
        },
        {
          title: "OpenAI 兼容，进出都兼容",
          body: "用任意 OpenAI SDK 跟 SoyaOS 对话；SoyaOS 也用 OpenAI 协议跟上游对话。自带 LLM——Claude、GPT、Qwen、本地 Ollama——随时切换。",
        },
        {
          title: "MIT 开源，默认 fail-closed",
          body: "能力 token、签名 SoyaPack、SoyaScope 里的端到端审计链。零遥测、不回家——除非你明说，否则你的 Agent 一直在你自己的硬件上。",
        },
      ],
    },
    closing: {
      eyebrow: "准备好就上",
      title: "三种节点角色。一份二进制。你的硬件。",
      body: "Planet（控制面）· Moon（界面 / 边缘）· Comet（工作节点）。从笔记本上同时跑三种开始，随增长自然拆分。",
      ctaDownload: "下载 v0.1",
      ctaEditions: "查看版本",
    },
  },

  editions: {
    hero: {
      pill: "部署形态",
      title: "六种版本。同一个内核。",
      subtitleParts: {
        lead: "所谓",
        em: "版本",
        tail:
          "并不是不同的产品——只是 Planet（控制面）、Moon（界面 / 边缘）、Comet（工作节点）跑在哪里、由谁来运维而已。变的只有一个 CLI 参数。",
      },
      codeComment: "# 或 cluster | cloud | hybrid | ...",
    },
    table: {
      colEdition: "版本",
      colCli: "CLI",
      colPersona: "适用人群",
      colCost: "典型成本",
      colStatus: "状态",
      badgeAlpha: "alpha 在用",
      badgePlanned: "规划中",
    },
    detail: {
      eyebrow: "各组件在哪里",
      title: "每个版本的控制面 vs. 数据面。",
      intro:
        "同一份二进制，六个拆分点。唯一可调的旋钮：「你自己运维」与「我们替你运维」的边界画在哪里。",
      controlPlane: "控制面",
      dataPlane: "数据面",
    },
    list: [
      {
        persona: "一个开发者，一台笔记本。",
        cost: "免费 · 你的硬件",
        controlPlane: "进程内",
        dataPlane: "进程内",
        description:
          "Planet、Moon、Comet 折叠成机器上的一个进程。无注册中心、无鉴权、无网络面——感受 SoyaOS 最快的方式。",
      },
      {
        persona: "一个团队 + 一台 VPS + 内网设备。",
        cost: "约 $0.10 / Comet·小时（估）",
        controlPlane: "VPS 上自托管 Planet",
        dataPlane: "局域网 / VPC 内自托管 Comet",
        description:
          "你自己跑一个 Planet，按需扩 Comet。共享组织 token 做鉴权，清单仓库放你自己的 S3 兼容存储。创业工程团队的默认形态。",
      },
      {
        persona: "注册账号、拿 API Key，开干。",
        cost: "按 token + 按 Comet·秒",
        controlPlane: "soyaos.ai 托管 Planet",
        dataPlane: "soyaos.ai 托管 Comet",
        description:
          "Planet 和 Comet 都由我们运维，你只持有 API Key。随时切到自己的 BYOK 模型 Key，从此只为算力付费、不再为推理付费。",
      },
      {
        persona: "SaaS Planet，你自己的 Moon。",
        cost: "按 token（只算控制面）",
        controlPlane: "soyaos.ai 托管 Planet",
        dataPlane: "你 VPC / 自有机房里的 Comet",
        description:
          "编排托管在云端，工作负载留在你的边界内。适合数据出不去、但又不想自己运维控制面的场景。",
      },
      {
        persona: "多租户 SaaS，带 SSO 与 SLA。",
        cost: "联系我们",
        controlPlane: "独占 Planet（按 region 绑定）",
        dataPlane: "独占 Comet 池",
        description:
          "独占 region、SSO/SAML、SOC 2 合规、签名审计日志导出。和 Solo 同一个内核——区别只在运维。",
      },
      {
        persona: "本地化或物理隔离网络。",
        cost: "年度授权",
        controlPlane: "客户自运维 Planet",
        dataPlane: "客户自运维 Comet",
        description:
          "同一份二进制部署进封闭网络。通过签名离线升级包更新。在出网默认拒绝的银行、实验室环境里验证过。",
      },
    ],
    closing: {
      title: "不确定哪个适合？",
      bodyParts: {
        lead: "先用 ",
        solo: "solo",
        mid: " 起步。等到笔记本风扇响起来，升级到 ",
        cluster: "cluster",
        tail: "。其余都是同一个内核。",
      },
      cta: "下载 v0.1",
    },
  },

  pricing: {
    hero: {
      pill: "定价",
      title: "Alpha 期间对所有人免费。",
      subtitle:
        "SoyaOS 是 MIT 开源软件。我们暂未运营托管云，所以没有计量、没有 Key、没有套餐可选。",
    },
    banner: {
      eyebrow: "Alpha",
      title: "免费。核心永久 MIT。绝不回家。",
      body: "你想跑多少个 Solo 实例就跑多少个，想放在多少台机器上就放多少台。零遥测、无用量上限、无需注册。唯一的上限是你的硬件。",
      bullets: [
        "MIT 开源——可 fork、可嵌入、可转售。",
        "零遥测、零分析、零远程配置。",
        "自带 LLM Key——Claude / GPT / Qwen / Ollama。",
        "签名 SoyaPack、能力 token、审计链路。",
      ],
      ctaDownload: "下载 v0.1",
      ctaSource: "GitHub 源码",
    },
    future: {
      eyebrow: "未来的商业化",
      title: "GA 之后的计划。",
      intro:
        "下面这些目前都还没上线、没计费。先把意图发出来，方便日后对照我们实际落地的版本。",
      futureLabel: "Future",
      list: [
        {
          title: "Cloud 版本",
          body: "按 token + 按秒沙箱（gpu·s / vcpu·s）——一个透明的云 LLM 提供方。随时切到自己的 BYOK Key，从此只为我们实际调度的算力付费、不再为推理付费。",
        },
        {
          title: "Enterprise",
          body: "按席位年付 + 独占 region + SSO/SAML + SOC 2。签名审计日志导出、离线升级包、带响应时长 SLA 的支持合同。",
        },
        {
          title: "核心内核 + SoyaPack + CLI",
          body: "永远 MIT。这套格式永远不会有付费层——一旦付费，「可移植 Agent」的承诺就从尝试商业化那天起破灭了。",
        },
        {
          title: "Forge 与 Studio",
          body: "Forge（Agent 工厂）与 Studio（本地界面）均为 MIT 开源，与内核打在同一份二进制里。一起 ship、一起版本号。",
        },
      ],
    },
    faq: {
      items: [
        {
          question: "MIT 核心未来会出付费层吗？",
          answer:
            "不会。内核、SoyaPack 清单格式、CLI、Forge、Studio 永远 MIT。付费层只会挂在「我们替你运维」的操作上——永远不会挂在格式或二进制本身上。",
        },
        {
          question: "今天就用 SoyaOS 上商用，可以吗？",
          answerBeforeLink:
            "可以——MIT 就是可以。Alpha 标签指的是 API 稳定性，不是法律限制。直接 ship 即可；只是请锁定 release 版本，升级前读一下 ",
          linkLabel: "CHANGELOG",
          answerAfterLink: "。",
          answer: "",
        },
      ],
    },
  },

  docs: {
    indexTitle: "文档",
    indexIntro:
      "跑通第一个 SoyaOS Agent 所需的全部信息。五篇参考文档覆盖：安装、三种节点角色、SoyaPack 清单、v0 CLI。",
    indexCtaQuickstart: "从快速上手开始",
    searchPlaceholder: "搜索文档……",
    searchLabel: "搜索",
    searchEmpty: "没有命中。",
    onThisPage: "本页内容",
    previous: "上一篇",
    next: "下一篇",
    editOnGitHub: "在 GitHub 上编辑本页",
    sidebarCategories: {
      "getting-started": "入门",
      concepts: "概念",
      guides: "实战",
      reference: "参考",
    },
  },
} satisfies Dictionary;
