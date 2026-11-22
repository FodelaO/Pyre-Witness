/** Reads the closing comparison from the same held-out artifact used by Proof. */
import { pointAt, target } from "./tourDom";
import type { TourStep } from "./tourMachine";

const proof = target('a[href="/proof"][aria-label="Proof"]');
const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 0 });

export const proofStep: TourStep = {
  title: "Held-out proof vs one call",
  initial: { text: "Read the held-out comparison.", target: proof },
  timeoutMs: 9000,
  timeoutReason: "The held-out results did not load.",
  async run(context) {
    const { default: result } = await import("../../eval/heldout/results.json");
    const compare = (key: string) => {
      const metric = result.metrics.find((entry) => entry.key === key);
      if (metric?.system?.value == null || metric.baseline?.value == null) {
        throw new Error("The held-out comparison is incomplete.");
      }
      return `${percent.format(metric.system.value)} vs ${percent.format(metric.baseline.value)}`;
    };

    await pointAt(context, proof, `Key-risk recall ${compare("riskRecall")} · Device naming ${compare("deviceTypeMatch")}.`);
  },
};
