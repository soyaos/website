---
title: 快速上手
description: 五分钟从零跑起 soya:echo Agent。
order: 1
category: getting-started
---

从「什么都没装」到「`soya:echo` 跑起来」，五分钟搞定。整个过程都在你的笔记本上的 `solo` 版本里跑——不用注册、不要 API Key、零遥测。

## 1. 安装

### macOS / Linux（Homebrew，推荐）

```bash
brew tap soyaos/soyaos
brew install soyaos
```

### macOS / Linux（一行脚本）

不喜欢 Homebrew：

```bash
curl -L https://soyaos.ai/install | sh
```

脚本会把最新 release 的二进制下载到 `/usr/local/bin/soyaos`，校验签名。脚本幂等、每一步都会打印——想看就先 `curl ... -o install.sh` 再看。

### Windows（Scoop）

```powershell
scoop bucket add soyaos https://github.com/soyaos/scoop-bucket
scoop install soyaos
```

### Docker

```bash
docker run --rm -it -p 7474:7474 -v soyaos-state:/state soyaos/soyaos:0.1.0
```

容器里二进制自动识别为 `--edition solo`，绑到 `0.0.0.0:7474`。

### 从源码

```bash
git clone https://github.com/soyaos/soyaos
cd soyaos && make install
```

需要 Go 1.22+。要打带 patch 的版本时用。

### 验证

不管哪种方式，确认二进制在 `PATH` 上、版本号合理：

```bash
$ soyaos version
soyaos 0.1.0 (commit 4a9b2c7, built 2026-05-14)
  schema: soyapack v0.1.0
  runtime: darwin/arm64
```

## 2. 脚手架

用内置的 `echo` 模板创建一个新的 SoyaPack：

```bash
soyaos pack init hello --template echo
cd hello
```

会生成一个最小的 SoyaPack v0 包：

```
hello/
├── soyapack.yaml
├── prompts/
│   └── reply.md
└── examples/
    └── hello.json
```

`echo` 是最简模板——没有上游 LLM 调用、没有工具、没有能力声明。一个 prompt 阶段，把输入原样吐出来。其他几个值得看的模板：

- `pack init hello --template chat`——单轮上游 LLM 调用。
- `pack init hello --template tool`——Agent + 一个外部 HTTP 工具。
- `pack init hello --template artifact`——产出结构化 JSON 产物。

## 3. 校验

```bash
soyaos pack validate .
```

校验器会按 SoyaPack v0 schema 检查清单文件，能力声明缺失时立即报错。再加一道 `pack lint .` 跑更严格的风格和覆盖检查——`validate` 接受任何符合 spec 的，`lint` 更接近「看起来像生产可发」。

## 4. 运行

```bash
soyaos run . --input '{"text":"hi"}'
```

预期看到：

```bash
▶ hello @0.1.0 · 1 stage · capabilities: none
  reply  ████████████  0.8s
✓ run_018f3a · ok in 0.81s
{ "reply": "hi" }
```

想看原始 Scope 事件而不是进度 UI：

```bash
soyaos --json run . --input '{"text":"hi"}'
```

## 5. 接到 OpenAI 客户端

`soyaos start --edition solo` 会跑一个本地 Moon，在 `127.0.0.1:7474/v1` 上讲 OpenAI 协议。任何 OpenAI 兼容客户端都能直接用：

```bash
soyaos start --edition solo &
# 另开一个终端：
curl http://127.0.0.1:7474/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "soya:hello",
    "messages": [{"role": "user", "content": "hi"}]
  }'
```

或者把 `http://127.0.0.1:7474/v1` 粘到 [Cherry Studio](https://cherry-ai.com/)、[Open WebUI](https://github.com/open-webui/open-webui) 或任何让你填 OpenAI base URL 的工具里。

## 排障

**`address already in use`**——7474 端口被占。用 `--bind 127.0.0.1:8888` 换端口，或者 `lsof -i :7474` 找出占用进程杀掉。

**`capability violation: egress`**——你的 SoyaPack 想出网到一个不在 `capabilities.egress` 白名单里的主机。要么把主机加到清单（重新 validate），要么去掉那次工具调用。

**`pack validate` 报「manifest: apiVersion missing」**——你大概在改一个老 SoyaPack 版本的模板。第一行改成 `apiVersion: soyaos.ai/v0`。

**Mac Gatekeeper 拦了二进制**——一次性执行 `xattr -d com.apple.quarantine $(which soyaos)`。Homebrew 装的会自动处理；手动装的会撞上。

**卡在 `cold-starting comet…` 超过 30 秒**——你机器的容器 runtime 慢。设 `SOYAOS_COMET_RUNTIME=process` 跳过容器层（**只在开发时用**——会放弃沙箱）。

## FAQ

**状态存哪里？** Linux/macOS 在 `~/.local/share/soyaos/`，Windows 在 `%LOCALAPPDATA%\soyaos\`。删掉就能彻底重置。

**它会回家吗？** 不会。零遥测、零分析、零远程配置。`solo` 默认只监听 `127.0.0.1`。

**怎么卸？** `brew uninstall soyaos`，再把状态目录删掉。源码装的就在源码树里 `make uninstall`。

**接下来呢？**

- 读[架构](./architecture.md)，搞懂 Planet / Moon / Comet。
- 在[版本](./editions.md)里挑一种部署形态。
- 翻一翻 [SoyaPack v0 清单参考](./soyapack-v0.md)，开始搭自己的 Agent。
- 做一个实际项目：[从零写一个 Agent](./writing-an-agent.md)。
