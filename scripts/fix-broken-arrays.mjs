import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const WB = join(import.meta.dirname, "..", "wordbank.js");
let s = readFileSync(WB, "utf8");
// ["ملعقة, "spoon", "home"] → missing closing quote after Arabic
const broken = /\[\s*"([^",\[\]]+),\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\]/g;
const n = (s.match(broken) || []).length;
s = s.replace(broken, '["$1", "$2", "$3"]');
writeFileSync(WB, s);
console.log(`Repaired ${n} broken bulk entries`);
