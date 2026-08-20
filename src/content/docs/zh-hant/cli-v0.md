---
title: CLI v0 參考
description: soyaos 二進位在 v0 暴露的所有命令,含範例輸出。
order: 2
category: reference
---

`soyaos` 二進位在 v0 暴露下列命令。每個命令在 v0 內穩定——參數只可**新增**、絕不刪除。結束碼也穩定(見文末表)。

## 全域參數

```
--config <path>      指定設定檔(預設:~/.config/soyaos/config.yaml)
--log-level <level>  trace | debug | info | warn | error(預設:info)
--json               僅向 stdout 輸出 JSON(不顯示進度 UI)
--no-color           關閉 ANSI 顏色
--profile <name>     在設定檔的具名 profile 之間切換(預設 "default")
```

環境變數覆蓋設定檔;參數覆蓋環境變數。最常用的幾個:`SOYAOS_LOG_LEVEL`、`SOYAOS_CONFIG`、`SOYAOS_PROFILE`。

## `soyaos version`

印出版本、commit、建置日期,以及 SoyaPack-v0 schema 版本。

```bash
$ soyaos version
soyaos 0.1.0 (commit 4a9b2c7, built 2026-05-14)
  schema: soyapack v0.1.0
  runtime: linux/amd64
```

JSON 模式(CI 裡方便):

```bash
$ soyaos --json version
{"version":"0.1.0","commit":"4a9b2c7","built":"2026-05-14T08:11:43Z","schema":"v0.1.0","runtime":"linux/amd64"}
```

## `soyaos pack`

本地建立、校驗、執行 SoyaPack 套件。

| 子命令              | 用途                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| `pack init <name>`  | 以內建範本(`--template <name>`)鷹架建立一個 SoyaPack。                    |
| `pack validate .`   | 依 v0 schema 校驗 `soyapack.yaml`。                                       |
| `pack lint .`       | 更嚴格的檢查——風格、範例覆蓋、能力收斂。                                  |
| `pack push <name>`  | 發布到當前 profile 設定的 Moon。                                          |
| `pack list`         | 列出已安裝 / 已發布的套件。                                                |
| `pack rm <name>`    | 本地刪除一個套件(不能刪除被執行中任務引用的套件)。                        |

範例:鷹架 → 校驗 → 執行:

```bash
$ soyaos pack init hello --template echo
✓ wrote hello/soyapack.yaml
✓ wrote hello/prompts/reply.md
✓ wrote hello/examples/hello.json

$ soyaos pack validate hello
✓ apiVersion ok
✓ kind=Agent ok
✓ capabilities.egress empty(顯式寫 `egress: []` 讓意圖清晰)
✓ inputs schema valid
✓ outputs map valid
✓ prompts.reply: 檔案存在
ok · 0 errors, 0 warnings
```

`pack lint` 更嚴:它會對「宣告的輸入欄位沒有對應範例」「能力比範例覆蓋範圍更寬」之類的情況告警:

```bash
$ soyaos pack lint hello
warn  examples 覆蓋了 2 個輸入變體中的 1 個——給 `topic=null` 加一個 fixture
warn  capabilities.egress 列了 `api.openai.com`,但沒有 example 呼叫它
2 warnings · 用 --strict 讓警告失敗
```

## `soyaos run`

```
soyaos run <pack-dir> --input <json|@file>
```

在本地 Comet 沙箱裡執行一個 SoyaPack。帶 `--json` 時把 Scope 事件以 JSON 形式吐到 stdout;否則渲染精簡的進度 UI。

```bash
$ soyaos run hello --input '{"text":"hi"}'
▶ hello @0.1.0 · 1 stage · capabilities: none
  reply  ████████████  0.8s
✓ run_018f3a · ok in 0.81s
{ "reply": "hi" }
```

JSON 模式逐列輸出一連串 Scope 事件,以 `run_completed` 結尾:

```bash
$ soyaos --json run hello --input '{"text":"hi"}'
{"kind":"run_started","run_id":"run_018f3a","pack":"hello@0.1.0","ts":"…"}
{"kind":"stage_started","stage":"reply","ts":"…"}
{"kind":"stage_completed","stage":"reply","artifacts":["reply.v1"],"ts":"…"}
{"kind":"run_completed","ok":true,"ts":"…"}
```

常用參數:

