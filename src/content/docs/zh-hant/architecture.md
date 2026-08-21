---
title: 架構
description: Planet、Moon、Comet——組成每一種 SoyaOS 部署的三種節點角色。
order: 3
category: getting-started
---

SoyaOS 是一份能扮演三種角色的二進位。部署,不過是這三種角色組成的某一種型態。無論你是在筆電上跑 `solo` 還是在封閉機房裡跑 `enterprise-private`,角色邊界和角色間協議永遠不變——變的只有拓樸。

## 三種節點角色

### Comet

**Comet** 是短生命週期的工作節點。它跑一次 Agent 呼叫、把輸出串流出來,然後退出。Comet 是無狀態的——從 Moon 拉取 SoyaPack 套件、掛載沙箱化的 `/workdir`,過程中持續發出 Scope 事件。

> 心智模型:Comet 就是為一次 Agent 執行準備的、被嚴格塑形的 `kubectl exec`。

Comet 具體做的事:

- 透過出網 HTTPS WebSocket 訂閱一個 Moon,等任務。
- 把 SoyaPack 具現化到暫存目錄,驗證簽名,能力白名單在本機不可滿足時直接拒絕執行。
- 透過同一個 WebSocket 把 stdout 與 Scope 事件回流。
- 超過 `idle_timeout`(預設 300s)或 `max_runs`(預設無限)後自動退出。

### Moon

**Moon** 是單租戶的控制面。它承載開發者和使用者對話的 API 表面、託管 SoyaPack 倉庫、簽發 API Key、轉發 Scope 事件。Moon **不自己**跑 Agent——它把任務派發給 Comet。

> 心智模型:Moon 是「團隊工作區」。一家公司 / 一個工作室 / 一戶人家配一個。

Moon 內部元件:

- OpenAI 相容端點(`/v1/chat/completions`)——接收 `model: "soya:*"` 請求,解析到具體 SoyaPack 版本,挑一個 Comet,回傳串流回應。
- SoyaPack 倉庫——版本化、內容定址的套件,後端是 S3 相容物件儲存。
- 鑑權表面——簽發 API Key 與能力 token;push 時校驗套件簽名。
- Scope broker——把每次執行的事件多工給訂閱者(Studio、開發者門戶、webhook)。

### Planet

**Planet** 是聯邦根。它持有身分(你是誰)、計費(若有)、跨 Moon 路由。在 `solo` 部署裡沒有獨立 Planet——Planet、Moon、Comet 摺疊到一個行程。

> 心智模型:Planet 是「星座運營方」。單租戶部署可選不用。

Planet 的職責:

- **身分**——使用者與 Moon 的 OIDC 簽發方;簽 SSO assertion。
- **路由**——把租戶 URL(`tenant.moon.example.com`)對應到具體的 Moon。
- **跨 Moon 合約**——唯一有權授權某個 SoyaPack 在源租戶之外的 Moon 上執行的實體。

## 一次請求是怎麼流動的

<figure class="not-prose my-8">
<svg viewBox="0 0 760 620" role="img" aria-labelledby="archflow-title archflow-desc" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-3xl mx-auto block">
  <title id="archflow-title">SoyaOS 一次請求流</title>
  <desc id="archflow-desc">客戶端 SDK 透過 OpenAI 相容 HTTPS 呼叫 Moon;Moon 把租戶 URL 經由 Planet(聯邦根,solo 裡可省略)解析後,挑一個熱 Comet 執行,Comet 呼叫上游 LLM,Scope 事件經 Moon WebSocket 回流到 Studio、開發者門戶、webhook。</desc>
  <defs>
    <marker id="archflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#a6781c"></path>
    </marker>
  </defs>
  <rect x="0" y="0" width="760" height="620" rx="16" fill="#f8f5ec" stroke="#2b2419" stroke-opacity="0.08"></rect>
  <g>
    <rect x="290" y="30" width="180" height="80" rx="12" fill="#ffffff" stroke="#2b2419" stroke-opacity="0.18"></rect>
    <text x="380" y="60" text-anchor="middle" font-weight="600" font-size="16" fill="#2b2419">Planet</text>
    <text x="380" y="86" text-anchor="middle" font-size="12" fill="#6b6051">身分 · 路由 · 計費</text>
    <text x="488" y="58" font-size="11" fill="#a6781c" font-style="italic">聯邦根</text>
    <text x="488" y="74" font-size="11" fill="#a6781c" font-style="italic">solo 可省略</text>
  </g>
  <g>
    <line x1="380" y1="110" x2="380" y2="167" stroke="#a6781c" stroke-width="1.5" marker-end="url(#archflow-arrow)"></line>
    <text x="392" y="142" font-size="11" fill="#6b6051">解析租戶 URL</text>
  </g>
  <g>
    <rect x="260" y="170" width="240" height="130" rx="12" fill="#ffffff" stroke="#2b2419" stroke-opacity="0.18"></rect>
    <text x="380" y="200" text-anchor="middle" font-weight="600" font-size="16" fill="#2b2419">Moon</text>
    <text x="380" y="226" text-anchor="middle" font-size="12" fill="#6b6051">/v1/chat/completions</text>
    <text x="380" y="248" text-anchor="middle" font-size="12" fill="#6b6051">SoyaPack 倉庫</text>
    <text x="380" y="270" text-anchor="middle" font-size="12" fill="#6b6051">Scope broker</text>
  </g>
  <g>
    <text x="30" y="220" font-size="12" font-weight="600" fill="#2b2419">客戶端 SDK</text>
    <text x="30" y="238" font-size="11" fill="#6b6051">OpenAI 相容 · HTTPS</text>
    <line x1="148" y1="232" x2="257" y2="232" stroke="#a6781c" stroke-width="1.5" marker-end="url(#archflow-arrow)"></line>
  </g>
  <g>
    <polyline points="380,300 380,338 290,338 290,377" fill="none" stroke="#a6781c" stroke-width="1.5" marker-end="url(#archflow-arrow)"></polyline>
    <text x="298" y="332" font-size="11" fill="#6b6051">挑一個熱 Comet(或冷啟)</text>
  </g>
  <g>
    <rect x="180" y="380" width="220" height="100" rx="12" fill="#ffffff" stroke="#2b2419" stroke-opacity="0.18"></rect>
    <text x="290" y="410" text-anchor="middle" font-weight="600" font-size="16" fill="#2b2419">Comet</text>
    <text x="290" y="434" text-anchor="middle" font-size="12" fill="#6b6051">沙箱 /workdir</text>
    <text x="290" y="456" text-anchor="middle" font-size="12" fill="#6b6051">能力白名單</text>
  </g>
  <g>
    <rect x="440" y="380" width="220" height="100" rx="12" fill="#ffffff" stroke="#2b2419" stroke-opacity="0.18"></rect>
    <text x="550" y="410" text-anchor="middle" font-weight="600" font-size="16" fill="#2b2419">上游 LLM</text>
    <text x="550" y="434" text-anchor="middle" font-size="12" fill="#6b6051">Claude · GPT</text>
    <text x="550" y="456" text-anchor="middle" font-size="12" fill="#6b6051">Qwen · Ollama</text>
  </g>
  <g>
    <line x1="403" y1="430" x2="437" y2="430" stroke="#a6781c" stroke-width="1.5" marker-start="url(#archflow-arrow)" marker-end="url(#archflow-arrow)"></line>
  </g>
  <g>
    <line x1="290" y1="482" x2="290" y2="540" stroke="#a6781c" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#archflow-arrow)"></line>
    <text x="302" y="512" font-size="11" fill="#6b6051">Scope 事件 · 經 Moon WebSocket 回流</text>
  </g>
  <text x="290" y="572" text-anchor="middle" font-size="13" fill="#2b2419" font-weight="500">Studio · 開發者門戶 · webhook</text>
