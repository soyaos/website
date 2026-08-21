---
title: Solo 本機快速上手
description: 五分鐘在自己的電腦上從零跑起 soya:echo Agent。
order: 1
category: getting-started
---

從「什麼都沒裝」到「`soya:echo` 跑起來」,五分鐘搞定。整個過程都在你的筆電上的 `solo` 版本裡跑——不用註冊、不要 API Key、零遙測。

想跳過安裝和維運，直接呼叫代管 Agent？請改看 [Cloud 快速上手](/zh-hant/docs/cloud-quickstart)。

## 1. 安裝

### macOS / Linux(Homebrew,推薦)

```bash
brew tap soyaos/soyaos
brew install soyaos
```

### macOS / Linux(單行腳本)

不喜歡 Homebrew:

```bash
curl -L https://soyaos.ai/install | sh
```

腳本會把最新 release 的二進位下載到 `/usr/local/bin/soyaos`,驗證簽名。腳本冪等、每一步都會印出——想看就先 `curl ... -o install.sh` 再看。

### Windows(Scoop)

```powershell
scoop bucket add soyaos https://github.com/soyaos/scoop-bucket
scoop install soyaos
```

### Docker

```bash
docker run --rm -it -p 7474:7474 -v soyaos-state:/state soyaos/soyaos:0.1.0
```

容器裡二進位自動識別為 `--edition solo`,綁到 `0.0.0.0:7474`。

### 從原始碼

```bash
git clone https://github.com/soyaos/soyaos
cd soyaos && make install
```

需要 Go 1.22+。要打帶 patch 的版本時用。

### 驗證

不論哪種方式,確認二進位在 `PATH` 上、版本號合理:

```bash
$ soyaos version
soyaos 0.1.0 (commit 4a9b2c7, built 2026-05-14)
  schema: soyapack v0.1.0
  runtime: darwin/arm64
```

## 2. 鷹架

用內建的 `echo` 範本建立一個新的 SoyaPack:

```bash
soyaos pack init hello --template echo
cd hello
```

會產生一個最小的 SoyaPack v0 套件:

```
hello/
├── soyapack.yaml
├── prompts/
│   └── reply.md
└── examples/
    └── hello.json
```

`echo` 是最簡範本——沒有上游 LLM 呼叫、沒有工具、沒有能力宣告。一個 prompt 階段,把輸入原樣吐出來。其他幾個值得看的範本:

- `pack init hello --template chat`——單輪上游 LLM 呼叫。
- `pack init hello --template tool`——Agent + 一個外部 HTTP 工具。
- `pack init hello --template artifact`——產出結構化 JSON 產物。

## 3. 校驗

```bash
soyaos pack validate .
```

校驗器會依 SoyaPack v0 schema 檢查清單檔,能力宣告缺失時即刻報錯。再加一道 `pack lint .` 跑更嚴格的風格和覆蓋檢查——`validate` 接受任何符合 spec 的,`lint` 更接近「看起來像生產可發」。

## 4. 執行

```bash
soyaos run . --input '{"text":"hi"}'
```

預期看到:

```bash
▶ hello @0.1.0 · 1 stage · capabilities: none
  reply  ████████████  0.8s
✓ run_018f3a · ok in 0.81s
{ "reply": "hi" }
```

想看原始 Scope 事件而不是進度 UI:

```bash
soyaos --json run . --input '{"text":"hi"}'
```

## 5. 接到 OpenAI 客戶端

`soyaos start --edition solo` 會跑一個本地 Moon,在 `127.0.0.1:7474/v1` 上講 OpenAI 協議。任何 OpenAI 相容客戶端都能直接用:

```bash
soyaos start --edition solo &
# 另開一個終端:
curl http://127.0.0.1:7474/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "soya:hello",
    "messages": [{"role": "user", "content": "hi"}]
  }'
```

或者把 `http://127.0.0.1:7474/v1` 貼到 [Cherry Studio](https://cherry-ai.com/)、[Open WebUI](https://github.com/open-webui/open-webui) 或任何讓你填 OpenAI base URL 的工具裡。

## 排障

**`address already in use`**——7474 連接埠被佔。用 `--bind 127.0.0.1:8888` 換埠,或者 `lsof -i :7474` 找出佔用行程殺掉。

**`capability violation: egress`**——你的 SoyaPack 想出網到一個不在 `capabilities.egress` 白名單裡的主機。要嘛把主機加到清單(重新 validate),要嘛去掉那次工具呼叫。

**`pack validate` 報「manifest: apiVersion missing」**——你大概在改一個老 SoyaPack 版本的範本。第一列改成 `apiVersion: soyaos.ai/v0`。

**Mac Gatekeeper 擋了二進位**——一次性執行 `xattr -d com.apple.quarantine $(which soyaos)`。Homebrew 裝的會自動處理;手動裝的會撞上。

**卡在 `cold-starting comet…` 超過 30 秒**——你機器的容器 runtime 慢。設 `SOYAOS_COMET_RUNTIME=process` 跳過容器層(**只在開發時用**——會放棄沙箱)。

## FAQ

**狀態存哪裡?** Linux/macOS 在 `~/.local/share/soyaos/`,Windows 在 `%LOCALAPPDATA%\soyaos\`。刪掉就能徹底重置。

**它會回呼嗎?** 不會。零遙測、零分析、零遠端設定。`solo` 預設只監聽 `127.0.0.1`。

**怎麼解除安裝?** `brew uninstall soyaos`,再把狀態目錄刪掉。原始碼裝的就在原始碼樹裡 `make uninstall`。

**下一步呢?**

- 讀[架構](./architecture.md),弄懂 Planet / Moon / Comet。
- 在[版本](./editions.md)裡挑一種部署型態。
- 翻翻 [SoyaPack v0 清單參考](./soyapack-v0.md),開始打造自己的 Agent。
- 做一個實際專案:[從零寫一個 Agent](./writing-an-agent.md)。
