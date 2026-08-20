---
title: 自管 Moon(VPS)
description: 為團隊拉起一個 cluster 版 Moon——倉庫、鑑權、Comet。
order: 2
category: guides
---

`cluster` 版本的具體玩法:一台 VPS 跑 Moon,Comet 從你的 LAN 或 VPC 接入,SoyaPack 放在一個 S3 相容儲存裡。前置準備好的話約 30 分鐘,加上 DNS 生效時間。

## 前置

- 一台有公網 IPv4 / IPv6 的 VPS(任意雲,2 vCPU / 4 GB 夠小團隊用)。
- 你能控制的一條 DNS A/AAAA 記錄——`moon.example.com` 是本文約定。
- 一個 S3 相容儲存——Cloudflare R2、Backblaze B2、同機自管 MinIO、AWS S3 都行。
- 一個 Postgres 16+。代管服務可以;非常小的團隊也可以用內建 SQLite。
- 選用但推薦:Postgres 連線字串帶 `sslmode=require`。

## 1. VPS 上安裝

任選一種:

```bash
# Homebrew(Linuxbrew)
brew tap soyaos/soyaos && brew install soyaos

# 單行腳本
curl -L https://soyaos.ai/install | sh

# Docker(可重複升級的首選)
docker pull soyaos/soyaos:0.1.0
```

確認:

```bash
$ soyaos version
soyaos 0.1.0 (...)
```

## 2. 準備狀態後端

建 Postgres 資料庫 + S3 相容儲存桶。Moon 對兩者都要讀寫權限。

```sql
CREATE DATABASE soyaos;
CREATE USER soyaos_app WITH PASSWORD '…';
GRANT ALL PRIVILEGES ON DATABASE soyaos TO soyaos_app;
```

儲存桶最小策略(R2 / S3 寫法略有不同):

- `s3:PutObject`、`s3:GetObject`、`s3:DeleteObject` on `soya-packs/*`
- `s3:ListBucket` on `soya-packs`

## 3. 寫設定

`/etc/soyaos/moon.yaml`:

```yaml
moon:
  bind: 0.0.0.0:8443
  external_url: https://moon.example.com
  tls:
    # 二選一:
    auto: { provider: letsencrypt, email: ops@example.com }
    # 或:
    # cert: /etc/soyaos/tls/fullchain.pem
    # key:  /etc/soyaos/tls/privkey.pem

state:
  postgres:
    dsn: ${SOYAOS_POSTGRES_DSN}

registry:
  backend: s3
  s3:
    endpoint: https://abc123.r2.cloudflarestorage.com
    bucket:   soya-packs
    region:   auto
    access_key: ${R2_ACCESS_KEY}
    secret_key: ${R2_SECRET_KEY}

auth:
  org_token: ${SOYAOS_ORG_TOKEN}     # 初始引導用;之後切 OIDC

upstreams:
  claude:
    kind: anthropic
    base_url: https://api.anthropic.com
    api_key: ${ANTHROPIC_API_KEY}
  openai:
    kind: openai
    base_url: https://api.openai.com
    api_key: ${OPENAI_API_KEY}
```

簽一個強 `SOYAOS_ORG_TOKEN`:`openssl rand -hex 32`。

## 4. 啟動 Moon

```bash
sudo SOYAOS_POSTGRES_DSN=… R2_ACCESS_KEY=… R2_SECRET_KEY=… \
  ANTHROPIC_API_KEY=… OPENAI_API_KEY=… SOYAOS_ORG_TOKEN=… \
  soyaos start --edition cluster --config /etc/soyaos/moon.yaml
```

預期看到:

```
▶ cluster: planet+moon roles
▶ Moon listening on 0.0.0.0:8443
▶ Registry backend: s3://soya-packs/ (probe ok in 142ms)
▶ State: postgres://soya-app@…:5432/soyaos (latency 3ms)
▶ ACME: issued cert for moon.example.com
ready in 1.2s
```

生產用 systemd 託管:

```ini
# /etc/systemd/system/soyaos-moon.service
[Unit]
Description=SoyaOS Moon
After=network-online.target

[Service]
User=soyaos
EnvironmentFile=/etc/soyaos/moon.env
ExecStart=/usr/local/bin/soyaos start --edition cluster --config /etc/soyaos/moon.yaml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## 5. 從 LAN 接入 Comet

每台 Comet 主機(筆電、內網機、VPC 節點):

```bash
# 在 Moon 上簽發一次性 invite token:
soyaos --config /etc/soyaos/moon.yaml auth keys create --kind comet-invite
# → comet-invite_018f3a...

# 在 Comet 主機上:
soyaos join \
  --moon  https://moon.example.com \
  --token comet-invite_018f3a...
```

Comet 對 Moon 開一個出網 HTTPS WebSocket,等任務。同樣用 systemd / launchd 託管。

Comet 可以加入特定池:`--pool gpu`(GPU + CPU 混跑時用)。池在 SoyaPack 的 `placement.pool:` 裡引用。

## 6. 推一個 SoyaPack 並執行

從開發機:

```bash
soyaos auth login --moon https://moon.example.com    # 瀏覽器登入
soyaos pack push hello                                # 發布到 Moon 倉庫

curl https://moon.example.com/v1/chat/completions \
  -H "Authorization: Bearer $(soyaos auth keys list --moon https://moon.example.com --first)" \
  -d '{"model":"soya:hello","messages":[{"role":"user","content":"hi"}]}'
```

看到 `{"reply":"hi"}` 回來就跑通了。

## 7. 維運基本盤

**備份。** Postgres + S3 儲存桶一起,就完整描述了一個 Moon。每晚 `pg_dump` 加儲存桶的生命週期策略(帶版本、30 天保留)足夠。

**升級。** `brew upgrade soyaos` 或 `docker pull soyaos/soyaos:0.2.0`,重啟服務。schema 遷移在啟動時跑。

**監控。** Moon 在 `/metrics`(鑑權後)暴露 Prometheus 指標。關鍵 SLI:

- `soyaos_run_latency_seconds` ——每個套件的執行延遲直方圖。
- `soyaos_comet_pool_warm` ——每個池的熱 Comet 數。
- `soyaos_scope_events_emitted_total` ——計數。

**鑑權遷移。** 組織 token 長大用不動時,切 OIDC:

```yaml
auth:
  oidc:
    issuer:        https://auth.example.com
    client_id:     soyaos-moon
    client_secret: ${OIDC_SECRET}
```

之後撤銷組織 token。模式是「先加再減」——讓組織 token 多活一天撈掉零散呼叫方。

## 你沒做的事

沒寫 Planet 設定。`cluster` 裡 Moon 兼任 Planet 角色——聯邦正是 `cluster` 不要的。日後需要跨 Moon 路由或多 Moon 共享身分時,再考慮加 Planet(或者升 `ent-cloud`)。

## 想看更多

- [版本](../getting-started/editions.md) ——什麼時候從 `cluster` 遷到 `hybrid` 或 `ent-cloud`。
- [簽名與發布 SoyaPack](./sign-and-publish.md) ——發套件流程做扎實時。
- [HTTP API](../reference/http-api.md) ——直接呼叫 Moon 的客戶端要看。
