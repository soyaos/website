---
title: 虚拟模型与 BYOK
description: soya:* 模型 ID 怎么解析；怎么把自己的 LLM Key 接进来。
order: 2
category: concepts
---

SoyaOS 进来出去都讲 OpenAI 协议。能做到「不把你锁在我们托管基础设施」的关键是**虚拟模型 ID**——`soya:` 开头的名字，在 Moon 处解析到一个 SoyaPack——加上 **BYOK** 路由，让你随时切到自己的上游 LLM Key。

## 什么是 `soya:*`

虚拟模型 ID 就是你客户端调用 Agent 时用的名字：

```bash
curl http://moon.example.com/v1/chat/completions \
  -d '{
    "model": "soya:compo",
    "messages": [{"role": "user", "content": "给一篇关于 X 的文章列大纲"}]
  }'
```

Moon 在请求时通过这条链路解析 `soya:compo`：

```
soya:compo                                    # 客户端发的
  → 仓库里的 soya:compo@*                      # 已发布的最新版本
  → soya:compo@1.4.0                          # 这个租户固定的具体版本
  → SoyaPack 清单                              # 实际运行的代码
  → Comet                                      # 物化它的工作节点
```

客户端也可以直接锁版本：

```json
{ "model": "soya:compo@1.4.0", "messages": [...] }
```

## 为什么把模型名跟 LLM 解耦

三个原因：

1. **一个名字、多种实现。** `soya:compo` 这季度后端是 Claude，下季度可能换成微调的 Qwen。客户端不必知道。
2. **可组合。** Agent 可以按名字调其他 Agent——`soya:reviewer` 在调用过程中调 `soya:fact-checker`——上游 LLM 是各自的实现细节。
3. **BYOK 不动外科。** 切自己的模型 Key 时，Moon 上所有 `soya:*` 模型同时拾起变更，你不用改 27 份客户端配置。

## BYOK——自带 LLM Key

Moon 可配一个或多个**上游模型 profile**。每个 profile 是「发给厂商 X 的请求走哪里」：

```yaml
# moon.config.yaml（片段）
upstreams:
  claude:
    kind: anthropic
    base_url: https://api.anthropic.com
    api_key: ${ANTHROPIC_API_KEY}
  openai:
    kind: openai
    base_url: https://api.openai.com
    api_key: ${OPENAI_API_KEY}
  qwen-local:
    kind: openai-compat
    base_url: http://192.168.1.10:11434/v1   # 局域网的 Ollama
    api_key: ollama
```

SoyaPack 声明自己要哪个上游：

```yaml
# soyapack.yaml（片段）
upstream:
  prefer: claude
  fallback: openai
```

运行时 Comet 在 Moon 的 `upstreams:` 里查 `prefer: claude`，用那个 profile 的 Key 签调用、发出去。`prefer` 目标 5xx 时自动 fallback。

「不再为推理付费给我们」具体做的事，就是把 profile 从 Moon 提供的（我们持 Key）切到你自己的 profile——通常是用自己组织 Key 的 `openai`，或者完全离线时用本地 Ollama。

## 保留名

`soya:` 是唯一保留前缀；其他（`gpt-*`、`claude-*`、`qwen-*`）都被当作**透传**名字。客户端直接发 `model: "claude-sonnet-4-6"` 时，Moon 把它当透明代理通过 `claude` 这个 upstream profile 转发（找不到该 profile 就拒）。这是「Moon 作为透明 LLM 提供方」模式。

## 成本与计量

当一个 `soya:*` 模型解析到一个会调上游的 SoyaPack 时，你在 Moon 的计量页上看到两条成本线：

| 线              | 钱去了哪里                          |
| --------------- | ----------------------------------- |
| **上游 token**  | Anthropic / OpenAI / 你的提供方     |
| **Comet 秒**    | SoyaOS, Inc.（只在云版本）          |

BYOK 后，Moon 账单上的上游线是零（因为你直接付给 Anthropic）。Comet 线还在——那是我们替你实际调度的算力。

## 常见用法

**Region 绑定。** Moon 配置里把 `claude-us` 和 `claude-eu` 定义成两个 upstream profile；SoyaPack 写 `prefer: claude-us`，或者从输入里读用户的 region。同一个 `soya:*` 名字、不同的物理目的地。

**Local-first 开发。** 跑一个本地 Ollama，加一个 `local` upstream 指过去；`prefer: local, fallback: claude` 的 SoyaPack 离线（Ollama）和生产（Claude）都能跑，不改代码。

**成本护栏。** Moon 层面给每个 upstream profile 设成本上限，跑飞的 Agent 一下午烧不光你一年的预算。在 Moon 配置的 `upstreams.<name>.budget:` 下配。

清单 schema 见 [SoyaPack v0 清单](../reference/soyapack-v0.md)；线协议见 [HTTP API](../reference/http-api.md)。
