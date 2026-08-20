---
title: 簽名與發布 SoyaPack
description: 從筆電上能跑的套件,到 Moon 上簽名、可稽核、生產就緒的版本。
order: 3
category: guides
---

本地跑通的 SoyaPack 開發夠用;要推上有真實流量的 Moon 時,應當**簽名**、**打 tag**、**可追溯**。這篇是從 `pack push` 到「我能證明哪個版本在哪天產出了 X」的路徑。

## 1. 生成簽名 Key

每個開發者或每條發布管線一次性設定:

```bash
soyaos auth signkey create --name "chzealot-2026" --algorithm ed25519
# → wrote ~/.config/soyaos/signing-keys/chzealot-2026.{priv,pub}
# → fingerprint: SHA256:N5bA…
```

私鑰不離開本機;公鑰是 Moon 信任的對象。把 fingerprint 印出來貼到能讓人驗證的地方(README、內部 wiki)。

CI 裡用同一把 Key:把 `.priv` 檔的內容存為 secret,workflow 裡寫回磁碟後再呼叫 `pack sign`。

## 2. 把公鑰註冊到 Moon

```bash
soyaos auth signkey publish \
  --moon https://moon.example.com \
  --name "chzealot-2026"
# → registered as keyset entry sk_018f3a, status=pending review
```

新發布的簽名 Key 預設**待審核**——Moon 上的管理員要先批准,Moon 才會接受這把 Key 簽的套件。Solo / 單租戶場景下,本人即是管理員,自己批自己:

```bash
soyaos auth signkey approve sk_018f3a --moon https://moon.example.com
```

## 3. 簽套件

```bash
cd research-summarizer
soyaos pack sign . --key chzealot-2026
# ✓ canonicalized manifest (SHA256: 8d2c…)
# ✓ hashed prompt files, templates, examples
# ✓ signed bundle (Ed25519, key=chzealot-2026, fingerprint=N5bA…)
# wrote .soya/signature.json
```

`pack sign` 產生 `.soya/signature.json`,裡面有:

- `soyapack.yaml` 規範化後的 hash。
- 清單引用的每個檔(prompt、template、example)的 hash。
- 簽名 Key 的 fingerprint。
- 上面這些的 Ed25519 簽名。

這個檔跟清單一起進 git。**別 gitignore** ——簽名就是稽核軌跡。

## 4. push 到 Moon

```bash
soyaos pack push . --moon https://stage.example.com
# ✓ verified signature against published keyset (sk_018f3a, approved)
# ✓ uploaded bundle 5.2 MB
# → published as soya:research-summarizer@0.1.0 (immutable)
```

Moon 在以下情況拒絕 push:

- 缺簽名(生產標記的 Moon 上,`pack push` 預設 `--require-signature`)。
- 簽名 Key 在這台 Moon 上沒註冊或沒批准。
- 套件實際 hash 跟 `.soya/signature.json` 裡的對不上(也就是有人簽後改了 prompt 檔)。

## 5. 版本不可變

`soya:research-summarizer@0.1.0` 一旦發布就永不可替換。要修就升版本:

```yaml
# soyapack.yaml
version: 0.1.1
```

……再簽、再 push。Moon 現在同時服務兩個版本;客戶端按需 pin 或用 `@*`。

下線一個版本(**不**刪除——v0 永不允許刪除):

```bash
soyaos pack deprecate soya:research-summarizer@0.1.0 \
  --reason "長輸入下摘要有 bug" \
  --moon https://stage.example.com
```

被棄用的套件對新呼叫回傳 `410 Gone`,但稽核日誌裡依然可查。

## 6. 推到生產

晉升流程在 Moon 之間用 `pull` + `push`:

```bash
soyaos pull --moon https://stage.example.com soya:research-summarizer@0.1.0
soyaos push --moon https://prod.example.com  soya:research-summarizer@0.1.0
```

簽名隨套件一起走。生產 Moon 用自己的 keyset 驗簽——這是一道有意的信任邊界。stage 信任的 Key 不會自動在生產被信任;公鑰必須在生產那邊也 `signkey publish` 並核准。

一次性麻煩,長期受益:stage 上被攻陷的 Key 不會順手攻陷生產。

## 7. 稽核日誌

每個發布版本,Moon 都保存:

| 欄位             | 值                                                              |
| ---------------- | --------------------------------------------------------------- |
| `pack`           | `soya:research-summarizer@0.1.0`                                |
| `published_at`   | RFC 3339 UTC。                                                   |
| `published_by`   | 跑 `pack push` 的 Moon 使用者。                                  |
| `signed_by`      | 簽名 Key 的 fingerprint(`SHA256:N5bA…`)。                        |
| `bundle_sha256`  | 實際上傳的套件 hash。                                            |
| `manifest_hash`  | 規範化清單的 hash。                                              |

隨時查:

```bash
soyaos pack audit soya:research-summarizer@0.1.0 --moon https://prod.example.com
# pack         soya:research-summarizer@0.1.0
# published    2026-05-14T08:11:43Z by chzealot
# signed_by    chzealot-2026 (SHA256:N5bA…)  status=approved
# bundle       sha256:8d2c…   5.2 MB
# manifest     sha256:5f1a…
# scope_events (last 90d):
#   2026-05-14 → 318 runs · 312 ok · 6 capability_violation
#   2026-05-15 → 1,204 runs · 1,201 ok · 3 capability_violation
```

## 8. Key 輪換

Key 至少每年輪換一次。模式:

```bash
# 簽一把新 Key:
soyaos auth signkey create --name "chzealot-2027" --algorithm ed25519
soyaos auth signkey publish --moon https://prod.example.com --name "chzealot-2027"
# 管理員批新 Key。

# 後續 release 用新 Key 簽:
soyaos pack sign . --key chzealot-2027

# 可選地退役舊 Key(現有套件仍可驗,但不再接受新 push):
soyaos auth signkey retire chzealot-2026 --moon https://prod.example.com
```

舊 Key 簽過的套件繼續生效——`retire` 只拒絕**新**的 push。

## v1 會加什麼

- `soyaos pack sign --transparency-log https://…` ——把簽名寫進公開、追加式日誌(Sigstore 風格)。
- `soyapack.yaml` 裡 `signed_by: required` ——給組合其他套件的套件用,讓 `soya:reviewer` 可以要求依賴的 `soya:fact-checker` 必須是某 keyset 簽的。
- 透過 PKCS#11 / WebAuthn 做硬體支援的簽名。

簽名**不**涵蓋的部分(執行時能力強制是另一回事)見[能力與沙箱](../concepts/capabilities-sandbox.md);上線後呼叫方的 `Authorization: Bearer` 流見 [HTTP API](../reference/http-api.md)。
