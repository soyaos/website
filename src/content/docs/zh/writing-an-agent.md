---
title: 从零写一个 Agent
description: 搭一个多阶段 Agent——抓 URL、提要点、产出类型化产物。
order: 1
category: guides
---

这篇带你做一个真实的 Agent——比[快速上手](../getting-started/quickstart.md)的 `echo` 模板深一档。我们要做 `research-summarizer`：接一个 URL，抓页面，调上游 LLM 提 5–10 条要点，产出一个 `summary.v1` 产物。

直接复制粘贴五分钟；想把每段背后的*为什么*也吃透，30 分钟。

## 你会学到

- 怎么把 `tools.fetch` 接到一条狭窄的 `egress` 白名单。
- 怎么把两个 prompt 阶段（extract + summarize）串起来，让 LLM 第二轮看到的是清洁过的输入。
- 怎么给产物声明类型并校验。
- 怎么写 fixture 让 `pack lint` 不放水。

## 1. 脚手架

```bash
soyaos pack init research-summarizer --template chat
cd research-summarizer
```

`chat` 模板给你一个单阶段、调上游 LLM 的 Agent。我们把它扩成两阶段，再加一个工具。

## 2. 清单

把生成的 `soyapack.yaml` 替换成：

```yaml
apiVersion: soyaos.ai/v0
kind: Agent
name: research-summarizer
version: 0.1.0
virtual_model_id: soya:research-summarizer
description: 抓一个 URL，产出 5–10 条要点。
owner: chzealot
license: MIT

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
  determinism_tier: read-only

inputs:
  type: object
  required: [url]
  properties:
    url:        { type: string, format: uri }
    max_bullets: { type: integer, default: 8, minimum: 3, maximum: 12 }

outputs:
  summary: summary.v1

prompts:
  extract:   prompts/extract.md
  summarize: prompts/summarize.md

tools:
  fetch:
    kind: builtin.http_get
    params: { timeout: 15s, max_bytes: 2_000_000 }

upstream:
  prefer: openai

examples:
  short_blog:
    input: { url: "https://example.com/post", max_bullets: 5 }
```

> 工具 egress 是最容易踩的坑。`builtin.http_get` 走包的 `egress` 白名单——你要抓 `example.com` 就得把它也加进去。这个示例清单为了简洁只列了一个主机；真实 Agent 要么显式加目的地，要么走 Moon 端代理。

## 3. 提示词

`prompts/extract.md` ——把抓回来的 HTML 里的正文挤干净：

```markdown
你会收到一份 HTML 文档在 `{{ fetched_html }}` 里。

只返回文章正文的纯文本。去掉 nav、header、footer、广告、评论、
「相关文章」。段落间用空行分隔。

如果页面明显不是文章（登录页、搜索结果、404），返回恰好这一串：
`<<NON_ARTICLE>>`，别的什么都别写。
```

`prompts/summarize.md` ——把干净的正文变成要点：

```markdown
你在把一篇文章总结成 {{ max_bullets }} 条要点。

# 文章

{{ article_text }}

# 规则

- 每条只一个论断，不灌水。
- 最强的论断放第一条。
- 如果文章有反方论点，作为最后一条，前缀 "Counter:"。
- 输出为字符串 JSON 数组，无 markdown、无前后赘述。
```

## 4. 阶段编排

新增 `pipeline.yaml` 描述阶段连接：

```yaml
# pipeline.yaml
stages:
  - name: extract
    when: always
    inputs:
      fetched_html: '{{ tools.fetch(url=inputs.url).body }}'
    on: prompts.extract
    output: article_text

  - name: summarize
    when: 'article_text != "<<NON_ARTICLE>>"'
    inputs:
      article_text: '{{ stages.extract.output }}'
      max_bullets:  '{{ inputs.max_bullets }}'
    on: prompts.summarize
    output: bullets
    parse_as: 'json:string[]'

outputs:
  summary:
    bullets: '{{ stages.summarize.output }}'
    source_url: '{{ inputs.url }}'
```

要点：

- `tools.fetch(...)` 按清单 `tools:` 块求值。Comet 在调用时校验 egress 白名单。
- `when:` 让我们在 extract 返回哨兵值时跳过第二阶段——省一次 LLM 调用。
- `parse_as: 'json:string[]'` 校验 LLM 输出确实是字符串 JSON 数组；解析失败以 `2` 码退出并发 `error` Scope 事件。

## 5. 样例 fixture

`examples/short_blog.json`：

```json
{
  "url": "https://example.com/post",
  "max_bullets": 5,
  "_expected_kind": "article"
}
```

`_expected_kind` 是给 `pack lint` 看的元数据——它不会传到 Agent，但 lint 看到这条声称是「article」的输入却被 extract 返回 `<<NON_ARTICLE>>` 时会告警。

## 6. 校验、lint、运行

```bash
soyaos pack validate .
soyaos pack lint . --strict
soyaos run . --input @examples/short_blog.json
```

接通了的话：

```bash
▶ research-summarizer @0.1.0 · 2 stages · capabilities: egress[1]
  extract     ████████████  2.1s
  summarize   ████████████  3.4s
✓ run_018f3a · ok in 5.51s
{
  "summary": {
    "bullets": [
      "写入密集型表过约 5000 万行后，分布式 compaction 比纵向扩缩更划算。",
      "Bloom 过滤器假阳率会跨层级累积——调要调 level 0，不是 leaf。",
      "Counter: tiered compaction 在峰值写入时浪费 2-3 倍磁盘。"
    ],
    "source_url": "https://example.com/post"
  }
}
```

## 7. 快速迭代

`soyaos run --watch .` 在你改 prompt 文件时自动重跑。配合 `--json | jq` 实时看 Scope 事件：

```bash
soyaos --json run . --input @examples/short_blog.json --watch | \
  jq -c 'select(.kind == "llm_response") | {tokens: .completion_tokens, stage}'
```

## 8. ship

```bash
soyaos pack push . --moon https://stage.example.com
```

把客户端指向 `stage.example.com/v1`，`model: soya:research-summarizer`。满意后镜像到生产：

```bash
soyaos pull --moon https://stage.example.com soya:research-summarizer@0.1.0
soyaos push --moon https://prod.example.com  soya:research-summarizer@0.1.0
```

## 想看更多

- [能力与沙箱](../concepts/capabilities-sandbox.md) —— `egress`、`fs`、`determinism_tier` 实际怎么强制。
- [虚拟模型与 BYOK](../concepts/virtual-models.md) —— `upstream:` 块怎么解析。
- [SoyaPack v0 清单](../reference/soyapack-v0.md) —— 每个字段。
- [签名与发布 SoyaPack](./sign-and-publish.md) —— 准备上生产时看。
