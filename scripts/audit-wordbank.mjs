#!/usr/bin/env node
/** Report wordbank quality issues. */
import { readFileSync } from "fs";
import { join } from "path";
import vm from "vm";

const ROOT = join(import.meta.dirname, "..");
const ctx = vm.createContext({ window: {} });
vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
vm.runInContext(readFileSync(join(ROOT, "wordbank.js"), "utf8"), ctx);
const bank = ctx.window.WORD_BANK;

const hasAr = (s) => /[\u0600-\u06FF]/.test(s);
const issues = [];

for (const w of bank) {
  if (!hasAr(w.ar)) issues.push({ type: "missing_arabic", en: w.en, ar: w.ar });
  else if (w.ar.trim().toLowerCase() === w.en.trim().toLowerCase())
    issues.push({ type: "ar_equals_en", en: w.en, ar: w.ar });
  else if (/[¿¡]/.test(w.ar) && !hasAr(w.ar))
    issues.push({ type: "spanish_in_ar", en: w.en, ar: w.ar });
  else if (w.ar.startsWith("⚠"))
    issues.push({ type: "failed_translate", en: w.en, ar: w.ar });
  else if (/\b(dirty|wrong|english)\b/i.test(w.ar) && hasAr(w.ar))
    issues.push({ type: "mixed_language", en: w.en, ar: w.ar });
}

const byType = {};
for (const i of issues) (byType[i.type] = byType[i.type] || []).push(i);

console.log(`Cards in deck: ${bank.length}`);
console.log(`Issues: ${issues.length}\n`);
for (const [type, list] of Object.entries(byType)) {
  console.log(`${type}: ${list.length}`);
  list.slice(0, 5).forEach((x) => console.log(`  "${x.en}" => "${x.ar}"`));
}
process.exit(issues.length ? 1 : 0);
