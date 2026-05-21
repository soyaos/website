<p align="center">
  <img src="public/logo.png" alt="SoyaOS" width="120" height="120" />
</p>

# website

Source for **[soyaos.ai](https://soyaos.ai)** — the SoyaOS marketing site.

Static-rendered with Astro 5 + Tailwind, deployed to **Cloudflare Pages**.

## Pages (alpha)

All paths carry a locale prefix (`/zh`, `/zh-hant`, `/en`). The bare `/` is
handled by `public/_worker.js` on Cloudflare Pages — it negotiates
`Accept-Language` and 302-redirects to `/<locale>/`. Local dev and any
non-CF host fall back to `src/pages/index.astro` which does the same
negotiation client-side.

| Path                       | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `/<locale>/`               | Hero + four flagship Agent stories + Why SoyaOS               |
| `/<locale>/editions`       | Comparison matrix for the six editions (Solo → Ent-Private)   |
| `/<locale>/pricing`        | "Free for everyone" during alpha + post-GA monetization plan  |
| `/<locale>/docs`           | Docs landing — sections + intro                               |
| `/<locale>/docs/<slug>`    | Individual docs (quickstart / architecture / editions / …)    |

Docs source markdown lives under `src/content/docs/<locale>/<slug>.md` and is
rendered through Astro's content collections. Search is powered by
[Pagefind](https://pagefind.app/) — the post-build step (`pagefind --site
dist`) indexes pages tagged with `data-pagefind-body` (just the docs
articles) into per-locale indexes.

## Local dev

```bash
bun install
bun run dev          # http://localhost:4321
```

Or, if Bun isn't installed:

```bash
npm install
npm run dev
```

## 中文 Quickstart

SoyaOS 官网源码，Astro 5 + Tailwind，部署到 Cloudflare Pages。本地：

```bash
bun install
bun run dev          # 等价于 npm install && npm run dev
```

构建产物在 `dist/`，可直接给 Cloudflare Pages / Vercel / 任意静态托管。

## Deploy

This site auto-deploys to Cloudflare Pages on every push to `main` via
`.github/workflows/deploy.yml`. Repo secrets required (GitHub → Settings →
Secrets and variables → Actions):

| Secret                  | Where to find / create                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | <https://dash.cloudflare.com/profile/api-tokens> · custom token with permission **Account → Cloudflare Pages → Edit** on the soyaos account. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → any zone → right sidebar **Account ID**.                                                                         |

`GITHUB_TOKEN` is injected automatically by Actions and only used to attach
the deployment status to the commit.

The Cloudflare Pages project must be named **`soyaos-website`**. Either
create it manually in the dashboard (Pages → Create project → Direct
Upload), or let the first workflow run provision it — the `cloudflare/pages-action`
will create the project on first deploy if it doesn't exist.

### Custom domain

Under **Pages → soyaos-website → Custom domains** add:

- `soyaos.ai` — apex, primary domain.
- `www.soyaos.ai` — set to 301-redirect to the apex.

DNS for `soyaos.ai` lives on Cloudflare; the Pages project will receive the
records automatically when you assign the domain.

### Subdomains (separate projects)

| Subdomain               | Source repo                                            |
| ----------------------- | ------------------------------------------------------ |
| `developer.soyaos.ai`   | `soyaos/developer-portal`                              |

> **Note:** docs used to live at `docs.soyaos.ai` on a separate Docusaurus
> repo. The docs are now part of this site at `/<locale>/docs`. If
> `docs.soyaos.ai` is still pointed anywhere, set it up as a 301 redirect
> to `https://soyaos.ai/zh/docs/` (or the appropriate locale) in your
> Cloudflare DNS / Pages config.

## Build

- **Build command**: `bun run build` (or `npm run build`).
- **Output directory**: `dist/`.
- **Node version**: 20.x. Bun 1.1+ works in CI too.

## Deploy

`main` is auto-deployed to the Cloudflare Pages project
`soyaos-website` by `.github/workflows/deploy.yml` on every push.
Apex `soyaos.ai` and `www.soyaos.ai` are bound to that Pages project
via the Cloudflare dashboard; `www.soyaos.ai` is configured as a 301
Single Redirect Rule to `https://soyaos.ai${http.request.uri.path}`.

Required repo secrets (Settings → Secrets and variables → Actions):

| Secret                  | Notes                                                     |
| ----------------------- | --------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Pages:Edit (least privilege).                             |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account that owns the Pages project.           |

Rollback: `wrangler pages deployment list --project-name=soyaos-website`
and promote a previous deployment from the dashboard.

## License

[MIT](./LICENSE) — © 2026 SoyaOS Contributors.