- `--input @path/to/input.json` —— 從檔案讀輸入。
- `--timeout 30s` —— 30 秒後強制結束。
- `--cache-mode <off|read|write|rw>` —— 單次執行覆蓋 Comet 快取策略。

## `soyaos serve`

```
soyaos serve --role <comet|moon|planet>
```

以指定角色啟動一個常駐節點。可以傳多個 `--role`——`--role moon --role comet` 是 `cluster` 版本的預設組合。`serve` 一般透過 `soyaos start --edition <name>` 隱式呼叫;只有需要非標準角色組合時才直接用。

```bash
$ soyaos serve --role moon --bind 0.0.0.0:8443 --state postgres://…
▶ Moon listening on 0.0.0.0:8443
▶ Registry backend: s3://soya-packs/
▶ Scope broker: ws://0.0.0.0:8444
▶ ready in 312ms
```

## `soyaos start`

`serve` 的便捷封裝——按 edition 自動挑 `--role` 組合。

```
soyaos start --edition <solo|cluster|cloud|hybrid|ent-cloud|ent-private>
```

```bash
$ soyaos start --edition solo
▶ solo: planet+moon+comet 摺疊為同一行程
▶ 監聽 127.0.0.1:7474(用 --bind 修改)
▶ Web UI: http://127.0.0.1:7474/
ready · 把 127.0.0.1:7474/v1 貼到任意 OpenAI 相容客戶端即可
```

## `soyaos auth`

| 子命令                      | 用途                                            |
| --------------------------- | ----------------------------------------------- |
| `auth login`                | 用瀏覽器登入一個 Moon。                         |
| `auth logout`               | 清除當前 Moon 的快取憑據。                      |
| `auth whoami`               | 印出當前已認證的使用者 + Moon。                 |
| `auth keys create`          | 簽發一個新的 API Key。                          |
| `auth keys list`            | 列出 API Key(截斷;`--reveal` 看完整值)。        |
| `auth keys revoke <id>`     | 撤銷一個 API Key。                              |

```bash
$ soyaos auth whoami
user@example.com · moon.example.com · role=admin · 2 keys
```

## `soyaos join`

以 Comet 身分加入既有 Moon:

```bash
$ soyaos join --moon https://moon.example.com --token <invite>
▶ 已驗證 Moon 身分(planet=planet.soyaos.ai)
▶ 註冊為 comet cmt-a3f1 · pool=default
▶ 能力已接受:egress[api.openai.com:443], fs.read[/workdir], fs.write[/workdir/out]
ready · 等待任務
```

invite token 一次性、15 分鐘過期。在 Moon 端用 `auth keys create --kind comet-invite` 簽發。

## `soyaos pull` / `soyaos push`

在 Moon 之間鏡像 SoyaPack(staging → prod 上線時常用):

```bash
$ soyaos pull --moon https://stage.example.com soya:compo@1.4.0
$ soyaos push --moon https://prod.example.com  soya:compo@1.4.0
```

## `soyaos config`

讀寫當前生效的設定:

```bash
$ soyaos config get default.moon
moon: https://moon.example.com

$ soyaos config set default.moon https://newmoon.example.com
```

## 結束碼

| 碼  | 含義                                       |
| --- | ------------------------------------------ |
| `0` | 成功                                       |
| `1` | 一般錯誤                                   |
| `2` | 校驗錯誤(清單、輸入等)                     |
| `3` | 沙箱 / 能力越界                            |
| `4` | 鑑權錯誤                                   |
| `5` | 上游 / 網路錯誤                            |
| `6` | 逾時                                       |
| `124`| (保留給 `timeout(1)` 風格的外層包裝)      |

結束碼在整個 v0 系列保持穩定——腳本裡直接判等沒問題。

## 常見工作流程

**本地試一份套件再 push 到 staging**:

```bash
soyaos pack validate .
soyaos pack lint . --strict
soyaos run . --input @examples/hello.json
soyaos pack push hello --moon https://stage.example.com
```

**把一個新版本推到生產**:

```bash
soyaos pull --moon https://stage.example.com soya:compo@1.4.0
soyaos push --moon https://prod.example.com  soya:compo@1.4.0
soyaos auth keys list --moon https://prod.example.com    # 兜底確認現有 Key 還能用
```

**排查一個失敗執行**:

```bash
soyaos run . --input @failed-input.json --log-level debug --json | tee run.log
soyaos --json run . --input @failed-input.json | jq 'select(.kind == "tool_called")'
```