</svg>
<figcaption class="mt-2 text-center text-[12px] italic text-soya-mute">一次 SoyaOS 請求的流動。</figcaption>
</figure>

1. 客戶端呼叫 Moon 上的 OpenAI 相容端點:`POST /v1/chat/completions`,`model: "soya:compo"`。
2. Moon 把 `soya:compo` 解析到具體 SoyaPack 版本(如 `soya:compo@1.4.0`),挑一個熱 Comet(或冷啟)。
3. Comet 在沙箱裡執行 Agent,依能力白名單呼叫上游 LLM,把 Scope 事件經 Moon 回流。
4. Moon 把事件多工給訂閱者(Studio、開發者門戶、webhook)。
5. Agent 完成後,Comet 發出最終產物 JSON,自動退出(或依 `idle_timeout` 回熱池)。

## 一次實際的事件軌跡

一次 `soya:compo` 呼叫的 Scope 事件流大致是:

```
00.000 run_started        run_id=run_018f… pack=soya:compo@1.4.0 comet=cmt-a3
00.012 stage_started      stage=outline
00.087 tool_called        tool=fetch_reference  args={url:…}        # 能力檢查:egress.host
00.412 tool_completed     tool=fetch_reference  ok=true
00.514 llm_request        upstream=claude-sonnet-4-6  prompt_tokens=1842
01.823 llm_response       completion_tokens=612
01.834 stage_completed    stage=outline  artifacts=[outline.v1]
01.835 stage_started      stage=writer
…
04.219 run_completed      ok=true  artifacts=[outline.v1, guide.v1]
```

每條事件都是 JSON,envelope 一致(`run_id`、`ts`、`kind`),且都由 Comet 的執行 Key 簽名——詳見 [Scope 事件與可觀測性](./scope-events.md)。

## 為什麼這樣切?

- **擴縮型態**:Comet 是牛群,Moon 是寵物,Planet 是接近寵物的存在。一個 Moon 後面可以掛百萬 Comet。Moon 單實例垂直擴展到約 1 萬並發;再往上就按租戶分片到多個 Moon。
- **安全**:每個 Agent 都跑在 Comet 的能力白名單裡;Moon 永遠不執行使用者程式碼。被攻破的 Comet 拿不到 Moon 的祕密——Comet 只看到自己那條短期執行 Key。
- **聯邦**:多個 Moon 可以掛在同一個 Planet 之下,也可以在 `enterprise-cloud` 部署裡向多個 Planet 匯聚。Planet 故障不會把 Moon 拖下水——Moon 快取身分憑證,在憑證過期前持續服務。

## 角色到版本的對應

| 版本             | Comet 跑在哪裡         | Moon 跑在哪裡        | Planet 跑在哪裡         |
| ---------------- | ---------------------- | -------------------- | ----------------------- |
| `solo`           | 行程內                 | 行程內               | 無(摺疊掉)              |
| `cluster`        | 你的 LAN / VPC         | 你的 VPS             | 無 或 你的 VPS          |
| `cloud`          | soyaos.ai              | soyaos.ai            | soyaos.ai               |
| `hybrid`         | 你的 VPC               | soyaos.ai            | soyaos.ai               |
| `ent-cloud`      | soyaos.ai(獨佔)        | soyaos.ai(獨佔)      | soyaos.ai(region 綁定)  |
| `ent-private`    | 客戶自管               | 客戶自管             | 客戶自管                |

完整矩陣見[版本](./editions.md);Comet 能做什麼、不能做什麼見[能力與沙箱](./capabilities-sandbox.md)。
