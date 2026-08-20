---
title: CLI v0 参考
description: soyaos 二进制在 v0 暴露的所有命令，含示例输出。
order: 2
category: reference
---

`soyaos` 二进制在 v0 暴露下列命令。每个命令在 v0 内稳定——参数只可**新增**、绝不删除。退出码也稳定（见文末表）。

## 全局参数

```
--config <path>      指定配置文件（默认：~/.config/soyaos/config.yaml）
--log-level <level>  trace | debug | info | warn | error（默认：info）
--json               仅向 stdout 输出 JSON（不显示进度 UI）
--no-color           关闭 ANSI 颜色
--profile <name>     在配置文件的具名 profile 之间切换（默认 "default"）
```

环境变量覆盖配置文件；参数覆盖环境变量。最常用的几个：`SOYAOS_LOG_LEVEL`、`SOYAOS_CONFIG`、`SOYAOS_PROFILE`。

## `soyaos version`

打印版本、commit、构建日期，以及 SoyaPack-v0 schema 版本。

```bash
$ soyaos version
soyaos 0.1.0 (commit 4a9b2c7, built 2026-05-14)
  schema: soyapack v0.1.0
  runtime: linux/amd64
```

JSON 模式（CI 里方便）：

```bash
$ soyaos --json version
{"version":"0.1.0","commit":"4a9b2c7","built":"2026-05-14T08:11:43Z","schema":"v0.1.0","runtime":"linux/amd64"}
```

## `soyaos pack`

本地创建、校验、运行 SoyaPack 包。

| 子命令              | 用途                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| `pack init <name>`  | 以内置模板（`--template <name>`）脚手架新建一个 SoyaPack。                |
| `pack validate .`   | 按 v0 schema 校验 `soyapack.yaml`。                                       |
| `pack lint .`       | 更严格的检查——风格、样例覆盖、能力收敛。                                  |
| `pack push <name>`  | 发布到当前 profile 配置的 Moon。                                          |
| `pack list`         | 列出已安装 / 已发布的包。                                                 |
| `pack rm <name>`    | 本地删除一个包（不能删除被运行中任务引用的包）。                          |

示例：脚手架 → 校验 → 运行：

```bash
$ soyaos pack init hello --template echo
✓ wrote hello/soyapack.yaml
✓ wrote hello/prompts/reply.md
✓ wrote hello/examples/hello.json

$ soyaos pack validate hello
✓ apiVersion ok
✓ kind=Agent ok
✓ capabilities.egress empty（显式写 `egress: []` 让意图清晰）
✓ inputs schema valid
✓ outputs map valid
✓ prompts.reply: 文件存在
ok · 0 errors, 0 warnings
```

`pack lint` 更严：它会对「声明的输入字段没有对应样例」「能力比样例覆盖范围更宽」之类的情况告警：

```bash
$ soyaos pack lint hello
warn  examples 覆盖了 2 个输入变体中的 1 个——给 `topic=null` 加一个 fixture
warn  capabilities.egress 列了 `api.openai.com`，但没有 example 调用它
2 warnings · 用 --strict 让警告失败
```

## `soyaos run`

```
soyaos run <pack-dir> --input <json|@file>
```

在本地 Comet 沙箱里运行一个 SoyaPack。带 `--json` 时把 Scope 事件以 JSON 形式吐到 stdout；否则渲染紧凑的进度 UI。

```bash
$ soyaos run hello --input '{"text":"hi"}'
▶ hello @0.1.0 · 1 stage · capabilities: none
  reply  ████████████  0.8s
✓ run_018f3a · ok in 0.81s
{ "reply": "hi" }
```

JSON 模式按行输出一连串 Scope 事件，以 `run_completed` 结尾：

```bash
$ soyaos --json run hello --input '{"text":"hi"}'
{"kind":"run_started","run_id":"run_018f3a","pack":"hello@0.1.0","ts":"…"}
{"kind":"stage_started","stage":"reply","ts":"…"}
{"kind":"stage_completed","stage":"reply","artifacts":["reply.v1"],"ts":"…"}
{"kind":"run_completed","ok":true,"ts":"…"}
```

常用参数：

- `--input @path/to/input.json` —— 从文件读输入。
- `--timeout 30s` —— 30 秒后强制结束。
- `--cache-mode <off|read|write|rw>` —— 单次运行覆盖 Comet 缓存策略。

