#!/usr/bin/env node
/**
 * Build full ~1000-word Arabic wordbank from Spanish-Flashcards vocabulary.
 * Does NOT modify the Spanish repo — reads a clone or /tmp copy only.
 *
 * Usage: node scripts/build-full-wordbank.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import vm from "vm";

const ROOT = join(import.meta.dirname, "..");
const CACHE_PATH = join(import.meta.dirname, ".translation-cache.json");
const SPANISH_WB = existsSync("/tmp/spanish-flashcards/wordbank.js")
  ? "/tmp/spanish-flashcards/wordbank.js"
  : null;

const EN_FIX = {
  "I speak a little Spanish": "I speak a little Arabic",
  "Spanish omelette": "omelette",
};

function esc(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ");
}

function loadSpanishBank() {
  if (!SPANISH_WB) {
    throw new Error("Clone Spanish-Flashcards to /tmp/spanish-flashcards first (read-only).");
  }
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(SPANISH_WB, "utf8"), ctx);
  return ctx.window.WORD_BANK;
}

function loadCache() {
  if (!existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0));
}

async function translateEnToAr(en, cache) {
  const key = en.trim();
  if (cache[key]) return cache[key];

  const q = encodeURIComponent(key.slice(0, 450));
  const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=en|ar`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  let ar = data?.responseData?.translatedText?.trim();
  if (!ar) throw new Error("empty translation");
  // API sometimes returns ALL CAPS
  if (ar === ar.toUpperCase() && ar.length > 3) {
    ar = ar.charAt(0) + ar.slice(1).toLowerCase();
  }
  cache[key] = ar;
  return ar;
}

function loadManualOverrides() {
  const overrides = {};
  const wb = join(ROOT, "wordbank.js");
  if (!existsSync(wb)) return overrides;
  const s = readFileSync(wb, "utf8");
  for (const m of s.matchAll(/\{\s*ar:\s*"((?:\\.|[^"\\])*)"\s*,\s*en:\s*"((?:\\.|[^"\\])*)"/g)) {
    overrides[m[2].replace(/\\"/g, '"')] = m[1].replace(/\\"/g, '"');
  }
  return overrides;
}

function uniqueAr(ar, en, usedAr) {
  let base = ar.trim();
  if (!base) base = en;
  const key = base.toLowerCase();
  if (!usedAr.has(key)) {
    usedAr.add(key);
    return base;
  }
  const hint =
    typeof globalThis.primaryEnglish === "function"
      ? globalThis.primaryEnglish(en)
      : en.split(/[/(]/)[0].trim().slice(0, 24);
  let n = 2;
  let candidate = `${base} (${hint})`;
  while (usedAr.has(candidate.toLowerCase())) {
    candidate = `${base} (${hint} ${n})`;
    n++;
  }
  usedAr.add(candidate.toLowerCase());
  return candidate;
}

async function main() {
  console.log("Loading Spanish vocabulary (read-only)…");
  const spanish = loadSpanishBank();
  console.log(`Spanish deck after filters: ${spanish.length} words`);

  const manual = loadManualOverrides();
  const cache = loadCache();
  const out = [];
  const usedAr = new Set();

  for (let i = 0; i < spanish.length; i++) {
    const { en, tag } = spanish[i];
    const enFixed = EN_FIX[en] || en;
    let ar = manual[en] || manual[enFixed];

    if (!ar) {
      try {
        ar = await translateEnToAr(enFixed, cache);
        if ((i + 1) % 25 === 0) {
          saveCache(cache);
          console.log(`  translated ${i + 1}/${spanish.length}`);
        }
        await new Promise((r) => setTimeout(r, 280));
      } catch (e) {
        console.warn(`  skip [${i + 1}] "${en}": ${e.message}`);
        ar = enFixed;
      }
    }

    ar = uniqueAr(ar, en, usedAr);
    out.push({ ar, en, tag: tag || "general" });
  }

  saveCache(cache);

  const lines = [
    "/* global window */",
    "(() => {",
    '  "use strict";',
    "",
    "  /**",
    "   * Word object shape:",
    "   * { ar: string, en: string, tag?: string }",
    "   *",
    "   * Vocabulary aligned with Spanish-Flashcards (~1000 entries).",
    "   */",
    "  window.WORD_BANK = [",
  ];

  for (const w of out) {
    lines.push(`    { ar: "${esc(w.ar)}", en: "${esc(w.en)}", tag: "${esc(w.tag)}" },`);
  }

  lines.push(
    "  ];",
    "",
    "  const EXCLUDE_TAGS = new Set([\"neuro\", \"muscles\", \"office\"]);",
    "  const MAX_SINGLE_EN = 16;",
    "  const MAX_DISPLAY_EN = 45;",
    "",
    "  function displayEnForFilter(en) {",
    "    if (typeof window.primaryEnglish === \"function\") return window.primaryEnglish(en);",
    "    return String(en ?? \"\").trim();",
    "  }",
    "",
    "  function isTooAdvanced(w) {",
    "    const tag = String(w.tag || \"\").toLowerCase();",
    "    if (EXCLUDE_TAGS.has(tag)) return true;",
    "    const en = displayEnForFilter(w.en);",
    "    if (!en) return false;",
    "    const words = en.split(/\\s+/);",
    "    if (words.length === 1 && words[0].length > MAX_SINGLE_EN) return true;",
    "    if (en.length > MAX_DISPLAY_EN) return true;",
    "    if (words.length > 5) return true;",
    "    return false;",
    "  }",
    "",
    "  window.WORD_BANK = window.WORD_BANK.filter((w) => !isTooAdvanced(w));",
    "",
    "  const seen = new Set();",
    "  window.WORD_BANK = window.WORD_BANK.filter((w) => {",
    "    const key = String(w.ar).trim().toLowerCase();",
    "    if (!key) return false;",
    "    if (seen.has(key)) return false;",
    "    seen.add(key);",
    "    return true;",
    "  });",
    "",
    "  try {",
    "    if (typeof window.dispatchEvent === \"function\") {",
    "      window.dispatchEvent(new Event(\"wordbankready\"));",
    "    }",
    "  } catch (e) {",
    "    /* ignore */",
    "  }",
    "})();",
    ""
  );

  writeFileSync(join(ROOT, "wordbank.js"), lines.join("\n"));

  // Verify count
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), ctx);
  console.log(`Wrote wordbank.js — ${ctx.window.WORD_BANK.length} cards in deck.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
