#!/usr/bin/env node
/**
 * Rebuild wordbank + sentence-bank: Iraqi Arabic, Spanish site used as outline only.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import vm from "vm";
import {
  adaptEnglish,
  iraqiFor,
  msaToIraqi,
  EN_ADAPT,
  IRAQI_BY_EN,
  AR_COLLISION_OVERRIDE,
  stripLatinParens,
} from "./iraqi-lexicon.mjs";

const ROOT = join(import.meta.dirname, "..");
const SPANISH_WB = "/tmp/spanish-flashcards/wordbank.js";
const SPANISH_SB = "/tmp/spanish-flashcards/sentence-bank.js";
const MSA_CACHE = join(import.meta.dirname, ".msa-en-cache.json");

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
  return /[¿¡ñáéíóúü]/i.test(s) || /\b(hola|gracias|adiós|señor|también)\b/i.test(s);
}

const VERB_EN_TO_IRAQI = {
  lose: "يخسر",
  let: "يخلّي",
  try: "يجرب",
  explain: "يشرح",
  remember: "يتذكر",
  forget: "ينسى",
  change: "يغير",
  improve: "يحسّن",
  decide: "يقرر",
  choose: "يختار",
  wake: "يصحى",
  "get dressed": "يلبس",
  shower: "يدش",
  "have breakfast": "يفطر",
  "have lunch": "يغدى",
  "have dinner": "يعشي",
  cross: "يعبر",
  smoke: "يدخن",
  suffer: "يتألم",
  dream: "يحلم",
  fill: "يملى",
  empty: "يفرغ",
  break: "يكسر",
  fix: "يصلح",
  build: "يبني",
  vote: "يصوت",
  protect: "يحمي",
  rain: "تمطر",
  cry: "يبچي",
  laugh: "يضحك",
  win: "يفوز",
  earn: "يكسب",
  start: "يبدي",
  finish: "يخلص",
  learn: "يتعلم",
  teach: "يعلم",
  live: "يعيش",
  travel: "يسافر",
  think: "يفكر",
  believe: "يصدق",
  feel: "يحس",
  wait: "يستنى",
  hope: "يتمنا",
  call: "يتصل",
  arrive: "يوصل",
  "go out": "يطلع",
  enter: "يدخل",
  return: "يرجع",
  look: "يدور",
  find: "يلقى",
  use: "يستخدم",
  carry: "يحمل",
  wear: "يلبس",
  put: "يحط",
  place: "يحط",
  ask: "يسأل",
  answer: "يجاوب",
  send: "يرسل",
  receive: "يستلم",
  sign: "يوقع",
  wash: "يغسل",
  dry: "ينشف",
  sweep: "يكنس",
  iron: "يكوي",
  heal: "ينشاف",
  "get better": "يتمشى",
};

function iraqiVerbPhrase(en) {
  const m = en.match(/^to\s+(.+)$/i);
  if (!m) return null;
  const part = m[1].split(/\s*\/\s*/)[0].trim().toLowerCase();
  if (VERB_EN_TO_IRAQI[part]) return VERB_EN_TO_IRAQI[part];
  const first = part.split(/\s+/)[0];
  if (VERB_EN_TO_IRAQI[first]) return VERB_EN_TO_IRAQI[first];
  return null;
}

function iraqiGloss(en, msa) {
  const adapted = adaptEnglish(en);
  if (IRAQI_BY_EN[adapted]) return IRAQI_BY_EN[adapted];
  const verb = iraqiVerbPhrase(adapted);
  if (verb) return verb;
  const converted = msaToIraqi(msa);
  if (hasArabic(converted) && !hasSpanish(converted)) return converted;
  return iraqiFor(adapted, msa);
}

async function msaForEn(en) {
  const key = adaptEnglish(en);
  const cache = existsSync(MSA_CACHE) ? JSON.parse(readFileSync(MSA_CACHE, "utf8")) : {};
  if (cache[key]) return cache[key];
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=" +
    encodeURIComponent(key.slice(0, 480));
  const res = await fetch(url);
  const data = await res.json();
  const ar = data[0].map((p) => p[0]).join("").trim();
  cache[key] = ar;
  writeFileSync(MSA_CACHE, JSON.stringify(cache));
  return ar;
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

function buildEsToArMap(words, getMsa) {
  const map = new Map();
  const usedAr = new Set();
  for (const { es, en } of words) {
    if (map.has(es)) continue;
    const adapted = adaptEnglish(en);
    const msa = stripLatinParens(getMsa(en));
    let ar = stripLatinParens(iraqiGloss(en, msa));
    if (!hasArabic(ar) || hasSpanish(ar)) ar = stripLatinParens(iraqiGloss(en, msa) || msa);
    let final = ar.trim();
    if (usedAr.has(final.toLowerCase())) {
      const override =
        AR_COLLISION_OVERRIDE[adapted] || AR_COLLISION_OVERRIDE[en];
      if (override && !usedAr.has(override.toLowerCase())) {
        final = override;
      } else {
        const alt = stripLatinParens(msaToIraqi(msa));
        if (alt && alt !== final && !usedAr.has(alt.toLowerCase())) {
          final = alt;
        } else {
          let n = 2;
          final = `${ar} ٢`;
          while (usedAr.has(final.toLowerCase())) {
            final = `${ar} ${n}`;
            n++;
          }
        }
      }
    }
    usedAr.add(final.toLowerCase());
    map.set(es, final);
  }
  return map;
}

function transformWordbank(src, esToAr) {
  let out = src;
  out = out.replace(
    /\{ es: string, en: string, tag\?: string \}/,
    "{ ar: string, en: string, tag?: string }"
  );
  out = out.replace(/\{ es: "((?:\\.|[^"\\])*)"/g, (_, raw) => {
    const es = unesc(raw);
    return `{ ar: "${escJs(esToAr.get(es) ?? es)}"`;
  });
  out = out.replace(
    /\[\s*"((?:\\.|[^"\\])*)"\s*,\s*"((?:\\.|[^"\\])*)"\s*,\s*"([^"]*)"\s*\]/g,
    (_, esRaw, enRaw, tag) => {
      const es = unesc(esRaw);
      const en = adaptEnglish(unesc(enRaw));
      return `["${escJs(esToAr.get(es) ?? es)}", "${escJs(en)}", "${tag}"]`;
    }
  );
  out = out.replace(/for \(const \[es, en, tag\] of (\w+)\)/g, "for (const [ar, en, tag] of $1)");
  out = out.replace(/push\(\{ es, en, tag \}\)/g, "push({ ar, en, tag })");
  out = out.replace(/String\(w\.es\)/g, "String(w.ar)");
  out = out.replace(/same Spanish\)/g, "same Arabic)");
  out = out.replace(/Spanish\)/g, "Arabic)");
  return out;
}

