# website

Source for **[soyaos.ai](https://soyaos.ai)** — the SoyaOS marketing site.

Static-rendered with Astro 5 + Tailwind, deployed to **Cloudflare Pages**.

## Pages (alpha)

| Path        | Purpose                                                           |
| ----------- | ----------------------------------------------------------------- |
| `/`         | Hero + four flagship Agent stories                                |
| `/editions` | Comparison table of the six SoyaOS editions                       |
| `/pricing`  | "Free for everyone" during the alpha                              |
| `/docs`     | Meta-redirect to <https://docs.soyaos.ai>                          |

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

## Deployment

- **Production**: Cloudflare Pages, custom domain `soyaos.ai`.
- **Build command**: `bun run build` (or `npm run build`).
- **Output directory**: `dist/`.
- **Node version**: 20.x. Bun 1.1+ works in CI too.

DNS:

- `soyaos.ai` → Cloudflare Pages.
- `docs.soyaos.ai` → see `soyaos/docs` (Docusaurus).
- `developer.soyaos.ai` → see `soyaos/developer-portal`.

## License

[MIT](./LICENSE) — © 2026 SoyaOS Contributors.
