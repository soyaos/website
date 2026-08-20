---
title: 從零寫一個 Agent
description: 搭一個多階段 Agent——抓 URL、提要點、產出型別化產物。
order: 1
category: guides
---

這篇帶你做一個真實的 Agent——比[快速上手](../getting-started/quickstart.md)的 `echo` 範本深一檔。我們要做 `research-summarizer`:接一個 URL,抓頁面,呼叫上游 LLM 提 5–10 條要點,產出一個 `summary.v1` 產物。

直接複製貼上五分鐘;想把每段背後的*為什麼*也吃透,30 分鐘。

## 你會學到

- 怎麼把 `tools.fetch` 接到一條狹窄的 `egress` 白名單。
- 怎麼把兩個 prompt 階段(extract + summarize)串起來,讓 LLM 第二輪看到的是清潔過的輸入。
- 怎麼給產物宣告型別並校驗。
- 怎麼寫 fixture 讓 `pack lint` 不放水。

## 1. 鷹架

```bash
soyaos pack init research-summarizer --template chat
cd research-summarizer
```

`chat` 範本給你一個單階段、呼叫上游 LLM 的 Agent。我們把它擴成兩階段,再加一個工具。

## 2. 清單

把生成的 `soyapack.yaml` 替換成:

```yaml
apiVersion: soyaos.ai/v0
kind: Agent
name: research-summarizer
version: 0.1.0
virtual_model_id: soya:research-summarizer
description: 抓一個 URL,產出 5–10 條要點。
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

> 工具 egress 是最容易踩的坑。`builtin.http_get` 走套件的 `egress` 白名單——你要抓 `example.com` 就得把它也加進去。這個示範清單為了簡潔只列了一個主機;真實 Agent 要嘛顯式加目的地,要嘛走 Moon 端代理。

## 3. 提示詞

`prompts/extract.md` ——把抓回來的 HTML 裡的正文擠乾淨:

```markdown
你會收到一份 HTML 文件在 `{{ fetched_html }}` 裡。

只回傳文章正文的純文本。去掉 nav、header、footer、廣告、留言、
「相關文章」。段落間用空列分隔。

如果頁面明顯不是文章(登入頁、搜尋結果、404),回傳恰好這一串:
`<<NON_ARTICLE>>`,別的什麼都別寫。
```

`prompts/summarize.md` ——把乾淨的正文變成要點:

```markdown
你在把一篇文章摘要成 {{ max_bullets }} 條要點。

# 文章

{{ article_text }}

# 規則

- 每條只一個論點,不灌水。
- 最強的論點放第一條。
- 如果文章有反方論點,作為最後一條,前綴 "Counter:"。
- 輸出為字串 JSON 陣列,無 markdown、無前後贅述。
```

## 4. 階段編排

新增 `pipeline.yaml` 描述階段連接:

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

要點:

- `tools.fetch(...)` 按清單 `tools:` 區塊求值。Comet 在呼叫時校驗 egress 白名單。
- `when:` 讓我們在 extract 回傳哨兵值時跳過第二階段——省一次 LLM 呼叫。
- `parse_as: 'json:string[]'` 校驗 LLM 輸出確實是字串 JSON 陣列;解析失敗以 `2` 碼結束並發 `error` Scope 事件。

## 5. 範例 fixture

`examples/short_blog.json`:

```json
{
  "url": "https://example.com/post",
  "max_bullets": 5,
  "_expected_kind": "article"
}
```

`_expected_kind` 是給 `pack lint` 看的後設資料——它不會傳到 Agent,但 lint 看到這條聲稱是「article」的輸入卻被 extract 回傳 `<<NON_ARTICLE>>` 時會告警。

## 6. 校驗、lint、執行

```bash
soyaos pack validate .
soyaos pack lint . --strict
soyaos run . --input @examples/short_blog.json
```

接通了的話:

```bash
▶ research-summarizer @0.1.0 · 2 stages · capabilities: egress[1]
  extract     ████████████  2.1s
  summarize   ████████████  3.4s
✓ run_018f3a · ok in 5.51s
{
  "summary": {
    "bullets": [
      "寫入密集型表過約 5000 萬列後,分散式 compaction 比垂直擴縮更划算。",
      "Bloom 過濾器假陽率會跨層級累積——調要調 level 0,不是 leaf。",
      "Counter: tiered compaction 在峰值寫入時浪費 2-3 倍磁碟。"
    ],
    "source_url": "https://example.com/post"
  }
}
```

## 7. 快速迭代

`soyaos run --watch .` 在你改 prompt 檔案時自動重跑。搭配 `--json | jq` 即時看 Scope 事件:

```bash
soyaos --json run . --input @examples/short_blog.json --watch | \
  jq -c 'select(.kind == "llm_response") | {tokens: .completion_tokens, stage}'
```

## 8. ship

```bash
soyaos pack push . --moon https://stage.example.com
```

把客戶端指向 `stage.example.com/v1`,`model: soya:research-summarizer`。滿意後鏡像到生產:

```bash
soyaos pull --moon https://stage.example.com soya:research-summarizer@0.1.0
soyaos push --moon https://prod.example.com  soya:research-summarizer@0.1.0
```

## 想看更多

- [能力與沙箱](../concepts/capabilities-sandbox.md) —— `egress`、`fs`、`determinism_tier` 實際怎麼強制。
- [虛擬模型與 BYOK](../concepts/virtual-models.md) —— `upstream:` 區塊怎麼解析。
- [SoyaPack v0 清單](../reference/soyapack-v0.md) —— 每個欄位。
- [簽名與發布 SoyaPack](./sign-and-publish.md) —— 準備上生產時看。