## `soyaos serve`

```
soyaos serve --role <comet|moon|planet>
```

以指定角色启一个常驻节点。可以传多个 `--role`——`--role moon --role comet` 是 `cluster` 版本的默认组合。`serve` 一般通过 `soyaos start --edition <name>` 隐式调用；只有需要非标准角色组合时才直接用。

```bash
$ soyaos serve --role moon --bind 0.0.0.0:8443 --state postgres://…
▶ Moon listening on 0.0.0.0:8443
▶ Registry backend: s3://soya-packs/
▶ Scope broker: ws://0.0.0.0:8444
▶ ready in 312ms
```

## `soyaos start`

`serve` 的便捷封装——按 edition 自动挑 `--role` 组合。

```
soyaos start --edition <solo|cluster|cloud|hybrid|ent-cloud|ent-private>
```

```bash
$ soyaos start --edition solo
▶ solo: planet+moon+comet 折叠为同一进程
▶ 监听 127.0.0.1:7474（用 --bind 修改）
▶ Web UI: http://127.0.0.1:7474/
ready · 把 127.0.0.1:7474/v1 粘到任意 OpenAI 兼容客户端即可
```

## `soyaos auth`

| 子命令                      | 用途                                            |
| --------------------------- | ----------------------------------------------- |
| `auth login`                | 浏览器登录到一个 Moon。                         |
| `auth logout`               | 清除当前 Moon 的缓存凭据。                      |
| `auth whoami`               | 打印当前已认证的用户 + Moon。                   |
| `auth keys create`          | 签发一个新的 API Key。                          |
| `auth keys list`            | 列出 API Key（截断；`--reveal` 看完整值）。     |
| `auth keys revoke <id>`     | 吊销一个 API Key。                              |

```bash
$ soyaos auth whoami
user@example.com · moon.example.com · role=admin · 2 keys
```

## `soyaos join`

作为 Comet 加入一个已存在的 Moon：

```bash
$ soyaos join --moon https://moon.example.com --token <invite>
▶ 已验证 Moon 身份（planet=planet.soyaos.ai）
▶ 注册为 comet cmt-a3f1 · pool=default
▶ 能力已接受：egress[api.openai.com:443], fs.read[/workdir], fs.write[/workdir/out]
ready · 等待任务
```

invite token 一次性、15 分钟过期。在 Moon 端用 `auth keys create --kind comet-invite` 签发。

## `soyaos pull` / `soyaos push`

在 Moon 之间镜像 SoyaPack（staging → prod 推上线时常用）：

```bash
$ soyaos pull --moon https://stage.example.com soya:compo@1.4.0
$ soyaos push --moon https://prod.example.com  soya:compo@1.4.0
```

## `soyaos config`

读写当前生效的配置：

```bash
$ soyaos config get default.moon
moon: https://moon.example.com

$ soyaos config set default.moon https://newmoon.example.com
```

## 退出码

| 码  | 含义                                       |
| --- | ------------------------------------------ |
| `0` | 成功                                       |
| `1` | 通用错误                                   |
| `2` | 校验错误（清单、输入等）                   |
| `3` | 沙箱 / 能力越界                            |
| `4` | 鉴权错误                                   |
| `5` | 上游 / 网络错误                            |
| `6` | 超时                                       |
| `124`| （保留给 `timeout(1)` 风格的外层包装）    |

退出码在整个 v0 系列保持稳定——脚本里直接判等没问题。

## 常见工作流

**本地试一份包再 push 到 staging**：

```bash
soyaos pack validate .
soyaos pack lint . --strict
soyaos run . --input @examples/hello.json
soyaos pack push hello --moon https://stage.example.com
```

**把一个新版本推到生产**：

```bash
soyaos pull --moon https://stage.example.com soya:compo@1.4.0
soyaos push --moon https://prod.example.com  soya:compo@1.4.0
soyaos auth keys list --moon https://prod.example.com    # 兜底确认现有 Key 还能用
```

**排查一个失败运行**：

```bash
soyaos run . --input @failed-input.json --log-level debug --json | tee run.log
soyaos --json run . --input @failed-input.json | jq 'select(.kind == "tool_called")'
```
