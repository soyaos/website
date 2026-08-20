---
title: SoyaPack v0 清单
description: soyapack.yaml v0 清单参考——字段、能力、完整例子、常见坑。
order: 1
category: reference
---

`soyapack.yaml` 是 SoyaOS 包的单一权威来源。v0 冻结了下面这一小套字段；后续版本只新增、绝不移除。一个 pack 还带 prompt 文件、可选模板、样例 fixture——但合约只看清单。

## 顶层字段

| 字段                | 类型     | 必填               | 说明                                                                                |
| ------------------- | -------- | ------------------ | ----------------------------------------------------------------------------------- |
| `apiVersion`        | string   | 是                 | 必须为 `soyaos.ai/v0`。                                                              |
| `kind`              | enum     | 是                 | `Agent` / `Tool` / `Skill` / `Model` 之一。                                          |
| `name`              | string   | 是                 | DNS 标签安全；同一 owner 下唯一。                                                    |
| `version`           | string   | 是                 | SemVer 2.0.0（允许 pre-release，如 `0.1.0-alpha.0`）。                              |
| `virtual_model_id`  | string   | Agent 类型必填     | 该 Agent 声明的 `soya:*` id（如 `soya:compo`）。                                     |
| `description`       | string   | 是                 | 一句话摘要。                                                                         |
| `owner`             | string   | 是                 | GitHub 个人或组织。                                                                  |
| `license`           | string   | 是                 | SPDX 标识符（`MIT`、`Apache-2.0`……）。                                              |
| `capabilities`      | object   | 是                 | 能力白名单——出网主机、文件系统路径、确定性等级。详见下文。                           |
| `inputs`            | object   | 是                 | 描述输入契约的 JSON Schema 片段。                                                    |
| `outputs`           | object   | 是                 | 产物名称 → schema id 的映射（如 `guide.v1`）。                                       |
| `prompts`           | object   | Agent 类型必填     | stage 名 → 提示词文件相对路径。                                                      |
| `tools`             | object   | 可选               | 工具名 → 声明（内置或外部）。                                                        |
| `templates`         | object   | 可选               | 模板名 → `html/template` 文件路径。供产物渲染器使用。                                |
| `examples`          | object   | 可选               | 样例名 → 测试用例文件。会被 `soyaos pack lint` 检测。                                |

## `capabilities`

能力块由 Comet 在运行时强制、Moon 在 push 时审计。包不能做任何这里没声明的事——默认 fail-closed。

```yaml
capabilities:
  egress:
    - host: api.openai.com
      port: 443
      protocol: https
  fs:
    read:
      - /workdir
    write:
      - /workdir/out
  determinism_tier: read-only   # 取值：read-only | side-effect | unrestricted
```

- `egress`：显式白名单，没有任何隐式 `0.0.0.0/0`。通配符（`*.openai.com`）接受但不鼓励——越窄越安全。
- `fs.read` / `fs.write`：Comet 沙箱*内部*的绝对路径。`/workdir` 永远可用；其余都要声明。
- `determinism_tier`：声明 Agent 的可重现等级。Comet 用它决定缓存策略：
  - `read-only`——相同输入总是产生相同输出（上游 LLM 的非确定性除外）。可缓存。
  - `side-effect`——为可观测副作用碰网络（建 Linear issue、发 Slack）。永不缓存。
  - `unrestricted`——逃生口。除非有理由，否则别用。

完整强制模型见[能力与沙箱](../concepts/capabilities-sandbox.md)。

## 一个完整的例子

一个简单的「文章总结」Agent：抓一个 URL，让上游 LLM 提炼要点，产出 `summary.v1` 产物：

```yaml
# soyapack.yaml
apiVersion: soyaos.ai/v0
kind: Agent
name: research-summarizer
version: 0.1.0
virtual_model_id: soya:research-summarizer
description: 抓一篇文章，产出 5–10 条要点。
owner: chzealot
license: MIT

capabilities:
  egress:
    - host: api.openai.com
      port: 443
      protocol: https
    - host: example.com           # 抓取工具可能访问的任何主机
      port: 443
      protocol: https
  fs:
    read:
      - /workdir
    write:
      - /workdir/out
  determinism_tier: read-only

inputs:
  type: object
  required: [url]
  properties:
    url:
      type: string
      format: uri
      description: 要总结的文章 URL。
    max_bullets:
      type: integer
      default: 8
      minimum: 3
      maximum: 12

outputs:
  summary: summary.v1            # schema 在另一个仓库里声明

prompts:
  extract: prompts/extract.md
  summarize: prompts/summarize.md

tools:
  fetch:
    kind: builtin.http_get
    params:
      timeout: 15s
      max_bytes: 2_000_000

examples:
  short_blog:
    input: { url: "https://example.com/post", max_bullets: 5 }
  long_essay:
    input: { url: "https://example.com/essay", max_bullets: 12 }
```

两个提示词文件（`prompts/extract.md`、`prompts/summarize.md`）和清单放在一起。`fetch` 工具是内置的 HTTP getter；两条 `egress` 精确授权它能去哪。

## 常见坑

**egress 太宽。** `host: "*"` 技术上合法但破坏安全模型。Comet 接受，但 `pack lint --strict` 会标红。把 `egress` 收窄到样例实际需要的范围。

**写入 `/workdir/out` 之外的路径。** Comet 沙箱让 `/workdir` 可写但只允许 `fs.write` 里声明的路径。直接往 `/workdir` 写（没列出来）会触发 `capability violation: fs.write`，运行中断。

**`determinism_tier: side-effect` 但没做幂等。** 如果你的 Agent 每次跑都发 Slack，你会刷屏。要么在调用里塞幂等 Key（推荐），要么明确把「重跑就该重发」设计进去。

**`kind: Agent` 但忘了写 `virtual_model_id`。** Moon 要知道怎么把 `soya:<id>` 请求路由到你的包。校验会拦截，但这是常见绊倒点。

**SemVer pre-release 不小心被推到生产。** `0.1.0-alpha.0` 在 staging 没问题；切生产流量前升到 `0.1.0`。Comet 把 `*-alpha.*` 版本看作「不稳定，少缓存」。

**examples 和 inputs schema 漂移。** `pack lint` 会把 fixture 拿 `inputs` JSON Schema 比对。新加了必填字段忘了更新 fixture，lint 警告。`--strict` 让它 fail。

## 校验

```bash
soyaos pack validate .
```

校验器就是 Comet 在准入时跑的同一份代码。[soyaos/skills](https://github.com/soyaos/skills) 的 CI 在每个 PR 上都会调用它。

更深的检查（样例覆盖、能力收窄度）用：

```bash
soyaos pack lint . --strict
```

## v1 会加什么？

v1 只**新增**这些字段（绝不移除或重新指定 v0 字段）：

- `secrets:` ——具名、按 env 绑定、带轮换策略的秘密声明。
- `sla:` ——每个阶段的超时 / 成本预算上限。
- `signed_by:` ——加密溯源，配合 `soyaos pack sign`。
- `compat:` ——最低 runtime 版本，可选 feature flag。

v1 ship 时 v0 的包不用改任何东西。
