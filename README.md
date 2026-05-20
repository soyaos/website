# website

Source for **[soyaos.ai](https://soyaos.ai)** — the SoyaOS marketing site.

Static-rendered with Astro 5 + Tailwind, deployed to **Cloudflare Pages**.

## Pages (alpha)

| Path        | Purpose                                                      |
| ----------- | ------------------------------------------------------------ |
| `/`         | Hero + four flagship Agent stories + Why SoyaOS              |
| `/editions` | Comparison matrix for the six editions (Solo → Ent-Private)  |
| `/pricing`  | "Free for everyone" during alpha + post-GA monetization plan |
| `/docs`     | Meta-redirect to <https://docs.soyaos.ai>                    |

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
| `docs.soyaos.ai`        | `soyaos/docs` (Docusaurus)                             |
| `developer.soyaos.ai`   | `soyaos/developer-portal`                              |

## Build

- **Build command**: `bun run build` (or `npm run build`).
- **Output directory**: `dist/`.
- **Node version**: 20.x. Bun 1.1+ works in CI too.

## License

[MIT](./LICENSE) — © 2026 SoyaOS Contributors.
