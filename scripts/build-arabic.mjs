#!/usr/bin/env node
/**
 * Converts the copied Spanish flashcards project to Arabic ↔ English.
 * Run from repo root: node scripts/build-arabic.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

const ROOT = join(import.meta.dirname, "..");

/** Modern Standard Arabic for each English gloss (same keys as Spanish wordbank). */
const AR_BY_EN = {
  hello: "مَرْحَبًا",
  goodbye: "مَعَ السَّلَامَة",
  please: "مِنْ فَضْلِك",
  "thank you": "شُكْرًا",
  "you're welcome": "عَلَى الرَّحْبِ وَالسَّعَة",
  "sorry / excuse me": "عُذْرًا / مَعْذِرَةً",
  "I'm sorry": "أَنَا آسِف",
  "good morning": "صَبَاحُ الخَيْر",
  "good afternoon": "مَسَاءُ الخَيْر",
  "good night": "تَصْبَحُ عَلَى خَيْر",
  "how's it going?": "كَيْفَ الحَال؟",
  "how are you?": "كَيْفَ حَالُك؟",
  "well / fine": "بِخَيْر",
  badly: "سَيِّئًا",
  "so-so": "عَلَى مَا يَرَام",
  "what's your name?": "مَا اسْمُك؟",
  "my name is…": "اسْمِي…",
  "nice to meet you": "تَشَرَّفْتُ",
  "pleased to meet you": "سُعِدْتُ بِلِقَائِك",
  "where are you from?": "مِنْ أَيْنَ أَنْتَ؟",
  "I'm from…": "أَنَا مِنْ…",
  yes: "نَعَم",
  no: "لَا",
  possibly: "رُبَّمَا",
  "of course": "بِالطَّبْع",
  "okay / alright": "حَسَنًا",
  welcome: "أَهْلًا وَسَهْلًا",
  "bless you": "يَرْحَمُكَ الله",
  one: "وَاحِد",
  two: "اِثْنَان",
  three: "ثَلَاثَة",
  four: "أَرْبَعَة",
  five: "خَمْسَة",
  six: "سِتَّة",
  seven: "سَبْعَة",
  eight: "ثَمَانِيَة",
  nine: "تِسْعَة",
  ten: "عَشَرَة",
  today: "اليَوْم",
  tomorrow: "غَدًا",
  yesterday: "أَمْس",
  now: "الآن",
  later: "لَاحِقًا",
  before: "قَبْل",
  after: "بَعْد",
  always: "دَائِمًا",
  never: "أَبَدًا",
  sometimes: "أَحْيَانًا",
  early: "مُبَكِّرًا",
  late: "مُتَأَخِّرًا",
  I: "أَنَا",
  "you (informal)": "أَنْتَ",
  "you (formal)": "حَضْرَتُك",
  he: "هُوَ",
  she: "هِيَ",
  we: "نَحْنُ",
  "we (feminine)": "نَحْنُ",
  "they (masculine)": "هُمْ",
  "they (feminine)": "هُنَّ",
  my: "ي",
  "your (informal)": "ك",
  "his/her/your/their": "ه",
  "to be (permanent)": "أَنْ يَكُونَ",
  "to be (temporary)": "أَنْ يَكُونَ (مؤقت)",
  "to have": "أَنْ يَمْلِكَ",
  "to do / to make": "أَنْ يَفْعَلَ / يَصْنَعَ",
  "to go": "أَنْ يَذْهَبَ",
  "to come": "أَنْ يَأْتِيَ",
  "to see": "أَنْ يَرَى",
  "to look at / watch": "أَنْ يَنْظُرَ",
  "to hear": "أَنْ يَسْمَعَ",
  "to listen": "أَنْ يُصْغِيَ",
  "to speak": "أَنْ يَتَكَلَّمَ",
  "to say / to tell": "أَنْ يَقُولَ",
  "to ask": "أَنْ يَسْأَلَ",
  "to answer": "أَنْ يُجِيبَ",
  "to be able to / can": "أَنْ يَسْتَطِيعَ",
  "to want / to love": "أَنْ يُرِيدَ / يُحِبَّ",
  "to need": "أَنْ يَحْتَاجَ",
  "to like": "أَنْ يُعْجِبَهُ",
  "to love": "أَنْ يُحِبَّ",
  "to eat": "أَنْ يَأْكُلَ",
  "to drink": "أَنْ يَشْرَبَ",
  "to live": "أَنْ يَعِيشَ",
  "to work": "أَنْ يَعْمَلَ",
  "to study": "أَنْ يَدْرُسَ",
  "to read": "أَنْ يَقْرَأَ",
  "to write": "أَنْ يَكْتُبَ",
  "to learn": "أَنْ يَتَعَلَّمَ",
  "to teach": "أَنْ يُعَلِّمَ",
  "to buy": "أَنْ يَشْتَرِيَ",
  "to sell": "أَنْ يَبِيعَ",
  "to pay": "أَنْ يَدْفَعَ",
  "to open": "أَنْ يَفْتَحَ",
  "to close": "أَنْ يُغْلِقَ",
  "to start": "أَنْ يَبْدَأَ",
  "to finish": "أَنْ يُنْهِيَ",
  "to carry / to wear": "أَنْ يَحْمِلَ / يَرْتَدِيَ",
  "to put / to place": "أَنْ يَضَعَ",
  "to give": "أَنْ يُعْطِيَ",
  "to take / to drink": "أَنْ يَأْخُذَ / يَشْرَبَ",
  "to use": "أَنْ يَسْتَخْدِمَ",
  "to help": "أَنْ يُسَاعِدَ",
  "to look for": "أَنْ يَبْحَثَ عَنْ",
  "to find": "أَنْ يَجِدَ",
  "to wait / to hope": "أَنْ يَنْتَظِرَ / يَرْجُو",
  "to call": "أَنْ يَتَّصِلَ",
  "to arrive": "أَنْ يَصِلَ",
  "to go out": "أَنْ يَخْرُجَ",
  "to enter": "أَنْ يَدْخُلَ",
  "to return": "أَنْ يَعُودَ",
  "to travel": "أَنْ يُسَافِرَ",
  "to know (a person)": "أَنْ يَعْرِفَ",
  "to know (a fact)": "أَنْ يَعْلَمَ",
  "to think": "أَنْ يُفَكِّرَ",
  "to believe": "أَنْ يُؤْمِنَ",
  "to feel": "أَنْ يَشْعُرَ",
  "to sleep": "أَنْ يَنَامَ",
  here: "هُنَا",
  "there (far)": "هُنَاكَ",
  left: "يَسَار",
  "right (direction)": "يَمِين",
  straight: "مُبَاشَرَةً",
  near: "قَرِيب",
  far: "بَعِيد",
  map: "خَرِيطَة",
  street: "شَارِع",
  city: "مَدِينَة",
  country: "بَلَد",
  airport: "مَطَار",
  ticket: "تَذْكِرَة",
  passport: "جَوَاز سَفَر",
  hotel: "فُنْدُق",
  room: "غُرْفَة",
  reservation: "حَجْز",
  water: "مَاء",
  coffee: "قَهْوَة",
  tea: "شَاي",
  milk: "حَلِيب",
  bread: "خُبْز",
  rice: "أُرْز",
  chicken: "دَجَاج",
  meat: "لَحْم",
  "fish (food)": "سَمَك",
  vegetables: "خُضْرَوَات",
  fruit: "فَاكِهَة",
  apple: "تُفَّاحَة",
  banana: "مَوْز",
  orange: "بُرْتُقَال",
  cheese: "جُبْن",
  egg: "بَيْضَة",
  sugar: "سُكَّر",
  salt: "مِلْح",
  pepper: "فُلْفُل",
  oil: "زَيْت",
  vinegar: "خَلّ",
  house: "بَيْت",
  apartment: "شَقَّة",
  door: "بَاب",
  window: "نَافِذَة",
  kitchen: "مَطْبَخ",
  bathroom: "حَمَّام",
  bedroom: "غُرْفَة نَوْم",
  "living room": "غُرْفَة جُلُوس",
  table: "طَاوِلَة",
  chair: "كُرْسِي",
  bed: "سَرِير",
  key: "مِفْتَاح",
  good: "جَيِّد",
  bad: "سَيِّئ",
  big: "كَبِير",
  small: "صَغِير",
  new: "جَدِيد",
  old: "قَدِيم",
  pretty: "جَمِيل",
  ugly: "قَبِيح",
  easy: "سَهْل",
  difficult: "صَعْب",
  fast: "سَرِيع",
  slow: "بَطِيء",
  expensive: "غَالٍ",
  cheap: "رَخِيص",
  and: "وَ",
  or: "أَوْ",
  but: "لَكِنْ",
  because: "لِأَنَّ",
  "for / in order to": "لِـ / كَيْ",
  with: "مَعَ",
  without: "بِدُون",
  very: "جِدًّا",
  also: "أَيْضًا",
  "only / alone": "فَقَط / وَحْدَهُ",
  still: "مَا زَالَ",
  "already / now": "بِالفِعْل / الآن",
  head: "رَأْس",
  face: "وَجْه",
  eye: "عَيْن",
  nose: "أَنْف",
  mouth: "فَم",
  hand: "يَد",
  arm: "ذِرَاع",
  leg: "سَاق",
  foot: "قَدَم",
  heart: "قَلْب",
  "weather / time": "طَقْس / وَقْت",
  sun: "شَمْس",
  rain: "مَطَر",
  wind: "رِيح",
  snow: "ثَلْج",
  heat: "حَرارة",
  cold: "بَرْد",
  "job / work": "وَظِيفَة / عَمَل",
  office: "مَكْتَب",
  meeting: "اجْتِمَاع",
  "mail / email": "بَرِيد / بريد إلكتروني",
  school: "مَدْرَسَة",
  class: "صَفّ",
  homework: "وَاجِب مَنْزِلِي",
  exam: "امْتِحَان",
  friend: "صَدِيق",
  family: "عَائِلَة",
  "boy / child": "وَلَد / طِفْل",
  "girl / child": "بِنْت / طِفْل",
  man: "رَجُل",
  woman: "امْرَأَة",
  person: "شَخْص",
  name: "اسْم",
  word: "كَلِمَة",
  question: "سُؤَال",
  answer: "جَوَاب",
  problem: "مُشْكِلَة",
  idea: "فِكْرَة",
  car: "سَيَّارَة",
  bus: "حَافِلَة",
  train: "قِطَار",
  subway: "مِتْرُو",
  bicycle: "دَرَّاجَة",
  clothes: "مَلَابِس",
  shirt: "قَمِيص",
  pants: "سِرْوَال",
  shoes: "حِذَاء",
  jacket: "سُتْرَة",
  phone: "هَاتِف",
  computer: "حَاسُوب",
  internet: "إنترنت",
  password: "كَلِمَة مُرُور",
  morning: "صَبَاح",
  night: "لَيْل",
  week: "أُسْبُوع",
  month: "شَهْر",
  year: "سَنَة",
  hour: "سَاعَة",
  minute: "دَقِيقَة",
  "one or a": "وَاحِد / أ",
  this: "هَذَا",
  that: "ذَلِك",
  "that (far away)": "ذَلِك (بَعِيد)",
  "there (near)": "هُنَاكَ (قَرِيب)",
};

