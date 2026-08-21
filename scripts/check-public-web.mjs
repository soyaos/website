import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import worker from "../public/_worker.js";

const root = new URL("../dist/", import.meta.url);
const rootPath = fileURLToPath(root);
const locales = ["zh", "zh-hant", "en"];
const editorialPaths = ["", "/editions", "/pricing", "/docs"];

function read(relativePath) {
  return readFileSync(new URL(relativePath, root), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

for (const locale of locales) {
  for (const path of editorialPaths) {
    const htmlPath = path ? `${locale}${path}/index.html` : `${locale}/index.html`;
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
      markdown.includes(`Canonical HTML: https://soyaos.ai/${locale}${path}/`),
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

assert(markdownFiles(rootPath).length === 48, "expected 48 localized Markdown outputs");

const robots = read("robots.txt");
assert(robots.includes("User-agent: *\nAllow: /"), "robots must allow public crawling");
assert(robots.includes("Sitemap: https://soyaos.ai/sitemap.xml"), "robots has no sitemap");

const sitemap = read("sitemap.xml");
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(sitemapLocations.length === 48, "sitemap must contain 48 canonical HTML URLs");
assert(sitemapLocations.every((url) => url.endsWith("/") && !url.endsWith(".md/")), "sitemap contains a non-canonical URL");
for (const url of sitemapLocations) {
  const path = new URL(url).pathname.slice(1);
  assert(read(`${path}index.html`).includes(`rel="canonical" href="${url}"`), `${url} is not a canonical 200 build output`);
}
assert((sitemap.match(/hreflang="zh-CN"/g) ?? []).length === 48, "sitemap zh alternates are incomplete");
assert((sitemap.match(/hreflang="zh-Hant"/g) ?? []).length === 48, "sitemap zh-hant alternates are incomplete");
assert((sitemap.match(/hreflang="en-US"/g) ?? []).length === 48, "sitemap en alternates are incomplete");
assert((sitemap.match(/hreflang="x-default"/g) ?? []).length === 48, "sitemap x-default alternates are incomplete");

const llms = read("llms.txt");
const llmsLinks = [...llms.matchAll(/\]\((https:\/\/soyaos\.ai\/[^)]+\.md)\)/g)].map((match) => match[1]);
assert(llmsLinks.length === 48, "llms.txt must list every public Markdown representation");
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
  response.headers.get("link") === '<https://soyaos.ai/zh/docs/quickstart/>; rel="canonical"',
  "wrong Markdown canonical Link header",
);

const llmsResponse = await worker.fetch(
  new Request("https://soyaos.ai/llms.txt"),
  { ASSETS: { fetch: async () => new Response(llms) } },
);
assert(llmsResponse.headers.get("content-type") === "text/markdown; charset=utf-8", "wrong llms.txt content type");

console.log("public discovery contract: 48 HTML/Markdown pairs verified");
