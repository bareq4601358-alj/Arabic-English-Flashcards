#!/usr/bin/env node
/**
 * Conservative deck: keep a card only when Arabic is verified (Iraqi lexicon,
 * manual override, or a validated EN→AR gloss). Drop anything doubtful.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import vm from "vm";
import {
  adaptEnglish,
  iraqiFor,
  msaToIraqi,
  IRAQI_BY_EN,
  AR_COLLISION_OVERRIDE,
  stripLatinParens,
} from "./iraqi-lexicon.mjs";
import { MANUAL_EN, MANUAL_ES } from "./verified-overrides.mjs";

const ROOT = join(import.meta.dirname, "..");
const SPANISH_WB = "/tmp/spanish-flashcards/wordbank.js";
const SPANISH_SB = "/tmp/spanish-flashcards/sentence-bank.js";
const MSA_CACHE = join(import.meta.dirname, ".msa-en-cache.json");

const HOMOGRAPH_EN = new Set(
  [
    "cookie / biscuit",
    "cookie",
    "biscuit",
    "mouse",
    "file",
    "folder (paper)",
    "folder",
    "net",
    "network",
    "web",
    "keyboard",
    "shortcut",
    "icon",
    "cloud",
    "stream",
    "mine",
    "spring",
    "match",
    "date",
    "fair",
    "bank",
    "chip",
    "crash",
    "fire",
    "wave",
    "current",
    "port",
    "drive",
    "boot",
    "tablet",
    "cell",
    "charge",
    "fan",
    "coach",
    "pitch",
    "strike",
    "seal",
    "bear",
    "stock",
    "issue",
    "fine (ticket)",
    "tie (draw)",
    "right (legal)",
    "left",
    "light",
    "fair",
    "grave",
    "pupil",
    "patient",
    "engaged",
    "novel",
    "character",
    "plot",
    "spring",
    "fall",
    "wave",
    "current",
    "draft",
    "figure",
    "capital",
    "interest",
    "principal",
    "subject",
    "object",
    "ring",
    "watch",
    "second (time)",
    "minute",
    "second",
    "rock",
    "pitcher",
    "mole",
    "pound",
    "yard",
    "foot",
    "inch",
    "stroke",
    "tip",
    "check",
    "bill",
    "order",
    "course",
    "class",
    "school",
    "plant",
    "glass",
    "bowl",
    "pitcher",
    "toast (cheers)",
    "toast",
    "jam",
    "chip",
    "cracker",
  ].map((s) => s.toLowerCase())
);

/** Arabic that almost always means a wrong sense for everyday cards. */
const BAD_AR =
  /ملف تعريف|قاعدة بيانات|فأرة الكمبيوتر|لوحة المفاتيح|شبكة المعلومات|متصفح|الويب|خادم|بروتوكول|تطبيق ويب|ذاكرة الوصول|معالج|برنامج/i;

const FOOD_EN =
  /food|eat|drink|meal|breakfast|lunch|dinner|fruit|vegetable|meat|fish|bread|rice|soup|salad|cake|cookie|biscuit|coffee|tea|milk|cheese|egg|sugar|salt|pepper|oil|butter|honey|jam|nut|bean|potato|tomato|onion|garlic|apple|banana|orange|lemon|chicken|beef|pork|lamb|shrimp|pasta|pizza|sandwich|burger|fries|chocolate|candy|wine|beer|juice|water|snack|dessert|pie|steak|sausage|ham|bacon|cereal|yogurt|cream|vinegar|sauce|spice|herb|mushroom|lettuce|carrot|corn|pea|lentil|chickpea|olive|date|fig|grape|melon|berry|peach|pear|plum|cherry|strawberry|watermelon|pineapple|mango|coconut|avocado|ginger|cinnamon|basil|mint|parsley|cilantro|dill|thyme|oregano|rosemary|sage|nutmeg|clove|cardamom|cumin|turmeric|paprika|chili|mustard|ketchup|mayonnaise|pickle|olive oil/i;

function escJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function unesc(s) {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}
function hasSpanish(s) {
  return /[¿¡ñáéíóúü]/i.test(s) || /\b(hola|gracias|adiós)\b/i.test(s);
}

