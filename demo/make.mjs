// Refreshes current-build footage and publishes the verified cut and review artifacts.
import { assemble, printTimeline } from "./assemble.mjs";
import { DRY_CAPTURE } from "./lib/app.mjs";
import { parseArgs, record } from "./record.mjs";

try {
  const args = parseArgs(process.argv.slice(2));
  if (!args.noRecord) await record(args);
  if (!DRY_CAPTURE) {
    const cut = await assemble();
    console.log(`output ${cut.file}`);
    console.log(`duration ${cut.duration.toFixed(6)} s`);
    console.log(`review ${cut.sheet}`);
    printTimeline(cut);
  }
} catch (error) {
  console.error(`demo render failed: ${error.message.split("\n")[0]}`);
  process.exitCode = 1;
}
