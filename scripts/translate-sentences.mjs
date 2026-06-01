#!/usr/bin/env node
/** Translate sentence-bank English prompts to Arabic (ar field). */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");
const path = join(ROOT, "sentence-bank.js");

function esc(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
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

const src = readFileSync(path, "utf8");
const entries = [...src.matchAll(/\{\s*en:\s*"((?:\\.|[^"\\])*)"\s*,\s*ar:\s*"((?:\\.|[^"\\])*)"\s*,\s*tag:\s*"([^"]*)"\s*\}/g)].map((m) => ({
  en: m[1].replace(/\\"/g, '"'),
  ar: m[2].replace(/\\"/g, '"'),
  tag: m[3],
}));

console.log(`Found ${entries.length} sentences. Translating…`);

const out = [];
for (let i = 0; i < entries.length; i++) {
  const { en, tag } = entries[i];
  let ar = entries[i].ar;
  try {
    ar = await translateEnToAr(en);
    await new Promise((r) => setTimeout(r, 320));
  } catch (e) {
    console.warn(`[${i + 1}/${entries.length}] failed:`, en.slice(0, 50), e.message);
  }
  out.push({ en, ar, tag });
  if ((i + 1) % 20 === 0) console.log(`  ${i + 1}/${entries.length}`);
}

const lines = [
  "/* global window */",
  "(() => {",
  '  "use strict";',
  "",
  "  /** Full-sentence pairs for structure practice (Arabic ↔ English). */",
  "  window.SENTENCE_BANK = [",
];
for (const row of out) {
  lines.push(`    { en: "${esc(row.en)}", ar: "${esc(row.ar)}", tag: "${esc(row.tag)}" },`);
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
writeFileSync(path, lines.join("\n"));
console.log("Wrote", path);
