/** Refreshes proof from existing artifacts without making model calls. */
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import { refreshEvaluation } from "./publish";

async function main() {
  const { values } = parseArgs({ options: { label: { type: "string" }, baseline: { type: "string" }, watch: { type: "boolean" } } });
  if (!values.label) throw new Error("Usage: npx tsx eval/snapshot.ts --label NAME [--baseline NAME] [--watch]");
  let lastReceipts: number | undefined;
  while (true) {
    const { receipts, report } = await refreshEvaluation(values.label, lastReceipts, values.baseline);
    lastReceipts = receipts;
    if (report) {
      const { evaluated, selected, attempted } = report.dataset;
      console.log(`${values.label} · ${evaluated}/${selected} measured · ${attempted.baseline} baseline, ${attempted.system} system`);
      if (evaluated === selected && report.sides.every((side) => !report.overall.sides[side].judgePending)) return;
    }
    if (!values.watch) return;
    await delay(12_000);
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
