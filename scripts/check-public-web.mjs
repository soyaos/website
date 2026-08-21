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

assert(markdownFiles(rootPath).length === 48, "expected 48 localized Markdown outputs");

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

console.log("public HTML/Markdown contract: 48 pairs verified");
