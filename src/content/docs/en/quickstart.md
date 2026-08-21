---
title: Solo local quickstart
description: Five minutes from zero to a running soya:echo Agent on your own computer.
order: 1
category: getting-started
---

Five minutes from "nothing installed" to a running `soya:echo`. This walkthrough runs entirely on your laptop in the `solo` edition — no signup, no API key, no telemetry.

Want to skip installation and operations and call a hosted Agent instead? Follow the [Cloud quickstart](/en/docs/cloud-quickstart).

## 1. Install

### macOS / Linux (Homebrew, recommended)

```bash
brew tap soyaos/soyaos
brew install soyaos
```

### macOS / Linux (one-line installer)

If Homebrew isn't your style:

```bash
curl -L https://soyaos.ai/install | sh
```

The script downloads the latest release binary into `/usr/local/bin/soyaos` and verifies its signature. Inspect it first if you want — it's idempotent and prints every action.

### Windows (Scoop)

```powershell
scoop bucket add soyaos https://github.com/soyaos/scoop-bucket
scoop install soyaos
```

### Docker

```bash
docker run --rm -it -p 7474:7474 -v soyaos-state:/state soyaos/soyaos:0.1.0
```

Inside the container the binary auto-detects `--edition solo` and binds to `0.0.0.0:7474`.

### From source

```bash
git clone https://github.com/soyaos/soyaos
cd soyaos && make install
```

Requires Go 1.22+. Useful when you need a build with a custom patch.

### Verify

Whichever method you used, confirm the binary is on `PATH` and reports a sane version:

```bash
$ soyaos version
soyaos 0.1.0 (commit 4a9b2c7, built 2026-05-14)
  schema: soyapack v0.1.0
  runtime: darwin/arm64
```

## 2. Scaffold

Create a new SoyaPack from the bundled `echo` template:

```bash
soyaos pack init hello --template echo
cd hello
```

This produces a minimal SoyaPack v0 bundle:

```
hello/
├── soyapack.yaml
├── prompts/
│   └── reply.md
└── examples/
    └── hello.json
```

`echo` is the simplest template — it has no upstream LLM call, no tools, no capabilities. Just a single prompt stage that mirrors its input. Other templates worth poking at:

- `pack init hello --template chat` — single-turn upstream LLM call.
- `pack init hello --template tool` — Agent + one external HTTP tool.
- `pack init hello --template artifact` — produces a structured JSON artifact.

## 3. Validate

```bash
soyaos pack validate .
```

The validator checks the manifest against the SoyaPack v0 schema and fails fast on missing capabilities. Run `pack lint .` for stricter style and coverage checks — `validate` accepts anything that's spec-legal, `lint` is closer to "looks like production-ready".

## 4. Run

```bash
soyaos run . --input '{"text":"hi"}'
```

You should see:

```bash
▶ hello @0.1.0 · 1 stage · capabilities: none
  reply  ████████████  0.8s
✓ run_018f3a · ok in 0.81s
{ "reply": "hi" }
```

If you want the raw Scope events instead of the progress UI:

```bash
soyaos --json run . --input '{"text":"hi"}'
```

## 5. Wire up an OpenAI client

`soyaos start --edition solo` runs a local Moon that speaks OpenAI on `127.0.0.1:7474/v1`. Any OpenAI-compatible client can use it directly:

```bash
soyaos start --edition solo &
# In another terminal:
curl http://127.0.0.1:7474/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "soya:hello",
    "messages": [{"role": "user", "content": "hi"}]
  }'
```

Or paste `http://127.0.0.1:7474/v1` into [Cherry Studio](https://cherry-ai.com/), [Open WebUI](https://github.com/open-webui/open-webui), or any other tool that asks for an OpenAI-compatible base URL.

## Troubleshooting

**`address already in use`** — Port 7474 is taken. Pick another with `--bind 127.0.0.1:8888`, or kill the previous process (`lsof -i :7474` to find it).

**`capability violation: egress`** — Your SoyaPack tried to reach an outbound host that isn't in its `capabilities.egress` allowlist. Either add the host to the manifest (and re-validate) or remove the tool call.

**`pack validate` says "manifest: apiVersion missing"** — You're probably editing a template from an older SoyaPack version. Update the first line to `apiVersion: soyaos.ai/v0`.

**Mac Gatekeeper blocks the binary** — Run `xattr -d com.apple.quarantine $(which soyaos)` once. The Homebrew tap handles this automatically; only the manual install paths hit it.

**Stuck in `cold-starting comet…` for >30s** — Your machine's container runtime is slow. Set `SOYAOS_COMET_RUNTIME=process` to skip the container layer (development only — gives up the sandbox).

## FAQ

**Where is state stored?** `~/.local/share/soyaos/` on Linux/macOS, `%LOCALAPPDATA%\soyaos\` on Windows. Delete it to fully reset.

**Does it phone home?** No. Zero telemetry, zero analytics, zero remote config. `solo` only listens on `127.0.0.1` by default.

**Can I uninstall?** `brew uninstall soyaos` plus removing the state dir. `make uninstall` from the source tree if you built from source.

**What's next?**

- Read [Architecture](./architecture.md) to understand Planet / Moon / Comet.
- Pick a deployment shape in [Editions](./editions.md).
- Browse the [SoyaPack v0 manifest reference](./soyapack-v0.md) to build your own Agent.
- Build something real: [Writing an Agent from scratch](./writing-an-agent.md).
