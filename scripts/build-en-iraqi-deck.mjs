#!/usr/bin/env node
/**
 * Rebuild wordbank: English → Iraqi Arabic only (no Spanish source).
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import vm from "vm";
import { IRAQI_BY_EN, stripLatinParens, msaToIraqi } from "./iraqi-lexicon.mjs";
import { MANUAL_EN } from "./verified-overrides.mjs";
import { iraqiVerbFromEn } from "./iraqi-verbs.mjs";
import { classifyEnTag } from "./en-to-tag.mjs";

const ROOT = join(import.meta.dirname, "..");
const EN_CACHE = join(import.meta.dirname, ".verified-en-ar.json");

const BAD_AR =
  /ملف تعريف|قاعدة بيانات|فأرة الكمبيوتر|لوحة المفاتيح|شبكة المعلومات/i;

function escJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

function isManual(en) {
  return Boolean(MANUAL_EN[en] || MANUAL_EN[en.split(/[/(]/)[0].trim()]);
}

function isMultiSense(en) {
  return en.includes("/") || (en.includes("(") && !isManual(en));
}

function isValidAr(ar, en) {
  if (!ar || !hasArabic(ar)) return false;
  if (BAD_AR.test(ar)) return false;
  if (/^to\s+/i.test(en)) {
    if (/^ل|^أن\s|^لل/.test(ar.trim())) return false;
    if (!/^[ييتأن]|^تم|^عنده/.test(ar.trim())) return false;
  }
  if (/cookie|biscuit/i.test(en) && /ملف تعريف/i.test(ar)) return false;
  if (/\b(poder|hacer|de|la|el|un|una)\b/i.test(ar) && !hasArabic(ar)) return false;
  return true;
}

function resolveTrusted(en) {
  if (MANUAL_EN[en]) return stripLatinParens(MANUAL_EN[en]);
  const primary = en.split(/[/(]/)[0].trim();
  if (MANUAL_EN[primary]) return stripLatinParens(MANUAL_EN[primary]);
  if (IRAQI_BY_EN[en]) return stripLatinParens(IRAQI_BY_EN[en]);
  if (IRAQI_BY_EN[primary]) return stripLatinParens(IRAQI_BY_EN[primary]);
  const verb = iraqiVerbFromEn(en);
  if (verb) return verb;
  return null;
}

async function fetchEnAr(en) {
  const q = en.split(/[/(]/)[0].trim().slice(0, 200);
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=" +
    encodeURIComponent(q);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return stripLatinParens(data[0].map((p) => p[0]).join("").trim());
}

function loadSeed() {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), ctx);
  const seen = new Set();
  const rows = [];
  for (const w of ctx.window.WORD_BANK) {
    const en = String(w.en).trim();
    if (!en || seen.has(en.toLowerCase())) continue;
    seen.add(en.toLowerCase());
    rows.push({ en, tag: classifyEnTag(en) });
  }
  return rows;
}

function writeWordbank(rows) {
  const lines = [
    "/* global window */",
    "(() => {",
    '  "use strict";',
    "",
    "  /** English → Iraqi Arabic (verified). Tags by English meaning. */",
    "  window.WORD_BANK = [",
  ];
  for (const w of rows) {
    lines.push(
      `    { ar: "${escJs(w.ar)}", en: "${escJs(w.en)}", tag: "${escJs(w.tag)}" },`
    );
  }
  lines.push(
    "  ];",
    "",
    '  const EXCLUDE_TAGS = new Set(["neuro", "muscles", "office"]);',
    "  const MAX_SINGLE_EN = 16;",
    "  const MAX_DISPLAY_EN = 45;",
    "",
    "  function displayEnForFilter(en) {",
    '    if (typeof window.primaryEnglish === "function") return window.primaryEnglish(en);',
    '    return String(en ?? "").trim();',
    "  }",
    "",
    "  function isTooAdvanced(w) {",
    '    const tag = String(w.tag || "").toLowerCase();',
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
    "  function isVerifiedAr(ar) {",
    "    if (!/[\\u0600-\\u06FF]/.test(ar)) return false;",
    "    if (/ملف تعريف|قاعدة بيانات/i.test(ar)) return false;",
    "    if (/^to\\s+/i.test(ar)) return false;",
    "    return true;",
    "  }",
    "",
    "  window.WORD_BANK = window.WORD_BANK.filter((w) => !isTooAdvanced(w) && isVerifiedAr(w.ar));",
    "",
    "  const seen = new Set();",
    "  window.WORD_BANK = window.WORD_BANK.filter((w) => {",
    '    const key = String(w.ar).trim().toLowerCase();',
    "    if (!key || seen.has(key)) return false;",
    "    seen.add(key);",
    "    return true;",
    "  });",
    "",
    "  try {",
    '    if (typeof window.dispatchEvent === "function") {',
    '      window.dispatchEvent(new Event("wordbankready"));',
    "    }",
    "  } catch (e) { /* ignore */ }",
    "})();",
    ""
  );
  writeFileSync(join(ROOT, "wordbank.js"), lines.join("\n"));
}

