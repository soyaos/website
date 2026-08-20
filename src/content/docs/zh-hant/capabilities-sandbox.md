---
title: 能力與沙箱
description: Comet 怎麼強制一個 Agent 能做什麼、不能做什麼。
order: 1
category: concepts
---

SoyaOS 裡的每個 Agent 都跑在 **Comet 沙箱**裡,受**能力白名單**約束。任何沒在 `capabilities` 裡宣告的事都被拒絕。模型是 fail-closed:預設狀態是「你碰不到外部世界」,清單按需開口子。

## 為什麼要能力模型

三股壓力推出這個模型:

1. **作者不可信。** SoyaPack 可能來自任何地方。你昨天 `pull` 的一個套件,今天作者翻臉要導你資料時,它應該沒這個本事。
2. **稽核可信。** 出事時,你想看一眼一份 YAML 裡的一個區塊就回答「這個套件當時能訪問什麼」,而不是去爬 Go 程式碼。
3. **可重現。** 能力宣告同時是 Comet 快取的合約:`egress: []` + `determinism_tier: read-only` 的套件,可證明是可快取的。

## 什麼被守住

| 表面          | 機制                                                        | 能繞過嗎?                               |
| ------------- | ----------------------------------------------------------- | --------------------------------------- |
| 網路出網      | 按 host:port:protocol 三元組白名單;執行時解析               | 不能——DNS 解析本身也走白名單。         |
| 檔案系統讀    | mount namespace + bind mount,按前綴比對                     | 不能——白名單外的路徑是 404。           |
| 檔案系統寫    | 同讀;`fs.write` 外的寫入 EACCES                             | 不能。                                 |
| 行程 exec     | 只允許套件自己的直譯器;spawn 子行程被拒                      | 不能。                                 |
| 時間訪問      | 讀實時時鐘(`clock_gettime`)允許;設置時間不允許               | n/a——日誌要用。                       |
| 隨機數        | `/dev/urandom` 永遠可用                                     | n/a。                                  |
| DNS 出站      | 透過 Moon 解析(Moon 強制白名單)                              | 不能。                                 |

## Egress

```yaml
capabilities:
  egress:
    - host: api.openai.com
      port: 443
      protocol: https
    - host: hooks.slack.com
      port: 443
      protocol: https
```

- 每條是三元組——host + port + protocol——三者都比對才能連通。
- 接受萬用字元(`*.openai.com`),但 `pack lint --strict` 會標紅。
- 接受 IP 直寫(`192.168.1.1`),但不鼓勵——服務遷移就壞了。
- Egress 在 **Comet 內部**強制;即使你的工具用裸 socket 想繞,Comet 啟動時設的核心 netfilter chain 也會攔下。

如果你的套件確實需要不固定數量的主機(比如爬蟲 Agent),有兩個老實的選擇:

- **用 `unrestricted` + `egress: ["*"]`** ——明說自己是黑盒。Comet 拒絕快取結果。
- **加一個 Moon 端代理**——只把 Moon 的 HTTP 代理放進 `egress`;Moon 自己再持一份白名單。生產推薦。

## 檔案系統

```yaml
capabilities:
  fs:
    read:
      - /workdir          # 總是可用;顯式寫出來更清晰
      - /workdir/inputs
    write:
      - /workdir/out
```

- 所有路徑都是沙箱*內部*的。宿主檔案系統不可見——Comet 啟動時建一個全新的 mount namespace。
- 前綴比對。`/workdir/out/foo.json` 在 `fs.write: [/workdir/out]` 下放行。
- `/workdir` 本身預設唯讀,除非你把某個子路徑列入可寫。
- 讀未宣告的路徑回傳 ENOENT 而不是 EACCES——也就是「這檔案不存在」。故意的:永不洩漏宿主目錄結構。

## 確定性層級

| 層級             | 語意                                                              | 快取?   |
| ---------------- | ----------------------------------------------------------------- | ------- |
| `read-only`      | 相同輸入總是產生相同輸出(上游 LLM 非確定性除外)。                  | 是,按輸入 hash。 |
| `side-effect`    | Agent 在沙箱外產生可觀測變化(建 Linear issue、發 Slack、寫資料庫)。 | 否。     |
| `unrestricted`   | 逃生口。把 Agent 當完全黑盒。隱含 `side-effect`。                  | 否。     |

層級是按 Agent 的**行為**而不是僅按宣告強制的。如果一個 Agent 宣告 `read-only` 但 `tools` 裡有 `kind: builtin.http_post`,push 時校驗失敗。

## 違規會怎麼樣

Comet 偵測到能力越界(網路、fs、exec)時:

1. 當前 syscall 回傳 EACCES / ENOENT / ECONNREFUSED——Agent 程式碼看到的是「正常」錯誤。
2. 發一條 `capability_violation` 的 Scope 事件,含違規表面、申請資源、比對的清單條目(或「無比對」)。
3. 執行以結束碼 `3` 結束。
4. Moon 在倉庫裡給該套件版本打標;後續相同版本的呼叫每次都警告,直到套件被修。

CI 裡:

```bash
$ soyaos pack lint . --strict
err   capabilities.egress 宣告了 `api.openai.com:443` 但 tools.fetch 用的是 `api.anthropic.com:443`
1 error · 0 warnings
```

## 工具支援

- `soyaos pack validate .` ——校驗清單形狀。
- `soyaos pack lint .` ——校驗 `capabilities`、`tools`、`examples` 之間的一致性。
- `soyaos pack lint . --strict` ——萬用字元主機、宣告了但沒範例覆蓋的能力、`determinism_tier` 不比對,都失敗。

清單 schema 見 [SoyaPack v0 清單](../reference/soyapack-v0.md);事件 envelope 見 [Scope 事件](./scope-events.md)。