const TEXT_REPLACEMENTS = [
  [/English · Spanish/g, "Arabic · English"],
  [/English · Spanish/g, "Arabic · English"],
  [/English ↔ Spanish/g, "Arabic ↔ English"],
  [/English and Spanish/g, "Arabic and English"],
  [/Core Spanish/g, "Core Arabic"],
  [/Spanish word order/g, "Arabic word order"],
  [/Spanish spelling/g, "Arabic spelling"],
  [/Spanish key/g, "Arabic key"],
  [/Spanish sentence/g, "Arabic sentence"],
  [/Type the Spanish/g, "Type the Arabic"],
  [/showingSpanish/g, "showingEnglish"],
  [/showSpanish/g, "showEnglish"],
  [/flash\.es-en\./g, "flash.ar-en."],
  [/flash\.phrases\./g, "flash.ar-phrases."],
  [/textEs/g, "textEnBack"],
  [/flashWordEs/g, "flashWordAr"],
  [/id="textEn"/g, 'id="textAr"'],
  [/getElementById\("textEn"\)/g, 'getElementById("textAr")'],
  [/getElementById\("textEs"\)/g, 'getElementById("textEnBack")'],
  [/\bSpanish\b/g, "Arabic"],
  [/\bspanish\b/g, "arabic"],
  [/\{ es: string, en: string/g, "{ ar: string, en: string"],
  [/\bes:\s*norm\(/g, "ar: norm("],
  [/\bw\.es\b/g, "w.ar"],
  [/\bcurrent\.es\b/g, "current.ar"],
  [/\bincoming\.es\b/g, "incoming.ar"],
  [/\bleftWord\.en\b/g, "leftWord.ar"],
  [/\brightWord\.es\b/g, "primaryEn(rightWord.en)"],
  [/\btypeof w\.es\b/g, "typeof w.ar"],
  [/\bword\.es\b/g, "word.ar"],
  [/\br\.es\b/g, "r.ar"],
  [/\bes:\s*String\(w\.es/g, "ar: String(w.ar"],
  [/\bes:\s*norm\(w\.es\)/g, "ar: norm(w.ar)"],
  [/\bkeyOf\(w\) => norm\(w\.es\)/g, "keyOf(w) => norm(w.ar)"],
  [/\$\{en\}__\$\{es\}/g, "${ar}__${en}"],
  [/\ben: String\(w\.en[^)]*\)[^;]*;\s*const es = String\(w\.es/g, "ar: String(w.ar || \"\").trim().toLowerCase();\n    const en = String(w.en"],
  [/Flip English ↔ Spanish/g, "Flip Arabic ↔ English"],
  [/first press shows Spanish/g, "first press shows English"],
  [/loads next card \(English up\)/g, "loads next card (Arabic up)"],
  [/Spanish\/western/g, "Arabic/western"],
  [/ignores case, accents/g, "ignores diacritics, case"],
];

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    if (name === "scripts" || name === ".git") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

function patchFile(path) {
  const ext = extname(path);
  if (![".js", ".html", ".css", ".mjs", ".md"].includes(ext)) return;
  if (path.includes("build-arabic.mjs")) return;
  let s = readFileSync(path, "utf8");
  let changed = false;
  for (const [re, rep] of TEXT_REPLACEMENTS) {
    if (re.test(s)) {
      s = s.replace(re, rep);
      changed = true;
    }
  }
  if (changed) writeFileSync(path, s);
}

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildWordbank() {
  const entries = JSON.parse(readFileSync("/tmp/spanish-entries.json", "utf8"));
  const lines = [
    "/* global window */",
    "(() => {",
    '  "use strict";',
    "",
    "  /**",
    "   * Word object shape:",
    "   * { ar: string, en: string, tag?: string }",
    "   */",
    "  window.WORD_BANK = [",
  ];
  const missing = [];
  for (const { en, tag } of entries) {
    const ar = AR_BY_EN[en];
    if (!ar) missing.push(en);
    lines.push(`    { ar: "${esc(ar || en)}", en: "${esc(en)}", tag: "${esc(tag)}" },`);
  }
  lines.push("  ];", "})();", "");
  writeFileSync(join(ROOT, "wordbank.js"), lines.join("\n"));
  if (missing.length) {
    console.warn("Missing Arabic for:", missing.slice(0, 20).join(", "), missing.length > 20 ? `…+${missing.length - 20}` : "");
  }
  console.log("wordbank.js:", entries.length, "entries");
}

async function translateEnToAr(text) {
  const q = encodeURIComponent(text.slice(0, 450));
  const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=en|ar`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  if (!out) throw new Error("no translation");
  return out;
}

async function buildSentenceBank() {
  const src = readFileSync(join(ROOT, "sentence-bank.js"), "utf8");
  const entries = [...src.matchAll(/\{\s*en:\s*"((?:\\.|[^"\\])*)"\s*,\s*es:\s*"((?:\\.|[^"\\])*)"\s*,\s*tag:\s*"([^"]*)"\s*\}/g)].map(
    (m) => ({ en: m[1].replace(/\\"/g, '"'), es: m[2].replace(/\\"/g, '"'), tag: m[3] })
  );
  console.log("Translating", entries.length, "sentences (may take several minutes)…");
  const out = [];
  for (let i = 0; i < entries.length; i++) {
    const { en, tag } = entries[i];
    let ar = entries[i].es; // fallback
    try {
      ar = await translateEnToAr(en);
      await new Promise((r) => setTimeout(r, 350));
    } catch (e) {
      console.warn(`  [${i + 1}] failed:`, en.slice(0, 40), e.message);
    }
    out.push({ en, ar, tag });
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${entries.length}`);
  }
  const lines = [
    "/* global window */",
    "(() => {",
    '  "use strict";',
    "",
    "  /** Full-sentence pairs for structure practice (English ↔ Arabic). */",
    "  window.SENTENCE_BANK = [",
  ];
  for (const { en, ar, tag } of out) {
    lines.push(`    { en: "${esc(en)}", ar: "${esc(ar)}", tag: "${esc(tag)}" },`);
  }
  lines.push("  ];", "})();", "");
  writeFileSync(join(ROOT, "sentence-bank.js"), lines.join("\n"));
}

function patchIndexHtml() {
  const path = join(ROOT, "index.html");
  let s = readFileSync(path, "utf8");
  s = s.replace(
    /<div class="flashFace flashFaceFront">[\s\S]*?<\/div>\s*<div class="flashFace flashFaceBack">[\s\S]*?<\/div>/,
    `<div class="flashFace flashFaceFront">
                    <span class="flashLabel">Arabic</span>
                    <p class="flashWord flashWordAr" id="textAr">—</p>
                    <span class="flashCornerTag" id="deckTag">—</span>
                  </div>
                  <div class="flashFace flashFaceBack">
                    <span class="flashLabel">English</span>
                    <p class="flashWord" id="textEnBack">—</p>
                  </div>`
  );
  writeFileSync(path, s);
}

function patchMatchingHtml() {
  const path = join(ROOT, "matching.html");
  let s = readFileSync(path, "utf8");
  s = s
    .replace(/English and Spanish choices/g, "Arabic and English choices")
    .replace(/aria-label="English"/g, 'aria-label="Arabic"')
    .replace(/aria-label="Spanish"/g, 'aria-label="English"')
    .replace(/<span class="matchColTitle">English<\/span>/, '<span class="matchColTitle">Arabic</span>')
    .replace(/<span class="matchColTitle">Spanish<\/span>/, '<span class="matchColTitle">English</span>')
    .replace(/aria-label="English list"/, 'aria-label="Arabic list"')
    .replace(/aria-label="Spanish list"/, 'aria-label="English list"');
  writeFileSync(path, s);
}

function patchMainJs() {
  const path = join(ROOT, "main.js");
  let s = readFileSync(path, "utf8");
  s = s.replace(
    /textEn: document\.getElementById\("textAr"\),\s*textEnBack: document\.getElementById\("textEnBack"\),/,
    'textAr: document.getElementById("textAr"),\n    textEnBack: document.getElementById("textEnBack"),'
  );
  s = s.replace(
    /function showCard\(word\) \{[\s\S]*?els\.textEnBack\.textContent = word\.ar;/,
    `function showCard(word) {
    current = word;
    els.flashcardInner.classList.remove("isFlipped");
    updateStepUi();

    if (!word) {
      els.textAr.textContent = "No cards in this deck.";
      els.textEnBack.textContent = "—";
      els.deckTag.textContent = "—";
      els.flashcardHit.disabled = true;
      return;
    }
    els.flashcardHit.disabled = false;
    els.textAr.textContent = word.ar;
    els.textEnBack.textContent =
      typeof window.primaryEnglish === "function" ? window.primaryEnglish(word.en) : word.en;`
  );
  s = s.replace(/els\.textEn\.textContent = "No cards/g, 'els.textAr.textContent = "No cards');
  s = s.replace(/els\.textEs\.textContent/g, "els.textEnBack.textContent");
  writeFileSync(path, s);
}

function patchStyleCss() {
  for (const name of ["style.css", "style-standard.css", "style-premium.css", "style-classic.css"]) {
    const path = join(ROOT, name);
    let s = readFileSync(path, "utf8");
    s = s.replace(/\.flashWordEs\b/g, ".flashWordAr");
    if (!s.includes(".flashWordAr {")) {
      s = s.replace(
        /\.flashWordAr \{[^}]*\}/,
        `.flashWordAr {
  font-family: "Noto Naskh Arabic", "Geeza Pro", "Arabic Typesetting", "Traditional Arabic", serif;
  direction: rtl;
  unicode-bidi: plaintext;
}`
      );
    } else {
      s = s.replace(
        /\.flashWordAr \{[\s\S]*?\}/,
        `.flashWordAr {
  font-family: "Noto Naskh Arabic", "Geeza Pro", "Arabic Typesetting", "Traditional Arabic", serif;
  direction: rtl;
  unicode-bidi: plaintext;
}`
      );
    }
    if (!s.includes(".matchText[dir=")) {
      s += `

.matchCol:first-child .matchText {
  direction: rtl;
  unicode-bidi: plaintext;
  font-family: "Noto Naskh Arabic", "Geeza Pro", "Arabic Typesetting", serif;
}
`;
    }
    writeFileSync(path, s);
  }
  const indexPath = join(ROOT, "index.html");
  let idx = readFileSync(indexPath, "utf8");
  if (!idx.includes("Noto Naskh Arabic")) {
    idx = idx.replace(
      "</head>",
      '    <link rel="preconnect" href="https://fonts.googleapis.com" />\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />\n    <link href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@500;700&display=swap" rel="stylesheet" />\n  </head>'
    );
    writeFileSync(indexPath, idx);
  }
}

// --- run ---
console.log("Patching project files…");
for (const f of walk(ROOT)) patchFile(f);
patchIndexHtml();
patchMatchingHtml();
buildWordbank();
patchMainJs();
patchStyleCss();

const skipTranslate = process.argv.includes("--skip-sentences");
const sentencesOnly = process.argv.includes("--sentences-only");
if (sentencesOnly) {
  await buildSentenceBank();
} else if (!skipTranslate) {
  await buildSentenceBank();
} else {
  console.log("Skipped sentence translation (--skip-sentences)");
  // Still rename es -> ar in sentence bank structure
  let sb = readFileSync(join(ROOT, "sentence-bank.js"), "utf8");
  sb = sb.replace(/\bes:/g, "ar:").replace(/Spanish/g, "Arabic");
  writeFileSync(join(ROOT, "sentence-bank.js"), sb);
}

console.log("Done.");
