#!/usr/bin/env node
/**
 * Mirror Spanish-Flashcards banks: same file layout, same word/sentence count, ar instead of es.
 * Reads /tmp/spanish-flashcards only — does not modify the Spanish GitHub repo.
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import vm from "vm";

const ROOT = join(import.meta.dirname, "..");
const SPANISH_ROOT = "/tmp/spanish-flashcards";
const CACHE_FILE = join(import.meta.dirname, ".ar-from-es-cache.json");
const DELAY_MS = 90;

const CURATED = {
  hola: "مَرْحَبًا",
  "adiós": "مَعَ السَّلَامَة",
  "por favor": "مِنْ فَضْلِك",
  gracias: "شُكْرًا",
  "de nada": "عَلَى الرَّحْبِ وَالسَّعَة",
  "perdón": "عُذْرًا",
  "lo siento": "أَنَا آسِف",
  "buenos días": "صَبَاحُ الخَيْر",
  "buenas tardes": "مَسَاءُ الخَيْر",
  "buenas noches": "تَصْبَحُ عَلَى خَيْر",
  "¿qué tal?": "كَيْفَ الحَال؟",
  "¿cómo estás?": "كَيْفَ حَالُكَ؟",
  bien: "بِخَيْر",
  mal: "سَيِّئًا",
  "más o menos": "عَلَى مَا يَرَام",
  sí: "نَعَم",
  no: "لَا",
  limpio: "نَظِيف",
  sucio: "وَسِخ",
  abierto: "مَفْتُوح",
  cerrado: "مُغْلَق",
  vacío: "فَارِغ",
  lleno: "مُمْتَلِئ",
  correcto: "صَحِيح",
  equivocado: "خَطَأ",
  correr: "يَجْرِي",
  caminar: "يَمْشِي",
  "hablo un poco de español": "أَتَكَلَّمُ العَرَبِيَّةَ قَلِيلًا",
  conductor: "سَائِق",
  wifi: "واي فاي",
};

const EN_ADAPT = {
  "I speak a little Spanish": "I speak a little Arabic",
  "Spanish omelette": "omelette",
};

function escJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function unesc(s) {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function loadCache() {
  if (!existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(c) {
  writeFileSync(CACHE_FILE, JSON.stringify(c));
}

async function translateEs(es) {
  const key = es.trim().toLowerCase();
  if (CURATED[key]) return CURATED[key];
  const cache = loadCache();
  if (cache[key]) return cache[key];
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=ar&dt=t&q=" +
    encodeURIComponent(es.slice(0, 480));
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  const ar = data[0].map((p) => p[0]).join("").trim();
  cache[key] = ar;
  saveCache(cache);
  return ar;
}

async function translateEnSentence(en) {
  const text = EN_ADAPT[en] || en;
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=" +
    encodeURIComponent(text.slice(0, 480));
  const res = await fetch(url);
  if (!res.ok) throw new Error(String(res.status));
  const data = await res.json();
  return data[0].map((p) => p[0]).join("").trim();
}

function runSpanish(name) {
  const ctx = vm.createContext({ window: {} });
  if (name === "wordbank.js") {
    vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  }
  vm.runInContext(readFileSync(join(SPANISH_ROOT, name), "utf8"), ctx);
  return ctx.window;
}

function transformWordbankSource(src, esToAr) {
  let out = src;
  out = out.replace(
    /\{ es: string, en: string, tag\?: string \}/,
    "{ ar: string, en: string, tag?: string }"
  );
  out = out.replace(/\{ es:/g, "{ ar:");
  out = out.replace(/push\(\{ es, en, tag \}\)/g, "push({ ar, en, tag })");
  out = out.replace(/String\(w\.es\)/g, "String(w.ar)");
  out = out.replace(/same Spanish\)/g, "same Arabic)");

  out = out.replace(/\{ es: "((?:\\.|[^"\\])*)"/g, (_, esRaw) => {
    const es = unesc(esRaw);
    const ar = esToAr.get(es) ?? es;
    return `{ ar: "${escJs(ar)}"`;
  });

  out = out.replace(
    /\[\s*"((?:\\.|[^"\\])*)"\s*,\s*"((?:\\.|[^"\\])*)"\s*,\s*"([^"]*)"\s*\]/g,
    (_, esRaw, enRaw, tag) => {
      const es = unesc(esRaw);
      const en = unesc(enRaw);
      const enFixed = EN_ADAPT[en] || en;
      const ar = esToAr.get(es) ?? es;
      return `["${escJs(ar)}", "${escJs(enFixed)}", "${tag}"]`;
    }
  );

  return out;
}

async function buildEsToArMap(words) {
  const map = new Map();
  console.log(`Translating ${words.length} unique Spanish forms…`);
  const unique = [...new Set(words.map((w) => w.es))];
  for (let i = 0; i < unique.length; i++) {
    const es = unique[i];
    try {
      map.set(es, await translateEs(es));
    } catch (e) {
      console.warn(`  "${es}": ${e.message}`);
      map.set(es, es);
    }
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${unique.length}`);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }
  return map;
}

async function buildSentenceBank(sentences) {
  const lines = [
    "/* global window */",
    "(() => {",
    '  "use strict";',
    "",
    "  /** Full-sentence pairs for structure practice (English ↔ Arabic word order). */",
    "  /** { en, ar, tag? } */",
    "  window.SENTENCE_BANK = [",
  ];

  console.log(`Translating ${sentences.length} sentences…`);
  for (let i = 0; i < sentences.length; i++) {
    const en = EN_ADAPT[sentences[i].en] || sentences[i].en;
    const tag = sentences[i].tag || "grammar";
    let ar;
    try {
      ar = await translateEnSentence(sentences[i].en);
    } catch {
      ar = sentences[i].es;
    }
    lines.push(`    { en: "${escJs(en)}", ar: "${escJs(ar)}", tag: "${escJs(tag)}" },`);
    if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${sentences.length}`);
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  lines.push(
    "  ];",
    "",
    "  const seen = new Set();",
    "  window.SENTENCE_BANK = window.SENTENCE_BANK.filter((row) => {",
    "    const k = String(row.ar ?? \"\")",
    "      .trim()",
    "      .toLowerCase();",
    "    if (!k || seen.has(k)) return false;",
    "    seen.add(k);",
    "    return true;",
    "  });",
    "})();",
    ""
  );
  return lines.join("\n");
}

async function main() {
  if (!existsSync(join(SPANISH_ROOT, "wordbank.js"))) {
    throw new Error("Clone Spanish-Flashcards to /tmp/spanish-flashcards first.");
  }

  const esWords = runSpanish("wordbank.js").WORD_BANK;
  const esSents = runSpanish("sentence-bank.js").SENTENCE_BANK;
  console.log(`Spanish source: ${esWords.length} words, ${esSents.length} sentences`);

  const esToAr = await buildEsToArMap(esWords);
  const wbSrc = readFileSync(join(SPANISH_ROOT, "wordbank.js"), "utf8");
  writeFileSync(join(ROOT, "wordbank.js"), transformWordbankSource(wbSrc, esToAr));

  writeFileSync(join(ROOT, "sentence-bank.js"), await buildSentenceBank(esSents));

  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "sentence-bank.js"), "utf8"), ctx);
  const wb = ctx.window.WORD_BANK;
  const bad = wb.filter((w) => !/[\u0600-\u06FF]/.test(w.ar));
  console.log(`\nArabic deck: ${wb.length} words, ${ctx.window.SENTENCE_BANK.length} sentences`);
  console.log(`Words missing Arabic script: ${bad.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
