import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../public/_worker.js";

const root = new URL("../dist/", import.meta.url);
const rootPath = fileURLToPath(root);
const locales = ["zh", "zh-hant", "en"];
const editorialPaths = ["", "/editions", "/pricing", "/docs"];
const expectedDocSlugs = [
  "quickstart",
  "cloud-quickstart",
  "architecture",
  "editions",
  "capabilities-sandbox",
  "virtual-models",
  "scope-events",
  "writing-an-agent",
  "self-host-moon",
  "sign-and-publish",
  "soyapack-v0",
  "cli-v0",
  "http-api",
];
const expectedPublicPairs = locales.length * (editorialPaths.length + expectedDocSlugs.length);

function read(relativePath) {
  return readFileSync(new URL(relativePath, root), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const locale of locales) {
  for (const path of editorialPaths) {
    const htmlPath = path ? `${locale}${path}.html` : `${locale}.html`;
    const markdownPath = path ? `${locale}${path}.md` : `${locale}.md`;
    const html = read(htmlPath);
    const markdown = read(markdownPath);
    const alternate = `https://soyaos.ai/${locale}${path}.md`;
    assert(
      html.includes(`rel="alternate" type="text/markdown" href="${alternate}"`),
      `${htmlPath} has no real Markdown alternate`,
    );
    assert(markdown.startsWith("# "), `${markdownPath} has no heading`);
    assert(
      markdown.includes(`Canonical HTML: https://soyaos.ai/${locale}${path}`),
      `${markdownPath} has no canonical source pointer`,
    );
  }
}

function markdownFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? markdownFiles(path) : path.endsWith(".md") ? [path] : [];
  });
}

assert(
  markdownFiles(rootPath).length === expectedPublicPairs,
  `expected ${expectedPublicPairs} localized Markdown outputs`,
);
assert(read("404.html").includes('content="noindex, nofollow"'), "custom 404 page must be noindex");

for (const locale of locales) {
  const path = `${locale}/docs/cloud-quickstart`;
  const html = read(`${path}.html`);
  const markdown = read(`${path}.md`);
  const canonical = `https://soyaos.ai/${path}`;
  assert(html.includes(`rel="canonical" href="${canonical}"`), `${path} has no slashless canonical`);
  assert(
    html.includes(`rel="alternate" type="text/markdown" href="${canonical}.md"`),
    `${path} has no Markdown alternate`,
  );
  assert(html.includes("https://api.soyaos.ai/v1/chat/completions"), `${path} has no production Cloud call`);
  assert(markdown.includes("soya:starter"), `${path}.md has no starter scenario`);
  assert(markdown.includes(`Canonical HTML: ${canonical}`), `${path}.md has no canonical source pointer`);
  assert(
    read(`${locale}/docs.html`).includes(`href="/${locale}/docs/cloud-quickstart"`),
    `${locale}/docs does not expose the Cloud quickstart`,
  );
}

const robots = read("robots.txt");
assert(robots.includes("User-agent: *\nAllow: /"), "robots must allow public crawling");
assert(robots.includes("Sitemap: https://soyaos.ai/sitemap.xml"), "robots has no sitemap");

const sitemap = read("sitemap.xml");
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(
  sitemapLocations.length === expectedPublicPairs,
  `sitemap must contain ${expectedPublicPairs} canonical HTML URLs`,
);
assert(sitemapLocations.every((url) => !new URL(url).pathname.endsWith("/")), "sitemap contains a trailing-slash URL");
for (const url of sitemapLocations) {
  const path = new URL(url).pathname.slice(1);
  assert(read(`${path}.html`).includes(`rel="canonical" href="${url}"`), `${url} is not a canonical 200 build output`);
}
assert((sitemap.match(/hreflang="zh-CN"/g) ?? []).length === expectedPublicPairs, "sitemap zh alternates are incomplete");
assert((sitemap.match(/hreflang="zh-Hant"/g) ?? []).length === expectedPublicPairs, "sitemap zh-hant alternates are incomplete");
assert((sitemap.match(/hreflang="en-US"/g) ?? []).length === expectedPublicPairs, "sitemap en alternates are incomplete");
assert((sitemap.match(/hreflang="x-default"/g) ?? []).length === expectedPublicPairs, "sitemap x-default alternates are incomplete");

const llms = read("llms.txt");
const llmsLinks = [...llms.matchAll(/\]\((https:\/\/soyaos\.ai\/[^)]+\.md)\)/g)].map((match) => match[1]);
assert(llmsLinks.length === expectedPublicPairs, "llms.txt must list every public Markdown representation");
for (const url of llmsLinks) {
  assert(read(new URL(url).pathname.slice(1)).startsWith("# "), `${url} is not a real Markdown output`);
}

const markdownAsset = new Response("# Test\n", { headers: { etag: "example" } });
const response = await worker.fetch(
  new Request("https://soyaos.ai/zh/docs/quickstart.md"),
  { ASSETS: { fetch: async () => markdownAsset } },
);
assert(response.headers.get("content-type") === "text/markdown; charset=utf-8", "wrong Markdown content type");
assert(response.headers.get("x-robots-tag") === "noindex", "Markdown must be noindex");
assert(
  response.headers.get("link") === '<https://soyaos.ai/zh/docs/quickstart>; rel="canonical"',
  "wrong Markdown canonical Link header",
);

const llmsResponse = await worker.fetch(
  new Request("https://soyaos.ai/llms.txt"),
  { ASSETS: { fetch: async () => new Response(llms) } },
);
assert(llmsResponse.headers.get("content-type") === "text/markdown; charset=utf-8", "wrong llms.txt content type");

const singularLlmsResponse = await worker.fetch(
  new Request("https://soyaos.ai/llm.txt"),
  { ASSETS: { fetch: async () => new Response("must not run") } },
);
assert(singularLlmsResponse.status === 404, "the obsolete singular /llm.txt path must be absent");

for (const testCase of [
  { header: "zh-HK", location: "https://soyaos.ai/zh-hant/docs/quickstart?from=e2e" },
  { header: "ja", location: "https://soyaos.ai/en/docs/quickstart?from=e2e" },
]) {
  const negotiated = await worker.fetch(
    new Request("https://soyaos.ai/docs/quickstart?from=e2e", {
      headers: { "accept-language": testCase.header },
    }),
    { ASSETS: { fetch: async () => new Response("must not run") } },
  );
  assert(negotiated.status === 302, `locale-less docs status for ${testCase.header}`);
  assert(negotiated.headers.get("location") === testCase.location, `locale-less docs location for ${testCase.header}`);
}

for (const path of ["/en/", "/en/docs/", "/zh/docs/scope-events/"]) {
  const canonical = await worker.fetch(
    new Request(`https://soyaos.ai${path}?from=legacy`),
    { ASSETS: { fetch: async () => new Response("must not run") } },
  );
  assert(canonical.status === 308, `${path} must permanently redirect`);
  assert(
    canonical.headers.get("location") === `https://soyaos.ai${path.slice(0, -1)}?from=legacy`,
    `${path} has the wrong slashless location`,
  );
}

console.log(`public discovery contract: ${expectedPublicPairs} HTML/Markdown pairs verified`);
