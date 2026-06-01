#!/usr/bin/env node
/** One-time helper: ensure site-nav placeholder on pages (manual run if needed). */
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const NAV_BLOCK =
  '<nav class="stats statsRow" data-ar-nav data-ar-nav-current="PAGE" aria-label="القائمة الرئيسية"></nav>';

const PAGE_ID = {
  "matching.html": "matching",
  "phrases.html": "phrases",
  "writing.html": "writing",
  "saved.html": "saved",
  "hidden.html": "hidden",
  "hidden-words.html": "hidden",
  "hidden-sentences.html": "hidden",
  "phrases-saved.html": "saved",
  "topic.html": "topics",
  "topics.html": "topics",
  "curate.html": "curate",
};

for (const file of readdirSync(ROOT).filter((f) => f.endsWith(".html"))) {
  if (file === "index.html" || file === "curate.html") continue;
  let s = readFileSync(join(ROOT, file), "utf8");
  if (!s.includes("data-ar-nav") && PAGE_ID[file]) {
  }
  if (!s.includes("site-nav.js")) {
    s = s.replace(/<\/body>/i, '    <script src="./site-nav.js" defer></script>\n  </body>');
  }
  if (!s.includes('lang="ar"') && file !== "index.html") {
    s = s.replace(/<html lang="en">/i, '<html lang="ar" dir="rtl">');
  }
  writeFileSync(join(ROOT, file), s);
}
console.log("patched");
