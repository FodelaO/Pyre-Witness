// One-command re-cut: record every shot from the running app -> assemble -> contact sheet.
//   node demo/make.mjs                  full re-cut
//   node demo/make.mjs --only risk      re-record one shot, then re-assemble
//   node demo/make.mjs --no-record      re-assemble from existing recordings
import { assemble } from "./assemble.mjs";
import { contactSheet } from "./contact-sheet.mjs";
import { record } from "./record.mjs";
import { PENDING } from "./shots/index.mjs";

const args = process.argv.slice(2);
const only = [];
args.forEach((a, i) => { if (a === "--only" && args[i + 1]) only.push(...args[i + 1].split(",")); });

if (!args.includes("--no-record")) await record({ only });
const cut = await assemble();
const sheet = await contactSheet(cut.file);

console.log("\n=== Pyre Witness demo cut ===");
console.log(`output:        ${cut.file}`);
console.log(`duration:      ${cut.duration.toFixed(2)} s (limit 60.0 s)`);
console.log(`contact sheet: ${sheet}`);
for (const t of cut.timeline) console.log(`  ${t.start.toFixed(2).padStart(6)}-${t.end.toFixed(2).padStart(6)}  ${t.label.padEnd(10)} ${t.caption}`);
console.log(`skipped shots: ${cut.skipped.length ? cut.skipped.map((s) => `${s.id} (${s.reason})`).join("; ") : "none"}`);
console.log(`pending shots: ${PENDING.map((p) => p.id).join(", ")}`);
