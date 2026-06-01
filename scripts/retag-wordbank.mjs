#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import vm from "vm";
import { classifyEnTag } from "./en-to-tag.mjs";

const ROOT = join(import.meta.dirname, "..");
const WB = join(ROOT, "wordbank.js");

function escJs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

const ctx = vm.createContext({ window: {} });
vm.runInContext(readFileSync(join(ROOT, "english-display.js"), "utf8"), ctx);
vm.runInContext(readFileSync(WB, "utf8"), ctx);
const bank = ctx.window.WORD_BANK.map((w) => ({
  ...w,
  tag: classifyEnTag(w.en),
}));
bank.sort((a, b) => a.en.localeCompare(b.en));

const lines = readFileSync(WB, "utf8").split("\n");
const start = lines.findIndex((l) => l.includes("window.WORD_BANK = ["));
const end = lines.findIndex((l, i) => i > start && l.trim() === "];");
const head = lines.slice(0, start + 1);
const tail = lines.slice(end);
const body = bank.map(
  (w) => `    { ar: "${escJs(w.ar)}", en: "${escJs(w.en)}", tag: "${escJs(w.tag)}" },`
);
writeFileSync(WB, [...head, ...body, ...tail].join("\n"));
console.log(`Retagged ${bank.length} cards`);
