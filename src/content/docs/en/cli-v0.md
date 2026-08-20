---
title: CLI v0 reference
description: Every verb the soyaos binary exposes in v0, with example output.
order: 2
category: reference
---

The `soyaos` binary exposes the verbs below in v0. Each verb is stable within v0 — flags may be **added**, never removed. Exit codes are stable too (see the table at the end).

## Global flags

```
--config <path>      Override config file (default: ~/.config/soyaos/config.yaml)
--log-level <level>  trace | debug | info | warn | error (default: info)
--json               Emit JSON-only on stdout (no progress UI)
--no-color           Disable ANSI colors
--profile <name>     Switch between named profiles in config (default: "default")
```

Environment variables override the config file; flags override env vars. `SOYAOS_LOG_LEVEL`, `SOYAOS_CONFIG`, `SOYAOS_PROFILE` are the most commonly used ones.

## `soyaos version`

Print version, commit, build date, and the SoyaPack-v0 schema version.

```bash
$ soyaos version
soyaos 0.1.0 (commit 4a9b2c7, built 2026-05-14)
  schema: soyapack v0.1.0
  runtime: linux/amd64
```

JSON mode (handy in CI):

```bash
$ soyaos --json version
{"version":"0.1.0","commit":"4a9b2c7","built":"2026-05-14T08:11:43Z","schema":"v0.1.0","runtime":"linux/amd64"}
```

## `soyaos pack`

Create, validate and run SoyaPack bundles locally.

| Subcommand          | Purpose                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `pack init <name>`  | Scaffold a new SoyaPack from a built-in template (`--template <name>`).  |
| `pack validate .`   | Validate `soyapack.yaml` against the v0 schema.                          |
| `pack lint .`       | Stricter checks — style, examples coverage, capability narrowing.        |
| `pack push <name>`  | Publish to the Moon configured in the current profile.                   |
| `pack list`         | List installed / published packs.                                        |
| `pack rm <name>`    | Remove a pack locally (cannot remove a pack referenced by a live run).   |

Example: scaffold + validate + run:

```bash
$ soyaos pack init hello --template echo
✓ wrote hello/soyapack.yaml
✓ wrote hello/prompts/reply.md
✓ wrote hello/examples/hello.json

$ soyaos pack validate hello
✓ apiVersion ok
✓ kind=Agent ok
✓ capabilities.egress empty (declaring `egress: []` makes intent explicit)
✓ inputs schema valid
✓ outputs map valid
✓ prompts.reply: file exists
ok · 0 errors, 0 warnings
```

`pack lint` is stricter — it'll warn on things like missing examples for declared input fields, or capabilities wider than the example coverage justifies:

```bash
$ soyaos pack lint hello
warn  examples cover 1 of 2 input variants — add a fixture for `topic=null`
warn  capabilities.egress lists `api.openai.com` but no example exercises it
2 warnings · use --strict to fail on warnings
```

## `soyaos run`

```
soyaos run <pack-dir> --input <json|@file>
```

Runs a SoyaPack in a local Comet sandbox. Streams Scope events to stdout when `--json` is set, otherwise renders a compact progress UI.

```bash
$ soyaos run hello --input '{"text":"hi"}'
▶ hello @0.1.0 · 1 stage · capabilities: none
  reply  ████████████  0.8s
✓ run_018f3a · ok in 0.81s
{ "reply": "hi" }
```

JSON mode emits a stream of Scope events, one per line, ending in `run_completed`:

```bash
$ soyaos --json run hello --input '{"text":"hi"}'
{"kind":"run_started","run_id":"run_018f3a","pack":"hello@0.1.0","ts":"…"}
{"kind":"stage_started","stage":"reply","ts":"…"}
{"kind":"stage_completed","stage":"reply","artifacts":["reply.v1"],"ts":"…"}
{"kind":"run_completed","ok":true,"ts":"…"}
```

Useful flags:

- `--input @path/to/input.json` — read input from file.
- `--timeout 30s` — kill the run after 30s.
- `--cache-mode <off|read|write|rw>` — override the Comet's cache for this run.

