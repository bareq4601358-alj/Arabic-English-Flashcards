#!/usr/bin/env node
/**
 * Rebuild Arabic glosses for all cards using Google Translate (gtx) + manual fixes.
 * Reads Spanish-Flashcards word list only (read-only); writes arabic flashcards/wordbank.js
 */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import vm from "vm";

const ROOT = join(import.meta.dirname, "..");
const SPANISH_WB = "/tmp/spanish-flashcards/wordbank.js";
const DELAY_MS = 120;

/** Override bad or context-specific glosses (key = exact English from bank). */
const MANUAL = {
  "I speak a little Spanish": "أَتَكَلَّمُ العَرَبِيَّةَ قَلِيلًا",
  "I speak a little Arabic": "أَتَكَلَّمُ العَرَبِيَّةَ قَلِيلًا",
  "Spanish omelette": "عِجَّة",
  omelette: "عِجَّة",
  paella: "بَايِلّا",
  gazpacho: "غَزْبَاشُو",
  tapas: "تَابَاس",
  "we (feminine)": "نَحْنُ",
  we: "نَحْنُ",
  "bless you": "يَرْحَمُكَ الله",
  "you're welcome": "عَلَى الرَّحْبِ وَالسَّعَة",
  "good afternoon": "مَسَاءُ الخَيْر",
  "good night": "تَصْبَحُ عَلَى خَيْر",
  "how's it going?": "كَيْفَ الحَال؟",
  "how are you?": "كَيْفَ حَالُكَ؟",
  "what's your name?": "مَا اسْمُكَ؟",
  "my name is…": "اسْمِي…",
  "where are you from?": "مِنْ أَيْنَ أَنْتَ؟",
  "I'm from…": "أَنَا مِنْ…",
  "I'm sorry": "أَنَا آسِف",
  "sorry / excuse me": "عُذْرًا",
  "well / fine": "بِخَيْر",
  "so-so": "عَلَى مَا يَرَام",
  "okay / alright": "حَسَنًا",
  "of course": "بِالطَّبْع",
  "to be (permanent)": "كَانَ",
  "to be (temporary)": "أَصْبَحَ",
  "to want / to love": "أَرَادَ / أَحَبَّ",
  "to take / to drink": "أَخَذَ / شَرِبَ",
  "to carry / to wear": "حَمَلَ / اِرْتَدَى",
  "to put / to place": "وَضَعَ",
  "to wait / to hope": "انْتَظَرَ / رَجَا",
  "to know (a person)": "عَرَفَ",
  "to know (a fact)": "عَلِمَ",
  "fish (food)": "سَمَك",
  "right (direction)": "يَمِين",
  "there (far)": "هُنَاكَ",
  "there (near)": "هُنَاكَ",
  "that (far away)": "ذَلِكَ",
  "one or a": "وَاحِد / أَ",
  "only / alone": "فَقَط / وَحْدَهُ",
  "already / now": "بِالفِعْل / الآن",
  "job / work": "عَمَل",
  "mail / email": "بَرِيد / بريد إلكتروني",
  "boy / child": "وَلَد",
  "girl / child": "بِنْت",
  "they (masculine)": "هُمْ",
  "they (feminine)": "هُنَّ",
  "you (informal)": "أَنْتَ",
  "you (formal)": "حَضْرَتُكَ",
  "your (informal)": "كَ",
  "his/her/your/their": "هُ / هَا /كُم",
  "weather / time": "طَقْس / وَقْت",
};

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ");
}

function hasArabic(s) {
  return /[\u0600-\u06FF]/.test(s);
}

function loadSpanishBank() {
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(SPANISH_WB, "utf8"), ctx);
  return ctx.window.WORD_BANK;
}

async function translateEn(en) {
  if (MANUAL[en]) return MANUAL[en];
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=" +
    encodeURIComponent(en.slice(0, 500));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const parts = data[0];
  if (!parts?.length) throw new Error("empty");
  return parts.map((p) => p[0]).join("").trim();
}

function uniqueAr(ar, en, used) {
  let base = ar.trim();
  if (!base) base = en;
  const key = base.toLowerCase();
  if (!used.has(key)) {
    used.add(key);
    return base;
  }
  const hint = en.split(/[/(]/)[0].trim().slice(0, 20);
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
  const spanish = loadSpanishBank();
  console.log(`Translating ${spanish.length} cards…`);

  const used = new Set();
  const rows = [];

  for (let i = 0; i < spanish.length; i++) {
    const { en, tag } = spanish[i];
    let ar;
    try {
      ar = await translateEn(en);
    } catch (e) {
      console.warn(`[${i + 1}] failed "${en}": ${e.message}`);
      ar = en;
    }
    if (!hasArabic(ar)) {
      console.warn(`[${i + 1}] no Arabic for "${en}", keeping retry…`);
      await new Promise((r) => setTimeout(r, 2000));
      try {
        ar = await translateEn(en);
      } catch {
        ar = `⚠ ${en}`;
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
    "  /** { ar: string, en: string, tag?: string } — vocabulary aligned with Spanish-Flashcards */",
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

  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), ctx);
  const bank = ctx.window.WORD_BANK;
  const bad = bank.filter((w) => !hasArabic(w.ar) || w.ar === w.en);
  console.log(`\nDeck: ${bank.length} cards`);
  console.log(`Issues remaining: ${bad.length}`);
  if (bad.length) bad.slice(0, 10).forEach((w) => console.log(" -", w.en, "=>", w.ar));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
