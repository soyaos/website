---
title: 虛擬模型與 BYOK
description: soya:* 模型 ID 怎麼解析;怎麼把自己的 LLM Key 接進來。
order: 2
category: concepts
---

SoyaOS 進來出去都講 OpenAI 協議。能做到「不把你鎖在我們託管基礎設施」的關鍵是**虛擬模型 ID**——`soya:` 開頭的名字,在 Moon 處解析到一個 SoyaPack——加上 **BYOK** 路由,讓你隨時切到自己的上游 LLM Key。

## 什麼是 `soya:*`

虛擬模型 ID 就是你客戶端呼叫 Agent 時用的名字:

```bash
curl http://moon.example.com/v1/chat/completions \
  -d '{
    "model": "soya:compo",
    "messages": [{"role": "user", "content": "給一篇關於 X 的文章列大綱"}]
  }'
```

Moon 在請求時透過這條鏈路解析 `soya:compo`:

```
soya:compo                                    # 客戶端發的
  → 倉庫裡的 soya:compo@*                      # 已發布的最新版本
  → soya:compo@1.4.0                          # 這個租戶綁定的具體版本
  → SoyaPack 清單                              # 實際執行的程式碼
  → Comet                                      # 具現化它的工作節點
```

客戶端也可以直接鎖版本:

```json
{ "model": "soya:compo@1.4.0", "messages": [...] }
```

## 為什麼把模型名跟 LLM 解耦

三個原因:

1. **一個名字、多種實作。** `soya:compo` 這季後端是 Claude,下季可能換成微調的 Qwen。客戶端不必知道。
2. **可組合。** Agent 可以按名字呼叫其他 Agent——`soya:reviewer` 在呼叫過程中呼叫 `soya:fact-checker`——上游 LLM 是各自的實作細節。
3. **BYOK 不動手術。** 切自己的模型 Key 時,Moon 上所有 `soya:*` 模型同時拾起變更,你不用改 27 份客戶端設定。

## BYOK——自帶 LLM Key

Moon 可設定一個或多個**上游模型 profile**。每個 profile 是「發給廠商 X 的請求走哪裡」:

```yaml
# moon.config.yaml(片段)
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
    base_url: http://192.168.1.10:11434/v1   # 區網內的 Ollama
    api_key: ollama
```

SoyaPack 宣告自己要哪個上游:

```yaml
# soyapack.yaml(片段)
upstream:
  prefer: claude
  fallback: openai
```

執行時 Comet 在 Moon 的 `upstreams:` 裡查 `prefer: claude`,用那個 profile 的 Key 簽呼叫、發出去。`prefer` 目標 5xx 時自動 fallback。

「不再為推理付費給我們」具體做的事,就是把 profile 從 Moon 提供的(我們持 Key)切到你自己的 profile——通常是用自己組織 Key 的 `openai`,或者完全離線時用本地 Ollama。

## 保留名

`soya:` 是唯一保留前綴;其他(`gpt-*`、`claude-*`、`qwen-*`)都被當作**透傳**名字。客戶端直接發 `model: "claude-sonnet-4-6"` 時,Moon 把它當透明代理透過 `claude` 這個 upstream profile 轉發(找不到該 profile 就拒)。這是「Moon 作為透明 LLM 提供方」模式。

## 成本與計量

當一個 `soya:*` 模型解析到一個會呼叫上游的 SoyaPack 時,你在 Moon 的計量頁上看到兩條成本線:

| 線              | 錢去了哪裡                          |
| --------------- | ----------------------------------- |
| **上游 token**  | Anthropic / OpenAI / 你的提供方     |
| **Comet 秒**    | SoyaOS, Inc.(僅雲端版本)            |

BYOK 後,Moon 帳單上的上游線是零(因為你直接付給 Anthropic)。Comet 線還在——那是我們替你實際排程的算力。

## 常見用法

**Region 綁定。** Moon 設定裡把 `claude-us` 和 `claude-eu` 定義成兩個 upstream profile;SoyaPack 寫 `prefer: claude-us`,或者從輸入裡讀使用者的 region。同一個 `soya:*` 名字、不同的物理目的地。

**Local-first 開發。** 跑一個本地 Ollama,加一個 `local` upstream 指過去;`prefer: local, fallback: claude` 的 SoyaPack 離線(Ollama)和生產(Claude)都能跑,不改程式碼。

**成本護欄。** Moon 層面給每個 upstream profile 設成本上限,跑飛的 Agent 一下午燒不光你一年的預算。在 Moon 設定的 `upstreams.<name>.budget:` 下設。

清單 schema 見 [SoyaPack v0 清單](../reference/soyapack-v0.md);線協議見 [HTTP API](../reference/http-api.md)。
