#!/usr/bin/env node
/** Build Arabic wordbank mirroring Spanish structure; unique Arabic per card. */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import vm from "vm";

const ROOT = join(import.meta.dirname, "..");
const SPANISH_WB = "/tmp/spanish-flashcards/wordbank.js";
const CACHE = join(import.meta.dirname, ".ar-from-es-cache.json");

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
  "¿cómo te llamas?": "مَا اسْمُكَ؟",
  "me llamo…": "اسْمِي…",
  "mucho gusto": "تَشَرَّفْتُ",
  "encantado/a": "سُعِدْتُ بِلِقَائِك",
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

async function translateEs(es) {
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=es&tl=ar&dt=t&q=" +
    encodeURIComponent(es.slice(0, 480));
  const res = await fetch(url);
  const data = await res.json();
  return data[0].map((p) => p[0]).join("").trim();
}

function buildEsToArMap(spanishWords, cache) {
  const map = new Map();
  const usedAr = new Set();

  for (const { es, en } of spanishWords) {
    if (map.has(es)) continue;
    const key = es.trim().toLowerCase();
    let ar = CURATED[key] || CURATED[es] || cache[key];
    if (!ar || !/[\u0600-\u06FF]/.test(ar)) {
      ar = cache[key] || es;
    }
    const base = ar.trim();
    let final = base;
    if (usedAr.has(final.toLowerCase())) {
      let n = 2;
      final = `${base} ٢`;
      while (usedAr.has(final.toLowerCase())) {
        final = `${base} ${n}`;
        n++;
      }
    }
    usedAr.add(final.toLowerCase());
    map.set(es, final);
  }
  return map;
}

function transform(src, esToAr) {
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
      const en = EN_ADAPT[unesc(enRaw)] || unesc(enRaw);
      return `["${escJs(esToAr.get(es) ?? es)}", "${escJs(en)}", "${tag}"]`;
    }
  );
  out = out.replace(/for \(const \[es, en, tag\] of (\w+)\)/g, "for (const [ar, en, tag] of $1)");
  out = out.replace(/push\(\{ es, en, tag \}\)/g, "push({ ar, en, tag })");
  out = out.replace(/String\(w\.es\)/g, "String(w.ar)");
  out = out.replace(/same Spanish\)/g, "same Arabic)");
  return out;
}

async function main() {
  const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};
  const ctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
  vm.runInContext(readFileSync(SPANISH_WB, "utf8"), ctx);
  const spanishWords = ctx.window.WORD_BANK;

  const missing = [...new Set(spanishWords.map((w) => w.es))].filter((es) => {
    const k = es.trim().toLowerCase();
    const ar = CURATED[k] || cache[k];
    return !ar || !/[\u0600-\u06FF]/.test(ar);
  });
  if (missing.length) {
    console.log(`Fetching ${missing.length} missing glosses…`);
    for (const es of missing) {
      try {
        cache[es.trim().toLowerCase()] = await translateEs(es);
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        console.warn(es, e.message);
      }
    }
    writeFileSync(CACHE, JSON.stringify(cache));
  }

  const esToAr = buildEsToArMap(spanishWords, cache);
  const src = readFileSync(SPANISH_WB, "utf8");
  writeFileSync(join(ROOT, "wordbank.js"), transform(src, esToAr));

  const vctx = vm.createContext({ window: {} });
  vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), vctx);
  vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), vctx);
  const bank = vctx.window.WORD_BANK;
  const bad = bank.filter((w) => !/[\u0600-\u06FF]/.test(w.ar));
  console.log(`Deck: ${bank.length} words (Spanish: ${spanishWords.length}), missing Arabic: ${bad.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
