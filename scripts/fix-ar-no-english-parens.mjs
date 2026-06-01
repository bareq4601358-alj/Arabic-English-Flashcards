#!/usr/bin/env node
/** Strip English disambiguators from Arabic; resolve duplicate ar with Iraqi/Arabic-only suffixes. */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import vm from "vm";
import { adaptEnglish, iraqiFor, IRAQI_BY_EN } from "./iraqi-lexicon.mjs";

const ROOT = join(import.meta.dirname, "..");
const WB = join(ROOT, "wordbank.js");

/** Second gloss when two English entries would share the same Arabic surface form. */
const COLLISION_AR = {
  "okay / alright": "تمام",
  "we (feminine)": "إحنا (نساء)",
  "to look at / watch": "يشوف / يتفرج",
  "to listen": "يسمع",
  good: "زين",
  bad: "مو زين",
  also: "هم",
  "only / alone": "بس",
  still: "بعد",
  "already / now": "هسة",
  man: "رجل",
  question: "سؤال",
  "one or a": "واحد",
  "that (far away)": "ذاك",
  "there (near)": "هناك",
  banknote: "ورقة نقد",
  "fish (alive)": "سمكة حية",
  "bell peppers": "فلفل حلو",
  "customs officer": "موظف جمارك",
  "ticket window / small window": "شباك تذاكر",
  "teacher (female)": "مدرسة",
  perhaps: "يمكن",
  however: "لكن",
  maybe: "ربما",
  "era / epoch": "عصر",
  "delay (wait)": "تأخير",
  "sweet / candy": "حلويات",
  pillow: "مخدة",
  wrist: "معصم",
  patient: "مريض (شخص)",
  interview: "مقابلة عمل",
  prairie: "سهل",
  "grass / herb": "عشب",
  "to put in": "يحط جوا",
  "to repair": "يصلّح",
  "to function": "يشتغل",
  "to connect": "يوصل",
  "to return something": "يرجّع شي",
  "to break a promise": "يكسر وعد",
  ATM: "صراف آلي",
  "female neighbor": "جارة",
  "episode / chapter": "حلقة",
  wallet: "محفظة",
  "goal (aim)": "هدف",
  advice: "نصيحة",
  president: "رئيس",
  "a vote": "صوت انتخاب",
  "careful!": "انتبه!",
  "soccer ball": "كرة قدم",
  "goal (sports)": "هدف مباراة",
  "right (legal)": "حق",
  help: "مساعدة",
  dry: "جاف",
  light: "ضوء",
  short: "قصير",
  older: "أكبر",
  soft: "ناعم",
  hard: "صعب",
  hot: "حار",
  rest: "راحة",
  sale: "تخفيضات",
  return: "يرجع",
  "pants (one pair)": "بنطلون",
  boots: "جزمة",
  tablet: "جهاز لوحي",
  pupil: "تلميذ",
  desk: "طاولة مكتب",
  monkey: "قرد",
  "see you": "أشوفك",
  "excuse me": "لو سمحت",
  "congratulations!": "مبروك",
};

function stripLatinParens(ar) {
  return String(ar)
    .replace(/\s*\([^)]*[A-Za-z][^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function pickAr(en, msaFallback) {
  const adapted = adaptEnglish(en);
  const key = adapted in COLLISION_AR ? adapted : en in COLLISION_AR ? en : null;
  if (key && COLLISION_AR[key]) return COLLISION_AR[key];
  return (
    IRAQI_BY_EN[adapted] ||
    IRAQI_BY_EN[en] ||
    stripLatinParens(iraqiFor(adapted, msaFallback) || msaFallback)
  );
}

function uniqueArForEn(en, usedAr, msaFallback) {
  let ar = pickAr(en, msaFallback);
  ar = stripLatinParens(ar);
  if (!ar) ar = stripLatinParens(msaFallback);

  if (!usedAr.has(ar.toLowerCase())) {
    usedAr.add(ar.toLowerCase());
    return ar;
  }
  const alt = COLLISION_AR[adaptEnglish(en)] || COLLISION_AR[en];
  if (alt && !usedAr.has(alt.toLowerCase())) {
    usedAr.add(alt.toLowerCase());
    return alt;
  }
  let n = 2;
  let candidate = `${ar} ٢`;
  while (usedAr.has(candidate.toLowerCase())) {
    candidate = `${ar} ${n}`;
    n++;
  }
  usedAr.add(candidate.toLowerCase());
  return candidate;
}

// Strip English from all ar strings in source
let src = readFileSync(WB, "utf8");
src = src.replace(/"ar: "((?:\\.|[^"\\])*)"/g, (_, raw) => {
  const inner = raw.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  return `"ar: "${escJs(stripLatinParens(inner))}"`;
});
src = src.replace(
  /\[\s*"((?:\\.|[^"\\])*)"\s*,\s*"((?:\\.|[^"\\])*)"\s*,\s*"([^"]*)"\s*\]/g,
  (_, arRaw, enRaw, tag) => {
    const ar = arRaw.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    const en = enRaw.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    return `["${escJs(stripLatinParens(ar))}", "${escJs(en)}", "${tag}"]`;
  }
);
writeFileSync(WB, src);

// Rebuild deck order from Spanish-style filter in wordbank.js
const ctx = vm.createContext({ window: {} });
vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
vm.runInContext(readFileSync(WB, "utf8"), ctx);
const bank = ctx.window.WORD_BANK;

const usedAr = new Set();
const enToFixed = new Map();
for (const w of bank) {
  if (enToFixed.has(w.en)) continue;
  enToFixed.set(w.en, uniqueArForEn(w.en, usedAr, w.ar));
}

let outSrc = readFileSync(WB, "utf8");
for (const [en, ar] of enToFixed) {
  const enEsc = en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  outSrc = outSrc.replace(
    new RegExp(`(\\{\\s*ar:\\s*")(?:\\\\.|[^"\\\\])*(",\\s*en:\\s*"${enEsc}")`, "g"),
    `$1${escJs(ar)}$2`
  );
  outSrc = outSrc.replace(
    new RegExp(`(\\[\\s*")(?:\\\\.|[^"\\\\])*"(\\s*,\\s*"${enEsc}"\\s*,)`, "g"),
    `$1${escJs(ar)}$2`
  );
}
writeFileSync(WB, outSrc);

const vctx = vm.createContext({ window: {} });
vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), vctx);
vm.runInContext(readFileSync(WB, "utf8"), vctx);
const final = vctx.window.WORD_BANK;
const latinParen = final.filter((w) => /\([A-Za-z]/.test(w.ar));
const dupAr = new Map();
for (const w of final) {
  const k = w.ar.toLowerCase();
  dupAr.set(k, (dupAr.get(k) || 0) + 1);
}
const dups = [...dupAr.entries()].filter(([, n]) => n > 1);
console.log(`Deck: ${final.length} words`);
console.log(`English parens left: ${latinParen.length}`);
console.log(`Duplicate ar keys: ${dups.length}`);
if (latinParen.length) latinParen.slice(0, 8).forEach((w) => console.log(" ", w.en, "=>", w.ar));
if (dups.length) dups.slice(0, 8).forEach(([k, n]) => console.log(" dup", n, k));
