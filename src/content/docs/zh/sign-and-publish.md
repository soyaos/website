---
title: 签名与发布 SoyaPack
description: 从笔记本上能跑的包，到 Moon 上签名、可审计、生产就绪的版本。
order: 3
category: guides
---

本地跑通的 SoyaPack 开发够用；要推上有真实流量的 Moon 时，应当**签名**、**打 tag**、**可追溯**。这篇是从 `pack push` 到「我能证明哪个版本在哪天产出了 X」的路径。

## 1. 生成签名 Key

每个开发者或每条发布管线一次性配：

```bash
soyaos auth signkey create --name "chzealot-2026" --algorithm ed25519
# → wrote ~/.config/soyaos/signing-keys/chzealot-2026.{priv,pub}
# → fingerprint: SHA256:N5bA…
```

私钥不离开本机；公钥是 Moon 信任的对象。把 fingerprint 打出来贴到能让人验证的地方（README、内部 wiki）。

CI 里用同一把 Key：把 `.priv` 文件的内容存为 secret，workflow 里写回磁盘后再调 `pack sign`。

## 2. 把公钥注册到 Moon

```bash
soyaos auth signkey publish \
  --moon https://moon.example.com \
  --name "chzealot-2026"
# → registered as keyset entry sk_018f3a, status=pending review
```

新发布的签名 Key 默认**待审核**——Moon 上的管理员要先批准，Moon 才会接受这把 Key 签的包。Solo / 单租户场景下，本人即是管理员，自己批自己：

```bash
soyaos auth signkey approve sk_018f3a --moon https://moon.example.com
```

## 3. 签包

```bash
cd research-summarizer
soyaos pack sign . --key chzealot-2026
# ✓ canonicalized manifest (SHA256: 8d2c…)
# ✓ hashed prompt files, templates, examples
# ✓ signed bundle (Ed25519, key=chzealot-2026, fingerprint=N5bA…)
# wrote .soya/signature.json
```

`pack sign` 生成 `.soya/signature.json`，里面有：

- `soyapack.yaml` 规范化后的 hash。
- 清单引用的每个文件（prompt、template、example）的 hash。
- 签名 Key 的 fingerprint。
- 上面这些的 Ed25519 签名。

这个文件跟清单一起进 git。**别 gitignore** ——签名就是审计轨迹。

## 4. push 到 Moon

```bash
soyaos pack push . --moon https://stage.example.com
# ✓ verified signature against published keyset (sk_018f3a, approved)
# ✓ uploaded bundle 5.2 MB
# → published as soya:research-summarizer@0.1.0 (immutable)
```

Moon 在以下情况拒绝 push：

- 缺签名（生产标记的 Moon 上，`pack push` 默认 `--require-signature`）。
- 签名 Key 在这台 Moon 上没注册或没批准。
- 包实际 hash 跟 `.soya/signature.json` 里的对不上（也就是有人签后改了 prompt 文件）。

## 5. 版本不可变

`soya:research-summarizer@0.1.0` 一旦发布就永不可替换。要修就升版本：

```yaml
# soyapack.yaml
version: 0.1.1
```

……再签、再 push。Moon 现在同时服务两个版本；客户端按需 pin 或用 `@*`。

下线一个版本（**不**删除——v0 永不允许删除）：

```bash
soyaos pack deprecate soya:research-summarizer@0.1.0 \
  --reason "长输入下摘要有 bug" \
  --moon https://stage.example.com
```

被弃用的包对新调用返回 `410 Gone`，但审计日志里依然可查。

## 6. 推到生产

晋升流程在 Moon 之间用 `pull` + `push`：

```bash
soyaos pull --moon https://stage.example.com soya:research-summarizer@0.1.0
soyaos push --moon https://prod.example.com  soya:research-summarizer@0.1.0
```

签名随包一起走。生产 Moon 用自己的 keyset 验签——这是一道有意的信任边界。stage 信任的 Key 不会自动在生产被信任；公钥必须在生产那边也 `signkey publish` 并审批。

一次性麻烦，长期受益：stage 上被攻陷的 Key 不会顺手攻陷生产。

## 7. 审计日志

每个发布版本，Moon 都保存：

| 字段             | 值                                                              |
| ---------------- | --------------------------------------------------------------- |
| `pack`           | `soya:research-summarizer@0.1.0`                                |
| `published_at`   | RFC 3339 UTC。                                                   |
| `published_by`   | 跑 `pack push` 的 Moon 用户。                                    |
| `signed_by`      | 签名 Key 的 fingerprint（`SHA256:N5bA…`）。                      |
| `bundle_sha256`  | 实际上传的包 hash。                                              |
| `manifest_hash`  | 规范化清单的 hash。                                              |

随时查：

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

## 8. Key 轮换

Key 至少每年轮换一次。模式：

```bash
# 签一把新 Key：
soyaos auth signkey create --name "chzealot-2027" --algorithm ed25519
soyaos auth signkey publish --moon https://prod.example.com --name "chzealot-2027"
# 管理员批新 Key。

# 后续 release 用新 Key 签：
soyaos pack sign . --key chzealot-2027

# 可选地退役老 Key（现有包仍可验，但不再接受新 push）：
soyaos auth signkey retire chzealot-2026 --moon https://prod.example.com
```

老 Key 签过的包继续生效——`retire` 只拒绝**新**的 push。

## v1 会加什么

- `soyaos pack sign --transparency-log https://…` ——把签名写进公开、追加式日志（Sigstore 风格）。
- `soyapack.yaml` 里 `signed_by: required` ——给组合其他包的包用，让 `soya:reviewer` 可以要求依赖的 `soya:fact-checker` 必须是某 keyset 签的。
- 通过 PKCS#11 / WebAuthn 做硬件支持的签名。

签名**不**覆盖的部分（运行时能力强制是另一回事）见[能力与沙箱](../concepts/capabilities-sandbox.md)；上线后调用方的 `Authorization: Bearer` 流见 [HTTP API](../reference/http-api.md)。
