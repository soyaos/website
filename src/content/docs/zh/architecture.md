---
title: 架构
description: Planet、Moon、Comet——组成每一种 SoyaOS 部署的三种节点角色。
order: 3
category: getting-started
---

SoyaOS 是一份能扮演三种角色的二进制。部署，无非是这三种角色组成的某一种形态。无论你是在笔记本上跑 `solo` 还是在封闭机房里跑 `enterprise-private`，角色边界和角色间协议永远不变——变的只有拓扑。

## 三种节点角色

### Comet

**Comet** 是短生命周期的工作节点。它跑一次 Agent 调用、把输出流式吐出来，然后退出。Comet 是无状态的——从 Moon 拉取 SoyaPack 包、挂载沙箱化的 `/workdir`，过程中持续发出 Scope 事件。

> 心智模型：Comet 就是为一次 Agent 运行准备的、被严格塑形的 `kubectl exec`。

Comet 具体做的事：

- 通过出网 HTTPS WebSocket 订阅一个 Moon，等任务。
- 把 SoyaPack 物化到临时目录，校验签名，能力白名单在本机不可满足时直接拒绝运行。
- 通过同一个 WebSocket 把 stdout 和 Scope 事件回流。
- 超过 `idle_timeout`（默认 300s）或 `max_runs`（默认无限）后自动退出。

### Moon

**Moon** 是单租户的控制面。它承载开发者和用户对话的 API 表面、托管 SoyaPack 仓库、签发 API Key、转发 Scope 事件。Moon **不自己**跑 Agent——它把任务派发给 Comet。

> 心智模型：Moon 是「团队工作区」。一家公司 / 一个工作室 / 一户人家配一个。

Moon 内部组件：

- OpenAI 兼容端点（`/v1/chat/completions`）——接收 `model: "soya:*"` 请求，解析到具体 SoyaPack 版本，挑一个 Comet，返回流式响应。
- SoyaPack 仓库——版本化、内容寻址的包，后端是 S3 兼容对象存储。
- 鉴权表面——签发 API Key 和能力 token；push 时校验包签名。
- Scope broker——把每次运行的事件多路复用给订阅者（Studio、开发者门户、webhook）。

### Planet

**Planet** 是联邦根。它持有身份（你是谁）、计费（如有）、跨 Moon 路由。在 `solo` 部署里没有独立 Planet——Planet、Moon、Comet 折叠到一个进程。

> 心智模型：Planet 是「星座运营方」。单租户部署可选不用。

Planet 的职责：

- **身份**——用户和 Moon 的 OIDC 颁发方；签 SSO 断言。
- **路由**——把租户 URL（`tenant.moon.example.com`）映射到具体的 Moon。
- **跨 Moon 合约**——唯一有权授权某个 SoyaPack 在源租户之外的 Moon 上运行的实体。

## 一次请求是怎么流动的

<figure class="not-prose my-8">
<svg viewBox="0 0 760 620" role="img" aria-labelledby="archflow-title archflow-desc" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-3xl mx-auto block">
  <title id="archflow-title">SoyaOS 一次请求流</title>
  <desc id="archflow-desc">客户端 SDK 通过 OpenAI 兼容 HTTPS 调用 Moon；Moon 把租户 URL 经由 Planet（联邦根，solo 里可省略）解析后，挑一个热 Comet 执行，Comet 调用上游 LLM，Scope 事件经 Moon WebSocket 回流到 Studio、开发者门户、webhook。</desc>
  <defs>
    <marker id="archflow-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#a6781c"></path>
    </marker>
  </defs>
  <rect x="0" y="0" width="760" height="620" rx="16" fill="#f8f5ec" stroke="#2b2419" stroke-opacity="0.08"></rect>
  <g>
    <rect x="290" y="30" width="180" height="80" rx="12" fill="#ffffff" stroke="#2b2419" stroke-opacity="0.18"></rect>
    <text x="380" y="60" text-anchor="middle" font-weight="600" font-size="16" fill="#2b2419">Planet</text>
    <text x="380" y="86" text-anchor="middle" font-size="12" fill="#6b6051">身份 · 路由 · 计费</text>
    <text x="488" y="58" font-size="11" fill="#a6781c" font-style="italic">联邦根</text>
    <text x="488" y="74" font-size="11" fill="#a6781c" font-style="italic">solo 可省略</text>
  </g>
  <g>
    <line x1="380" y1="110" x2="380" y2="167" stroke="#a6781c" stroke-width="1.5" marker-end="url(#archflow-arrow)"></line>
    <text x="392" y="142" font-size="11" fill="#6b6051">解析租户 URL</text>
  </g>
  <g>
    <rect x="260" y="170" width="240" height="130" rx="12" fill="#ffffff" stroke="#2b2419" stroke-opacity="0.18"></rect>
    <text x="380" y="200" text-anchor="middle" font-weight="600" font-size="16" fill="#2b2419">Moon</text>
    <text x="380" y="226" text-anchor="middle" font-size="12" fill="#6b6051">/v1/chat/completions</text>
    <text x="380" y="248" text-anchor="middle" font-size="12" fill="#6b6051">SoyaPack 仓库</text>
    <text x="380" y="270" text-anchor="middle" font-size="12" fill="#6b6051">Scope broker</text>
  </g>
  <g>
    <text x="30" y="220" font-size="12" font-weight="600" fill="#2b2419">客户端 SDK</text>
    <text x="30" y="238" font-size="11" fill="#6b6051">OpenAI 兼容 · HTTPS</text>
    <line x1="148" y1="232" x2="257" y2="232" stroke="#a6781c" stroke-width="1.5" marker-end="url(#archflow-arrow)"></line>
  </g>
  <g>
    <polyline points="380,300 380,338 290,338 290,377" fill="none" stroke="#a6781c" stroke-width="1.5" marker-end="url(#archflow-arrow)"></polyline>
    <text x="298" y="332" font-size="11" fill="#6b6051">挑一个热 Comet（或冷启）</text>
  </g>
  <g>
    <rect x="180" y="380" width="220" height="100" rx="12" fill="#ffffff" stroke="#2b2419" stroke-opacity="0.18"></rect>
    <text x="290" y="410" text-anchor="middle" font-weight="600" font-size="16" fill="#2b2419">Comet</text>
    <text x="290" y="434" text-anchor="middle" font-size="12" fill="#6b6051">沙箱 /workdir</text>
    <text x="290" y="456" text-anchor="middle" font-size="12" fill="#6b6051">能力白名单</text>
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
    <text x="302" y="512" font-size="11" fill="#6b6051">Scope 事件 · 经 Moon WebSocket 回流</text>
  </g>
  <text x="290" y="572" text-anchor="middle" font-size="13" fill="#2b2419" font-weight="500">Studio · 开发者门户 · webhook</text>