async function main() {
  const seed = loadSeed();
  const cache = existsSync(EN_CACHE) ? JSON.parse(readFileSync(EN_CACHE, "utf8")) : {};
  const kept = [];
  const dropped = [];
  const needFetch = [];

  console.log(`Seed: ${seed.length} English cards → Iraqi Arabic\n`);

  for (const row of seed) {
    const { en } = row;
    if (isMultiSense(en)) {
      const ar = resolveTrusted(en);
      if (ar && isValidAr(ar, en)) {
        kept.push({ en, ar, tag: classifyEnTag(en) });
      } else {
        dropped.push({ en, reason: "multi_sense" });
      }
      continue;
    }
    let ar = resolveTrusted(en);
    if (ar && isValidAr(ar, en)) {
      kept.push({ en, ar, tag: classifyEnTag(en) });
      continue;
    }
    if (cache[en] && isValidAr(msaToIraqi(cache[en]), en)) {
      kept.push({ en, ar: msaToIraqi(cache[en]), tag: classifyEnTag(en) });
      continue;
    }
    needFetch.push(row);
  }

  console.log(`Trusted: ${kept.length}, need fetch: ${needFetch.length}, dropped: ${dropped.length}`);

  let n = 0;
  for (const row of needFetch) {
    try {
      let ar = msaToIraqi(await fetchEnAr(row.en));
      if (!isValidAr(ar, row.en)) {
        dropped.push({ en: row.en, reason: "invalid", ar });
        continue;
      }
      cache[row.en] = ar;
      kept.push({ en: row.en, ar, tag: classifyEnTag(row.en) });
      n++;
      if (n % 25 === 0) writeFileSync(EN_CACHE, JSON.stringify(cache));
      await new Promise((r) => setTimeout(r, 100));
    } catch (e) {
      dropped.push({ en: row.en, reason: e.message });
    }
    if (n % 50 === 0 && n) console.log(`  fetched ${n}/${needFetch.length}…`);
  }
  writeFileSync(EN_CACHE, JSON.stringify(cache));

  const usedAr = new Set();
  const final = [];
  for (const w of kept) {
    let { ar, en, tag } = w;
    if (usedAr.has(ar.toLowerCase())) continue;
    usedAr.add(ar.toLowerCase());
    final.push({ en, ar, tag });
  }
  final.sort((a, b) => a.en.localeCompare(b.en));
  writeWordbank(final);

  writeFileSync(
    join(import.meta.dirname, "dropped-en-build.json"),
    JSON.stringify({ dropped, total: dropped.length }, null, 2)
  );

  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), ctx);
  const bank = ctx.window.WORD_BANK;
  const badVerbs = bank.filter((w) => /^to /i.test(w.en) && /^ل/.test(w.ar));
  console.log(`\nFinal deck: ${bank.length} words`);
  console.log(`Bad verb forms (ل…): ${badVerbs.length}`);
  if (badVerbs.length) badVerbs.slice(0, 5).forEach((w) => console.log(" ", w.en, w.ar));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
