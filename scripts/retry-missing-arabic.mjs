#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import vm from "vm";

const ROOT = join(import.meta.dirname, "..");
const CACHE = join(import.meta.dirname, ".translation-cache.json");
const DELAY_MS = 1200;

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function loadCache() {
  try {
    return JSON.parse(readFileSync(CACHE, "utf8"));
  } catch {
    return {};
  }
}

async function translate(text, pair) {
  const q = encodeURIComponent(text.slice(0, 450));
  const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${pair}`;
  const res = await fetch(url);
  if (res.status === 429) throw new Error("429");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const out = data?.responseData?.translatedText?.trim();
  if (!out) throw new Error("empty");
  return out;
}

function loadBanks() {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), ctx);
  const arBank = [...ctx.window.WORD_BANK];

  const sctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync("/tmp/spanish-flashcards/wordbank.js", "utf8"), sctx);
  const esByEn = new Map();
  for (const w of sctx.window.WORD_BANK) {
    esByEn.set(w.en.trim(), w.es);
  }
  return { arBank, esByEn };
}

async function main() {
  const { arBank, esByEn } = loadBanks();
  const cache = loadCache();
  let fixed = 0;
  let failed = 0;

  for (let i = 0; i < arBank.length; i++) {
    const w = arBank[i];
    if (hasArabic(w.ar)) continue;

    const es = esByEn.get(w.en.trim());
    const cacheKey = `ar:${w.en}`;
    let ar = cache[cacheKey];

    if (!ar || !hasArabic(ar)) {
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          if (es) {
            ar = await translate(es, "es|ar");
          } else {
            ar = await translate(w.en, "en|ar");
          }
          cache[cacheKey] = ar;
          break;
        } catch (e) {
          if (e.message === "429") {
            const wait = DELAY_MS * (attempt + 2);
            console.log(`  rate limited, wait ${wait}ms…`);
            await new Promise((r) => setTimeout(r, wait));
          } else {
            console.warn(`  fail "${w.en}": ${e.message}`);
            break;
          }
        }
      }
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    if (ar && hasArabic(ar)) {
      w.ar = ar;
      fixed++;
      if (fixed % 20 === 0) {
        writeFileSync(CACHE, JSON.stringify(cache));
        console.log(`  fixed ${fixed}…`);
      }
    } else {
      failed++;
    }
  }

  writeFileSync(CACHE, JSON.stringify(cache));

  // Rebuild wordbank.js body preserving footer
  const wbSrc = readFileSync(join(ROOT, "wordbank.js"), "utf8");
  const footerMatch = wbSrc.match(/\n  const EXCLUDE_TAGS[\s\S]*$/);
  const footer = footerMatch ? footerMatch[0] : "";

  const lines = [
    "/* global window */",
    "(() => {",
    '  "use strict";',
    "",
    "  /** { ar: string, en: string, tag?: string } — ~1000 words, aligned with Spanish-Flashcards */",
    "  window.WORD_BANK = [",
  ];
  for (const w of arBank) {
    lines.push(`    { ar: "${esc(w.ar)}", en: "${esc(w.en)}", tag: "${esc(w.tag)}" },`);
  }
  lines.push("  ];", footer.startsWith("\n") ? footer : "\n" + footer);

  writeFileSync(join(ROOT, "wordbank.js"), lines.join("\n"));

  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), ctx);
  const final = ctx.window.WORD_BANK;
  const still = final.filter((w) => !hasArabic(w.ar)).length;
  console.log(`Done. Fixed ${fixed}, still missing Arabic: ${still}, deck size: ${final.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