</svg>
<figcaption class="mt-2 text-center text-[12px] italic text-soya-mute">一次 SoyaOS 请求的流动。</figcaption>
</figure>

1. 客户端调用 Moon 上的 OpenAI 兼容端点：`POST /v1/chat/completions`，`model: "soya:compo"`。
2. Moon 把 `soya:compo` 解析到具体 SoyaPack 版本（如 `soya:compo@1.4.0`），挑一个热 Comet（或冷启）。
3. Comet 在沙箱里执行 Agent，按能力白名单调上游 LLM，把 Scope 事件经 Moon 回流。
4. Moon 把事件多路复用给订阅者（Studio、开发者门户、webhook）。
5. Agent 完成后，Comet 发出最终产物 JSON，自动退出（或按 `idle_timeout` 回到热池）。

## 一次实际的事件轨迹

一次 `soya:compo` 调用的 Scope 事件流大致是：

```
00.000 run_started        run_id=run_018f… pack=soya:compo@1.4.0 comet=cmt-a3
00.012 stage_started      stage=outline
00.087 tool_called        tool=fetch_reference  args={url:…}        # 能力检查：egress.host
00.412 tool_completed     tool=fetch_reference  ok=true
00.514 llm_request        upstream=claude-sonnet-4-6  prompt_tokens=1842
01.823 llm_response       completion_tokens=612
01.834 stage_completed    stage=outline  artifacts=[outline.v1]
01.835 stage_started      stage=writer
…
04.219 run_completed      ok=true  artifacts=[outline.v1, guide.v1]
```

每条事件都是 JSON，envelope 一致（`run_id`、`ts`、`kind`），且都由 Comet 的运行 Key 签名——详见 [Scope 事件与可观测性](./scope-events.md)。

## 为什么这样切？

- **扩缩形态**：Comet 是牛群，Moon 是宠物，Planet 是接近宠物的存在。一个 Moon 后面可以挂百万 Comet。Moon 单实例垂直扩展到约 1 万并发；再往上就按租户分片到多个 Moon。
- **安全**：每个 Agent 都跑在 Comet 的能力白名单里；Moon 永远不执行用户代码。被攻破的 Comet 拿不到 Moon 的秘密——Comet 只见到自己那条短期运行 Key。
- **联邦**：多个 Moon 可以挂在同一个 Planet 下，也可以在 `enterprise-cloud` 部署里向多个 Planet 汇聚。Planet 故障不会把 Moon 拖下水——Moon 缓存身份证书，直到证书过期前一直能继续服务。

## 角色到版本的映射

| 版本             | Comet 跑在哪里         | Moon 跑在哪里        | Planet 跑在哪里         |
| ---------------- | ---------------------- | -------------------- | ----------------------- |
| `solo`           | 进程内                 | 进程内               | 无（折叠掉）            |
| `cluster`        | 你的 LAN / VPC         | 你的 VPS             | 无 或 你的 VPS          |
| `cloud`          | soyaos.ai              | soyaos.ai            | soyaos.ai               |
| `hybrid`         | 你的 VPC               | soyaos.ai            | soyaos.ai               |
| `ent-cloud`      | soyaos.ai（独占）      | soyaos.ai（独占）    | soyaos.ai（region 绑定）|
| `ent-private`    | 客户自运维             | 客户自运维           | 客户自运维              |

完整矩阵见[版本](./editions.md)；Comet 能做什么、不能做什么见[能力与沙箱](./capabilities-sandbox.md)。