function loadCurrentMsaByEn() {
  const map = {};
  try {
    const ctx = vm.createContext({ window: {} });
    vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
    vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), ctx);
    for (const w of ctx.window.WORD_BANK) {
      if (hasArabic(w.ar)) map[adaptEnglish(w.en)] = stripLatinParens(w.ar);
    }
  } catch {
    /* ignore */
  }
  return map;
}

async function main() {
  const words = loadSpanishWords();
  const sents = loadSpanishSentences();
  console.log(`Outline: ${words.length} words, ${sents.length} sentences → Iraqi Arabic`);

  const msaCache = { ...loadCurrentMsaByEn(), ...(existsSync(MSA_CACHE) ? JSON.parse(readFileSync(MSA_CACHE, "utf8")) : {}) };
  const uniqueEn = [...new Set(words.map((w) => adaptEnglish(w.en)))];
  let fetched = 0;
  for (const en of uniqueEn) {
    if (!msaCache[en]) {
      try {
        msaCache[en] = await msaForEn(en);
        fetched++;
        if (fetched % 40 === 0) writeFileSync(MSA_CACHE, JSON.stringify(msaCache));
        await new Promise((r) => setTimeout(r, 80));
      } catch (e) {
        console.warn("MSA", en, e.message);
      }
    }
  }
  writeFileSync(MSA_CACHE, JSON.stringify(msaCache));
  console.log(`MSA cache: ${Object.keys(msaCache).length} (fetched ${fetched} new)`);

  const getMsa = (en) => msaCache[adaptEnglish(en)] || msaCache[en] || en;
  const esToAr = buildEsToArMap(words, getMsa);
  const wbSrc = readFileSync(SPANISH_WB, "utf8");
  writeFileSync(join(ROOT, "wordbank.js"), transformWordbank(wbSrc, esToAr));

  const lines = [
    "/* global window */",
    "(() => {",
    '  "use strict";',
    "",
    "  /** English ↔ Iraqi Arabic sentence pairs (outline from Spanish-Flashcards). */",
    "  window.SENTENCE_BANK = [",
  ];
  const seenEn = new Set();
  for (const row of sents) {
    const en = adaptEnglish(row.en);
    if (seenEn.has(en.toLowerCase())) continue;
    seenEn.add(en.toLowerCase());
    let msa = msaCache[en];
    if (!msa) {
      try {
        msa = await msaForEn(en);
      } catch {
        msa = row.es;
      }
    }
    let ar = msaToIraqi(msa);
    if (hasSpanish(ar)) ar = msaToIraqi(await msaForEn(en).catch(() => msa));
    lines.push(`    { en: "${escJs(en)}", ar: "${escJs(ar)}", tag: "${escJs(row.tag || "grammar")}" },`);
  }
  lines.push(
    "  ];",
    "",
    "  const seen = new Set();",
    "  window.SENTENCE_BANK = window.SENTENCE_BANK.filter((row) => {",
    "    const k = String(row.en ?? \"\").trim().toLowerCase();",
    "    if (!k || seen.has(k)) return false;",
    "    seen.add(k);",
    "    return true;",
    "  });",
    "})();",
    ""
  );
  writeFileSync(join(ROOT, "sentence-bank.js"), lines.join("\n"));

  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "sentence-bank.js"), "utf8"), ctx);
  const wb = ctx.window.WORD_BANK;
  const bad = wb.filter((w) => !hasArabic(w.ar) || hasSpanish(w.ar));
  console.log(`\nDone: ${wb.length} words, ${ctx.window.SENTENCE_BANK.length} sentences`);
  console.log(`Issues: ${bad.length}`);
  bad.slice(0, 8).forEach((w) => console.log(" -", w.en, "=>", w.ar));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