## `soyaos serve`

```
soyaos serve --role <comet|moon|planet>
```

Starts a long-lived node in the given role. Multiple `--role` flags are allowed — `--role moon --role comet` is the default for the `cluster` edition. `serve` is mostly used implicitly via `soyaos start --edition <name>`; reach for it directly only when you want a non-standard role mix.

```bash
$ soyaos serve --role moon --bind 0.0.0.0:8443 --state postgres://…
▶ Moon listening on 0.0.0.0:8443
▶ Registry backend: s3://soya-packs/
▶ Scope broker: ws://0.0.0.0:8444
▶ ready in 312ms
```

## `soyaos start`

Convenience wrapper around `serve` that picks the right `--role` set for the given edition.

```
soyaos start --edition <solo|cluster|cloud|hybrid|ent-cloud|ent-private>
```

```bash
$ soyaos start --edition solo
▶ solo: planet+moon+comet collapsed into one process
▶ Listening on 127.0.0.1:7474 (set --bind to change)
▶ Web UI: http://127.0.0.1:7474/
ready · paste 127.0.0.1:7474/v1 into any OpenAI-compatible client
```

## `soyaos auth`

| Subcommand                  | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `auth login`                | Browser-based login to a Moon.                 |
| `auth logout`               | Drop cached credentials for the current Moon.  |
| `auth whoami`               | Print the currently-authenticated user + Moon. |
| `auth keys create`          | Mint a new API key.                            |
| `auth keys list`            | List API keys (truncated; show full with `--reveal`). |
| `auth keys revoke <id>`     | Revoke an API key.                             |

```bash
$ soyaos auth whoami
user@example.com · moon.example.com · role=admin · 2 keys
```

## `soyaos join`

Join an existing Moon as a Comet:

```bash
$ soyaos join --moon https://moon.example.com --token <invite>
▶ Verified Moon identity (planet=planet.soyaos.ai)
▶ Registered as comet cmt-a3f1 · pool=default
▶ Capabilities accepted: egress[api.openai.com:443], fs.read[/workdir], fs.write[/workdir/out]
ready · awaiting work
```

The invite token is single-use and expires after 15 minutes. You can mint one with `auth keys create --kind comet-invite` on the Moon.

## `soyaos pull` / `soyaos push`

Mirror SoyaPacks between Moons (useful when promoting from staging to prod):

```bash
$ soyaos pull --moon https://stage.example.com soya:compo@1.4.0
$ soyaos push --moon https://prod.example.com  soya:compo@1.4.0
```

## `soyaos config`

Print and edit the current effective config:

```bash
$ soyaos config get default.moon
moon: https://moon.example.com

$ soyaos config set default.moon https://newmoon.example.com
```

## Exit codes

| Code | Meaning                                    |
| ---- | ------------------------------------------ |
| `0`  | Success                                    |
| `1`  | Generic error                              |
| `2`  | Validation error (manifest, input, etc.)   |
| `3`  | Sandbox / capability violation             |
| `4`  | Auth error                                 |
| `5`  | Upstream / network error                   |
| `6`  | Timeout                                    |
| `124`| (Reserved for `timeout(1)`-style wrappers) |

Exit codes are stable across the v0 series — you can script against them safely.

## Common workflows

**Test a pack locally then push to staging**:

```bash
soyaos pack validate .
soyaos pack lint . --strict
soyaos run . --input @examples/hello.json
soyaos pack push hello --moon https://stage.example.com
```

**Roll out a new pack version to prod**:

```bash
soyaos pull --moon https://stage.example.com soya:compo@1.4.0
soyaos push --moon https://prod.example.com  soya:compo@1.4.0
soyaos auth keys list --moon https://prod.example.com    # sanity-check existing keys still work
```

**Investigate a failing run**:

```bash
soyaos run . --input @failed-input.json --log-level debug --json | tee run.log
soyaos --json run . --input @failed-input.json | jq 'select(.kind == "tool_called")'
```