function isHomographEn(en) {
  const a = adaptEnglish(en).toLowerCase();
  if (HOMOGRAPH_EN.has(a)) return true;
  const primary = a.split(/[/(]/)[0].trim();
  if (HOMOGRAPH_EN.has(primary)) return true;
  if (/\bcookie\b|\bbiscuit\b/i.test(en) && !/browser|web|computer|site/i.test(en)) return true;
  return false;
}

function isValidAr(ar, en, tag) {
  if (!ar || !hasArabic(ar)) return false;
  if (hasSpanish(ar)) return false;
  if (/\b(poder|hacer|de|la|el|los|las|un|una|con|por|para|que)\b/i.test(ar)) return false;
  if (BAD_AR.test(ar)) return false;
  if (ar.length > 48 && en.length < 30) return false;
  const foodish = tag === "food" || FOOD_EN.test(en);
  if (foodish && BAD_AR.test(ar)) return false;
  if (foodish && /ملف|لوحة|شبكة|برنامج|إنترنت|كمبيوتر|تقنية/i.test(ar)) return false;
  if (/cookie|biscuit/i.test(en) && /ملف تعريف/i.test(ar)) return false;
  if (/keyboard/i.test(en) && tag === "food") return false;
  if (/^[\u0600-\u06FF\s\u064B-\u0652٠-٩،.!?؛:'"-]+$/u.test(ar) === false) return false;
  return true;
}

function trustedAr(es, en, tag, msaCache) {
  const adapted = adaptEnglish(en);
  const sources = [
    IRAQI_BY_EN[adapted],
    IRAQI_BY_EN[en],
    MANUAL_EN[adapted],
    MANUAL_EN[en],
    AR_COLLISION_OVERRIDE[adapted],
    AR_COLLISION_OVERRIDE[en],
    MANUAL_ES[es.trim().toLowerCase()],
    MANUAL_ES[es],
  ];
  for (const raw of sources) {
    if (!raw) continue;
    const ar = stripLatinParens(msaToIraqi(raw));
    if (isValidAr(ar, en, tag)) return ar;
  }
  if (isHomographEn(en)) return null;
  return null;
}

async function fetchEnAr(en) {
  const q = adaptEnglish(en).split(/[/(]/)[0].trim().slice(0, 200);
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=" +
    encodeURIComponent(q);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data[0].map((p) => p[0]).join("").trim();
}

function writeWordbank(rows) {
  const lines = [
    "/* global window */",
    "(() => {",
    '  "use strict";',
    "",
    "  /** Verified Iraqi Arabic ↔ English cards only. */",
    "  window.WORD_BANK = [",
  ];
  for (const w of rows) {
    lines.push(
      `    { ar: "${escJs(w.ar)}", en: "${escJs(w.en)}", tag: "${escJs(w.tag || "basics")}" },`
    );
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
    '    return String(en ?? "").trim();',
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
    "  function isVerifiedAr(ar) {",
    "    if (!/[\\u0600-\\u06FF]/.test(ar)) return false;",
    "    if (/[¿¡ñáéíóúü]/i.test(ar)) return false;",
    "    if (/\\b(poder|hacer|de|la|el|los|las|un|una|con|por|para|que|es|son)\\b/i.test(ar)) return false;",
    "    if (/ملف تعريف|قاعدة بيانات|فأرة الكمبيوتر/i.test(ar)) return false;",
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
    "    if (typeof window.dispatchEvent === \"function\") {",
    "      window.dispatchEvent(new Event(\"wordbankready\"));",
    "    }",
    "  } catch (e) { /* ignore */ }",
    "})();",
    ""
  );
  writeFileSync(join(ROOT, "wordbank.js"), lines.join("\n"));
}

function loadSpanishWords() {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(SPANISH_WB, "utf8"), ctx);
  return ctx.window.WORD_BANK;
}

function loadSpanishSentences() {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(SPANISH_SB, "utf8"), ctx);
  return ctx.window.SENTENCE_BANK;
}

async function main() {
  const words = loadSpanishWords();
  const msaCache = existsSync(MSA_CACHE)
    ? JSON.parse(readFileSync(MSA_CACHE, "utf8"))
    : {};

  const kept = [];
  const dropped = [];
  const needFetch = [];

  for (const { es, en, tag } of words) {
    const adapted = adaptEnglish(en);
    let ar = trustedAr(es, en, tag, msaCache);
    if (ar) {
      if ((adapted.includes("/") || adapted.includes("(")) && !MANUAL_EN[adapted] && !MANUAL_EN[en]) {
        dropped.push({ es, en: adapted, tag, reason: "multi_sense" });
        continue;
      }
      kept.push({ es, en: adapted, tag, ar });
      continue;
    }
    if (isHomographEn(en)) {
      dropped.push({ es, en: adapted, tag, reason: "homograph" });
      continue;
    }
    needFetch.push({ es, en: adapted, tag });
  }

  console.log(`Trusted without fetch: ${kept.length}`);
  console.log(`Dropped (homograph / no gloss): ${dropped.length}`);
  console.log(`Need EN fetch: ${needFetch.length}`);

  let fetched = 0;
  for (let i = 0; i < needFetch.length; i++) {
    const row = needFetch[i];
    try {
      let ar = stripLatinParens(msaToIraqi(await fetchEnAr(row.en)));
      if ((row.en.includes("/") || row.en.includes("(")) && !MANUAL_EN[row.en]) {
        dropped.push({ ...row, reason: "multi_sense" });
        continue;
      }
      if (!isValidAr(ar, row.en, row.tag)) {
        dropped.push({ ...row, reason: "invalid_fetch", ar });
        continue;
      }
      msaCache[adaptEnglish(row.en)] = ar;
      kept.push({ ...row, ar });
      fetched++;
      if (fetched % 25 === 0) writeFileSync(MSA_CACHE, JSON.stringify(msaCache));
      await new Promise((r) => setTimeout(r, 120));
    } catch (e) {
      dropped.push({ ...row, reason: e.message });
    }
    if ((i + 1) % 50 === 0) console.log(`  fetched ${i + 1}/${needFetch.length}…`);
  }
  writeFileSync(MSA_CACHE, JSON.stringify(msaCache));

  const usedAr = new Set();
  const esToAr = new Map();
  const enByEs = new Map();
  for (const row of kept) {
    let ar = row.ar;
    if (usedAr.has(ar.toLowerCase())) {
      const alt = AR_COLLISION_OVERRIDE[row.en] || AR_COLLISION_OVERRIDE[adaptEnglish(row.en)];
      if (alt && !usedAr.has(alt.toLowerCase())) ar = alt;
      else continue;
    }
    usedAr.add(ar.toLowerCase());
    esToAr.set(row.es, ar);
    enByEs.set(row.es, row);
  }

  const finalRows = [...enByEs.values()].sort((a, b) =>
    a.en.localeCompare(b.en)
  );
  writeWordbank(finalRows);

  const sents = loadSpanishSentences();
  const sentLines = [
    "/* global window */",
    "(() => {",
    '  "use strict";',
    "",
    "  /** Verified Iraqi Arabic sentences only. */",
    "  window.SENTENCE_BANK = [",
  ];
  const seenEn = new Set();
  let keptS = 0;
  for (const row of sents) {
    const en = adaptEnglish(row.en);
    if (seenEn.has(en.toLowerCase())) continue;
    if (hasSpanish(en) || /spanish/i.test(en)) continue;
    seenEn.add(en.toLowerCase());
    let ar = MANUAL_EN[en] || IRAQI_BY_EN[en];
    if (!ar) {
      try {
        ar = stripLatinParens(msaToIraqi(await fetchEnAr(en)));
        await new Promise((r) => setTimeout(r, 120));
      } catch {
        continue;
      }
    } else ar = stripLatinParens(msaToIraqi(ar));
    if (!isValidAr(ar, en, row.tag || "grammar")) continue;
    if (ar.length > 120) continue;
    sentLines.push(
      `    { en: "${escJs(en)}", ar: "${escJs(ar)}", tag: "${escJs(row.tag || "grammar")}" },`
    );
    keptS++;
  }
  sentLines.push(
    "  ];",
    "",
    "  const seen = new Set();",
    "  window.SENTENCE_BANK = window.SENTENCE_BANK.filter((row) => {",
    '    const k = String(row.en ?? "").trim().toLowerCase();',
    "    if (!k || seen.has(k)) return false;",
    "    seen.add(k);",
    "    return true;",
    "  });",
    "})();",
    ""
  );
  writeFileSync(join(ROOT, "sentence-bank.js"), sentLines.join("\n"));

  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "sentence-bank.js"), "utf8"), ctx);

  writeFileSync(
    join(import.meta.dirname, "dropped-cards.json"),
    JSON.stringify({ words: dropped.slice(0, 500), totalDropped: dropped.length }, null, 2)
  );

  console.log(`\nFinal: ${ctx.window.WORD_BANK.length} words, ${ctx.window.SENTENCE_BANK.length} sentences`);
  console.log(`Dropped log: scripts/dropped-cards.json (${dropped.length} rows)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
