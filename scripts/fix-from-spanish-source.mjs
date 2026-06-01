#!/usr/bin/env node
/**
 * Arabic glosses from Spanish word forms (es → ar), matching Spanish-Flashcards semantics.
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import vm from "vm";

const ROOT = join(import.meta.dirname, "..");
const DELAY_MS = 100;

/** Keyed by Spanish `es` (lowercase). */
const MANUAL_ES = {
  limpio: "نَظِيف",
  sucio: "وَسِخ",
  abierto: "مَفْتُوح",
  cerrado: "مُغْلَق",
  correr: "يَجْرِي",
  caminar: "يَمْشِي",
  llover: "يَمْطُر",
  "hablo un poco de español": "أَتَكَلَّمُ العَرَبِيَّةَ قَلِيلًا",
  "tortilla española": "عِجَّة",
  paella: "بَايِلّا",
  gazpacho: "غَزْبَاشُو",
  tapas: "تَابَاس",
  wifi: "واي فاي",
  conductor: "سائق",
  chofer: "سائق",
};

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

async function translateEs(es) {
  const key = es.trim().toLowerCase();
  if (MANUAL_ES[key]) return MANUAL_ES[key];
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=ar&dt=t&q=" +
    encodeURIComponent(es.slice(0, 500));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data[0].map((p) => p[0]).join("").trim();
}

function uniqueAr(ar, en, used) {
  let base = ar.trim();
  const key = base.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return base;
  }
  const hint = en.split(/[/(]/)[0].trim().slice(0, 18);
  let n = 2;
  let candidate = `${base} (${hint})`;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base} (${hint} ${n})`;
    n++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

async function main() {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync("/tmp/spanish-flashcards/wordbank.js", "utf8"), ctx);
  const spanish = ctx.window.WORD_BANK;

  console.log(`Building ${spanish.length} cards from Spanish source…`);
  const used = new Set();
  const rows = [];

  for (let i = 0; i < spanish.length; i++) {
    const { es, en, tag } = spanish[i];
    let ar;
    try {
      ar = await translateEs(es);
    } catch (e) {
      console.warn(`[${i + 1}] ${es}: ${e.message}`);
      ar = es;
    }
    if (!hasArabic(ar)) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        ar = await translateEs(es);
      } catch {
        ar = `⚠ ${es}`;
      }
    }
    ar = uniqueAr(ar, en, used);
    rows.push({ ar, en, tag: tag || "general" });
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${spanish.length}`);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  const lines = [
    "/* global window */",
    "(() => {",
    '  "use strict";',
    "",
    "  /** { ar, en, tag } — Arabic gloss from Spanish-Flashcards vocabulary (es→ar), English unchanged */",
    "  window.WORD_BANK = [",
  ];
  for (const w of rows) {
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
    "  } catch (e) { /* ignore */ }",
    "})();",
    ""
  );
  writeFileSync(join(ROOT, "wordbank.js"), lines.join("\n"));

  const vctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), vctx);
  vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), vctx);
  const bank = vctx.window.WORD_BANK;
  const bad = bank.filter((w) => !hasArabic(w.ar));
  console.log(`Done: ${bank.length} cards, ${bad.length} without Arabic`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
