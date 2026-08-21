import type { Dictionary } from "./types";

export const zhHant = {
  meta: {
    siteTitle: "SoyaOS — Agent 作業系統",
    homeTitle: "SoyaOS — Agent 作業系統",
    homeDescription:
      "一份二進位、六種版本、三種節點角色。SoyaOS 不擋你的路：自帶模型、把任何 Agent 部署成 OpenAI 相容模型。",
    editionsTitle: "版本 · SoyaOS",
    editionsDescription:
      "SoyaOS 同一份二進位、六種部署型態——Solo、Cluster、Cloud、Hybrid、Enterprise Cloud、Enterprise Private。先挑現在合適的,未來切換不必重寫。",
    pricingTitle: "定價 · SoyaOS",
    pricingDescription:
      "Solo 永遠 MIT 開源；Cloud v0.2.0 目前免費並設有每日額度。付費方案、計量和帳單尚未上線。",
    docsTitle: "文件 · SoyaOS",
  },

  common: {
    nav: {
      editions: "版本",
      pricing: "定價",
      docs: "文件",
      github: "GitHub",
      alpha: "alpha",
    },
    footer: {
      tagline: "Agent OS · MIT 開源",
      editions: "版本",
      pricing: "定價",
      docs: "文件",
      github: "GitHub",
      license: "LICENSE",
      discordSoon: "Discord(即將)",
      copyright: "© 2026 SoyaOS Contributors",
    },
    localeSwitcher: {
      label: "語言",
    },
  },

  home: {
    hero: {
      pill: "公開 alpha · v0.1",
      titleLine1: "Agent 作業系統 —",
      titleLine2: "一份二進位、六種版本、三種節點角色。",
      subtitle:
        "SoyaOS 不擋你的路。自帶任何 LLM。把任何 Agent 部署成 OpenAI 相容模型——本地、叢集,或代管。",
      ctaPrimary: "下載二進位",
      ctaSecondary: "閱讀規範",
      platforms: "MIT 開源 · 零遙測 · 支援 macOS / Linux / Windows",
    },
    quickstart: {
      label: "60 秒上手",
      pathLabel: "~/projects",
      comment1: "# 把 127.0.0.1:7474/v1 貼到 Cherry Studio 即可。",
      comment2: "# 完成。",
      caption:
        "一個行程,在 /v1/chat/completions 上講 OpenAI 協議;載入一個 SoyaPack、排程一個 Comet、連到你選的模型。",
    },
    stories: {
      eyebrow: "四個旗艦案例",
      title: "使用者都在做什麼。",
      intro:
        "Alpha 自帶四個參考 Agent——每一個都是完整的 SoyaPack,可直接執行、fork、或拿來當靈感閱讀。",
      allRepos: "全部參考儲存庫 →",
      referenceRepo: "參考儲存庫",
      list: [
        {
          persona: "輔導孩子寫作文的家長",
          aha: "丟一篇範文 + 一個題目,印出一份 A4 寫作指南,孩子真的能照著寫。",
        },
        {
          persona: "盯一條新聞線的知識工作者",
          aha: "中文輸入「關注歐盟 USB-C 政策」——每天早上 9 點在通訊軟體收到一張長圖日報。",
        },
        {
          persona: "做房產自媒體的營運",
          aha: "一句話進 → 500 列 Excel 出;每一列都有「出圖文 / 出短影片」按鈕,按下就出。",
        },
        {
          persona: "獨立短影片創作者",
          aha: "自然語言寫需求 → Remotion 時間軸 → Comet 渲染 MP4 → 一夜之間落到你的 NAS。",
        },
      ],
    },
    why: {
      eyebrow: "為什麼選 SoyaOS",
      title: "用廚房的思路,不是實驗室。",
      intro:
        "三條底線,即使 alpha 週週迭代也不讓步。",
      list: [
        {
          title: "一份二進位、六種版本",
          body: "從筆電上的 Solo 到企業內網的 Enterprise,同一個核心、同一份 SoyaPack 清單格式,只是部署型態不同。規模上去了,不必重寫。",
        },
        {
          title: "OpenAI 相容,進出都相容",
          body: "用任何 OpenAI SDK 跟 SoyaOS 對話;SoyaOS 也用 OpenAI 協議跟上游對話。自帶 LLM——Claude、GPT、Qwen、本地 Ollama——隨時切換。",
        },
        {
          title: "MIT 開源,預設 fail-closed",
          body: "能力 token、簽名 SoyaPack、SoyaScope 裡的端對端稽核鏈。零遙測、不回呼——除非你明說,否則你的 Agent 一直待在你自己的硬體上。",
        },
      ],
    },
    closing: {
      eyebrow: "準備好就上",
      title: "三種節點角色。一份二進位。你的硬體。",
      body: "Planet(控制面)· Moon(介面 / 邊緣)· Comet(工作節點)。從筆電上同時跑三種開始,隨成長自然拆分。",
      ctaDownload: "下載 v0.1",
      ctaEditions: "查看版本",
    },
  },

  editions: {
    hero: {
      pill: "部署型態",
      title: "六種版本。同一個核心。",
      subtitleParts: {
        lead: "所謂",
        em: "版本",
        tail:
          "描述控制面與工作負載跑在哪裡、由誰維運。Solo 使用本機二進位；Cloud v0.2.0 透過代管入口網站和 API 使用。",
      },
      codeComment: "# 本機 Solo 入口",
    },
    table: {
      colEdition: "版本",
      colCli: "入口",
      colPersona: "適用對象",
      colCost: "典型成本",
      colStatus: "狀態",
      badgeAlpha: "alpha 在用",
      badgeStable: "Stable v0.2.0",
      badgePlanned: "規劃中",
    },
    detail: {
      eyebrow: "各元件在哪裡",
      title: "每個版本的控制面 vs. 資料面。",
      intro:
        "Solo 與 Cloud 已可使用；其餘型態仍是路線圖。Cloud v0.2.0 是受控文字 Agent 服務，不等同於完整 Cloud 終態架構。",
      controlPlane: "控制面",
      dataPlane: "資料面",
    },
    list: [
      {
        persona: "一個開發者,一台筆電。",
        cost: "免費 · 你的硬體",
        controlPlane: "行程內",
        dataPlane: "行程內",
        description:
          "Planet、Moon、Comet 摺疊成機器上的單一行程。無註冊中心、無認證、無網路面——感受 SoyaOS 最快的方式。",
      },
      {
        persona: "一個團隊 + 一台 VPS + 內網裝置。",
        cost: "約 $0.10 / Comet·小時(估)",
        controlPlane: "VPS 上自管 Planet",
        dataPlane: "區域網路 / VPC 內自管 Comet",
        description:
          "你自己跑一個 Planet,按需求擴 Comet。共享組織 token 做認證,清單倉庫放你自己的 S3 相容儲存。新創工程團隊的預設型態。",
      },
      {
        persona: "註冊帳號、拿 API Key、開工。",
        cost: "目前免費 · 有每日額度",
        controlPlane: "SoyaOS 代管個人租戶與 API Key",
        dataPlane: "平台審核的代管文字 Agent",
        description:
          "Stable v0.2.0：使用 GitHub 登入、建立 API Key，透過 OpenAI 相容 API 呼叫 soya:starter，並查看 24 小時 Trace 中繼資料。目前免費、單區、best-effort、無 SLA。",
      },
      {
        persona: "SaaS Planet,你自己的 Moon。",
        cost: "按 token(只算控制面)",
        controlPlane: "soyaos.ai 代管 Planet",
        dataPlane: "你 VPC / 自有機房裡的 Comet",
        description:
          "編排代管於雲端,工作負載留在你的邊界內。適合資料出不去、但又不想自己維運控制面的情境。",
      },
      {
        persona: "多租戶 SaaS,含 SSO 與 SLA。",
        cost: "聯絡我們",
        controlPlane: "獨佔 Planet(依 region 綁定)",
        dataPlane: "獨佔 Comet 池",
        description:
          "獨佔 region、SSO/SAML、SOC 2 合規、簽名稽核日誌匯出。和 Solo 同一個核心——差別只在維運。",
      },
      {
        persona: "本地化或實體隔離網路。",
        cost: "年度授權",
        controlPlane: "客戶自管 Planet",
        dataPlane: "客戶自管 Comet",
        description:
          "同一份二進位部署進封閉網路。透過簽名離線升級包更新。已在出網預設拒絕的銀行、實驗室環境裡驗證過。",
      },
    ],
    closing: {
      title: "不確定哪個合適?",
      bodyParts: {
        lead: "不想安裝或維運，選擇 ",
        solo: "Cloud",
        mid: "；想完全在自己的電腦上執行，選擇 ",
        cluster: "Solo",
        tail: "。其餘型態仍在規劃中。",
      },
      cta: "Cloud 快速上手",
    },
  },

  pricing: {
    hero: {
      pill: "定價",
      title: "Solo 與 Cloud v0.2.0 目前免費。",
      subtitle:
        "Solo 是 MIT 開源軟體。Cloud 已作為 Stable v0.2.0 運行，使用 API Key 和每日額度，但沒有付費方案、計量帳單或 SLA。",
    },
    banner: {
      eyebrow: "Alpha",
      title: "免費。核心永久 MIT。絕不回呼。",
      body: "想跑幾個 Solo 實例就跑幾個,放在幾台機器上都行。零遙測、無用量上限、無需註冊。唯一的上限是你的硬體。",
      bullets: [
        "MIT 開源——可 fork、可內嵌、可轉售。",
        "零遙測、零分析、零遠端設定。",
        "自帶 LLM Key——Claude / GPT / Qwen / Ollama。",
        "簽名 SoyaPack、能力 token、稽核軌跡。",
      ],
      ctaDownload: "下載 v0.1",
      ctaSource: "GitHub 原始碼",
    },
    future: {
      eyebrow: "未來的商業化",
      title: "GA 之後的計畫。",
      intro:
        "Cloud v0.2.0 已上線且免費；下列付費、BYOK、沙箱與企業能力仍未上線，也尚未開始計費。",
      futureLabel: "Future",
      list: [
        {
          title: "Cloud 未來付費方案",
          body: "計畫按 token 與沙箱秒提供透明計量，並評估 BYOK。它不是 v0.2.0 的目前能力或收費承諾。",
        },
        {
          title: "Enterprise",
          body: "年付席次 + 獨佔 region + SSO/SAML + SOC 2。簽名稽核日誌匯出、離線升級包、含回應時長 SLA 的支援合約。",
        },
        {
          title: "核心 + SoyaPack + CLI",
          body: "永遠 MIT。這套格式永遠不會出付費層——一旦付費,「可攜 Agent」的承諾就從嘗試商業化那天起破滅了。",
        },
        {
          title: "Forge 與 Studio",
          body: "Forge(Agent 工廠)與 Studio(本地介面)均為 MIT 開源,與核心同包在一份二進位裡。同步 ship、同步版號。",
        },
      ],
    },
    faq: {
      items: [
        {
          question: "MIT 核心未來會出付費層嗎?",
          answer:
            "不會。核心、SoyaPack 清單格式、CLI、Forge、Studio 永遠 MIT。付費層只會掛在「我們替你維運」的操作上——永遠不會掛在格式或二進位本身上。",
        },
        {
          question: "現在就用 SoyaOS 商業部署,可以嗎?",
          answerBeforeLink:
            "可以——MIT 就是可以。Alpha 標籤指的是 API 穩定性,不是法律限制。直接 ship 即可;只是請鎖定 release 版號,升級前讀一下 ",
          linkLabel: "CHANGELOG",
          answerAfterLink: "。",
          answer: "",
        },
      ],
    },
  },

  docs: {
    indexTitle: "文件",
    indexIntro:
      "從代管 Cloud 或本機 Solo 跑通第一個 SoyaOS Agent，並繼續了解架構、SoyaPack、API 與 CLI。",
    indexCtaQuickstart: "從快速上手開始",
    searchPlaceholder: "搜尋文件……",
    searchLabel: "搜尋",
    searchEmpty: "沒有命中。",
    onThisPage: "本頁內容",
    previous: "上一篇",
    next: "下一篇",
    editOnGitHub: "在 GitHub 上編輯本頁",
    sidebarCategories: {
      "getting-started": "入門",
      concepts: "概念",
      guides: "實戰",
      reference: "參考",
    },
  },
} satisfies Dictionary;
