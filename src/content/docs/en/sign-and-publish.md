---
title: Sign and publish a SoyaPack
description: From a working pack on your laptop to a signed, audited, prod-ready version on a Moon.
order: 3
category: guides
---

A SoyaPack you ran locally is fine for development; one you publish to a Moon serving real traffic should be **signed**, **tagged**, and **traceable**. This guide is the path from `pack push` to "I can prove which pack version produced output X on date Y."

## 1. Generate a signing key

One-time setup per developer or per release pipeline:

```bash
soyaos auth signkey create --name "chzealot-2026" --algorithm ed25519
# → wrote ~/.config/soyaos/signing-keys/chzealot-2026.{priv,pub}
# → fingerprint: SHA256:N5bA…
```

The private key never leaves the machine; the public key is what the Moon trusts. Print the fingerprint and stash it somewhere people can verify (README, internal wiki).

To use the same key in CI, store the contents of the `.priv` file as a secret and write it back to disk in the workflow before invoking `pack sign`.

## 2. Register the public key with the Moon

```bash
soyaos auth signkey publish \
  --moon https://moon.example.com \
  --name "chzealot-2026"
# → registered as keyset entry sk_018f3a, status=pending review
```

By default newly published signing keys are **pending review** — an admin on the Moon has to approve them before the Moon will accept signed packs from that key. For solo / single-tenant setups, the same person is admin and approves their own key:

```bash
soyaos auth signkey approve sk_018f3a --moon https://moon.example.com
```

## 3. Sign the pack

```bash
cd research-summarizer
soyaos pack sign . --key chzealot-2026
# ✓ canonicalized manifest (SHA256: 8d2c…)
# ✓ hashed prompt files, templates, examples
# ✓ signed bundle (Ed25519, key=chzealot-2026, fingerprint=N5bA…)
# wrote .soya/signature.json
```

`pack sign` produces `.soya/signature.json`, which contains:

- Canonical hash of `soyapack.yaml`.
- Hashes of every file referenced from the manifest (prompt files, templates, examples).
- The signing key's fingerprint.
- An Ed25519 signature over the above.

This file is committed to git alongside the manifest. **Don't gitignore it** — the signature is the audit trail.

## 4. Push to the Moon

```bash
soyaos pack push . --moon https://stage.example.com
# ✓ verified signature against published keyset (sk_018f3a, approved)
# ✓ uploaded bundle 5.2 MB
# → published as soya:research-summarizer@0.1.0 (immutable)
```

The Moon refuses the push if:

- The signature is missing (`pack push` defaults to `--require-signature` on production-flagged Moons).
- The signing key isn't registered + approved on this Moon.
- The bundle's actual hashes don't match those in `.soya/signature.json` (i.e., somebody modified a prompt file after signing).

## 5. Versions are immutable

Once `soya:research-summarizer@0.1.0` is published, it can never be replaced. To ship a fix you bump the version:

```yaml
# soyapack.yaml
version: 0.1.1
```

…then re-sign and re-push. The Moon now serves two versions; clients pin or use `@*`.

To retire a version (without deleting — deletion is never allowed in v0):

```bash
soyaos pack deprecate soya:research-summarizer@0.1.0 \
  --reason "buggy summary on long inputs" \
  --moon https://stage.example.com
```

Deprecated packs return `410 Gone` for new runs but stay queryable in the audit log.

## 6. Promote to prod

The promotion flow uses `pull` + `push` between Moons:

```bash
soyaos pull --moon https://stage.example.com soya:research-summarizer@0.1.0
soyaos push --moon https://prod.example.com  soya:research-summarizer@0.1.0
```

The signature travels with the pack. Prod's Moon verifies it against prod's own keyset — which is a deliberate trust boundary. You can't just because stage trusted a key trust it in prod automatically; the public key has to be `signkey publish`ed and approved on prod too.

This is annoying once and great forever after: a signing key compromised on stage doesn't auto-compromise prod.

## 7. The audit log

For every published version, the Moon stores:

| Field           | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| `pack`          | `soya:research-summarizer@0.1.0`                               |
| `published_at`  | RFC 3339 UTC.                                                   |
| `published_by`  | The Moon user who ran `pack push`.                              |
| `signed_by`     | The signing key's fingerprint (`SHA256:N5bA…`).                  |
| `bundle_sha256` | Hash of the actual uploaded bundle.                              |
| `manifest_hash` | Hash of the canonicalized manifest.                             |

You can query it any time:

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

## 8. Key rotation

Keys should rotate at least annually. The pattern:

```bash
# Mint the new key:
soyaos auth signkey create --name "chzealot-2027" --algorithm ed25519
soyaos auth signkey publish --moon https://prod.example.com --name "chzealot-2027"
# Admin approves the new key.

# Sign upcoming releases with the new key:
soyaos pack sign . --key chzealot-2027

# Optionally retire the old key (existing packs stay verifiable, no new pushes):
soyaos auth signkey retire chzealot-2026 --moon https://prod.example.com
```

Existing packs signed with the retired key keep working — `retire` only refuses *new* pushes signed by it.

## What's coming in v1

- `soyaos pack sign --transparency-log https://…` — write the signature to a public, append-only log (Sigstore-style).
- `signed_by: required` in `soyapack.yaml` for packs that compose other packs — so a `soya:reviewer` can require its `soya:fact-checker` dependency be signed by a specific keyset.
- Hardware-backed signing via PKCS#11 / WebAuthn.

See [Capabilities & sandbox](../concepts/capabilities-sandbox.md) for what the signature does NOT cover (run-time capability enforcement is separate), and [HTTP API](../reference/http-api.md) for the `Authorization: Bearer` flow once your pack is live.
