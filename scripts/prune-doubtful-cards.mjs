#!/usr/bin/env node
/** Remove multi-sense and other doubtful cards from wordbank.js */
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import vm from "vm";
import { MANUAL_EN } from "./verified-overrides.mjs";

const ROOT = join(import.meta.dirname, "..");
const WB = join(ROOT, "wordbank.js");

function escJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const ctx = vm.createContext({ window: {} });
vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
vm.runInContext(readFileSync(WB, "utf8"), ctx);
const bank = ctx.window.WORD_BANK;

const isManual = (en) => Boolean(MANUAL_EN[en] || MANUAL_EN[en.split(/[/(]/)[0].trim()]);

const kept = bank.filter((w) => {
  if (w.en.includes("/") && !isManual(w.en)) return false;
  if (w.en.includes("(") && !isManual(w.en)) return false;
  return true;
});

const lines = readFileSync(WB, "utf8").split("\n");
const start = lines.findIndex((l) => l.includes("window.WORD_BANK = ["));
const end = lines.findIndex((l, i) => i > start && l.trim() === "];");
const head = lines.slice(0, start + 1);
const tail = lines.slice(end);
const body = kept.map(
  (w) => `    { ar: "${escJs(w.ar)}", en: "${escJs(w.en)}", tag: "${escJs(w.tag)}" },`
);
writeFileSync(WB, [...head, ...body, ...tail].join("\n"));

const ctx2 = vm.createContext({ window: {} });
vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx2);
vm.runInContext(readFileSync(WB, "utf8"), ctx2);
console.log(`Pruned ${bank.length - ctx2.window.WORD_BANK.length} doubtful cards`);
console.log(`Deck: ${ctx2.window.WORD_BANK.length} words`);
