// One-command re-cut: record (one browser session on the live app) -> assemble -> contact sheet.
//   node demo/make.mjs                  re-record the cheap shots, reuse the real capture, re-assemble
//   node demo/make.mjs --with-capture   also redo the ONE real Gemini capture (+ transcript shot)
//   node demo/make.mjs --only lens      re-record just these shots, then re-assemble
//   node demo/make.mjs --no-record      re-assemble from existing recordings
import { assemble, printTimeline } from "./assemble.mjs";
import { contactSheet } from "./contact-sheet.mjs";
import { parseArgs, record } from "./record.mjs";

const args = parseArgs(process.argv.slice(2));
if (!args.noRecord) await record(args);
const cut = await assemble();
const sheet = await contactSheet(cut.file);

console.log("\n=== Pyre Witness demo cut ===");
console.log(`output:        ${cut.file}`);
console.log(`duration:      ${cut.duration.toFixed(3)} s (limit 60.0 s)`);
console.log(`contact sheet: ${sheet}`);
printTimeline(cut);
console.log(`skipped shots: ${cut.skipped.length ? cut.skipped.map((s) => `${s.id} (${s.reason})`).join("; ") : "none"}`);
