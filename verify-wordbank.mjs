#!/usr/bin/env node
/**
 * Validates WORD_BANK and SENTENCE_BANK integrity.
 * Run: node verify-wordbank.mjs
 */
import fs from "fs";
import vm from "vm";

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("english-display.js", import.meta.url), "utf8"), ctx);
vm.runInContext(fs.readFileSync(new URL("wordbank.js", import.meta.url), "utf8"), ctx);
vm.runInContext(fs.readFileSync(new URL("sentence-bank.js", import.meta.url), "utf8"), ctx);

const bank = ctx.window.WORD_BANK || [];
const sentences = ctx.window.SENTENCE_BANK || [];
const primaryEnglish = ctx.window.primaryEnglish;

let failed = false;
const fail = (msg) => {
  console.error(msg);
  failed = true;
};

for (let i = 0; i < bank.length; i++) {
  const w = bank[i];
  const ar = String(w?.ar ?? "").trim();
  const en = String(w?.en ?? "").trim();
  const tag = String(w?.tag ?? "").trim();
  if (!ar || !en) fail(`Word #${i}: missing ar/en (${JSON.stringify(w)})`);
  if (!tag) fail(`Word #${i}: missing tag for "${ar}"`);
  if (!primaryEnglish(en)) fail(`Word #${i}: blank display English for "${ar}"`);
}

const arSeen = new Set();
for (const w of bank) {
  const k = String(w.ar).trim().toLowerCase();
  if (arSeen.has(k)) fail(`Duplicate Arabic after bank dedup: "${w.ar}"`);
  arSeen.add(k);
}

const enToAr = new Map();
for (const w of bank) {
  const enk = String(w.en).trim().toLowerCase();
  const ark = String(w.ar).trim().toLowerCase();
  if (enToAr.has(enk) && enToAr.get(enk) !== ark) {
    const plain = String(w.en).trim();
    if (!plain.includes("(") && !plain.includes("/")) {
      fail(`Ambiguous English "${w.en}" maps to "${enToAr.get(enk)}" and "${ark}" — add (hint) in wordbank.js`);
    }
  } else {
    enToAr.set(enk, ark);
  }
}

for (let i = 0; i < sentences.length; i++) {
  const s = sentences[i];
  if (!String(s?.ar ?? "").trim() || !String(s?.en ?? "").trim()) {
    fail(`Sentence #${i}: missing ar/en`);
  }
}

if (failed) process.exit(1);
console.log(`OK: ${bank.length} words, ${sentences.length} sentences — structure and disambiguation checks passed.`);
