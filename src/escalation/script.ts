/** Builds the exact short text the responder reads or sends to Chief speech. */
import { formatUsd } from "@/econ/format";
import { TEST_BRIEFING_PREFIX } from "./testScenario";
import type { EscalationCause } from "./types";

function phrase(value: string, words: number, characters: number): string {
  return value.trim().replace(/\s+/g, " ").split(" ").slice(0, words).join(" ")
    .slice(0, characters).trim().replace(/[.!?,;:]+$/, "");
}

export function buildEscalationScript(
  cause: EscalationCause,
  action: string,
  thresholds: { loss: number; risk: number },
): string {
  const subject = cause.assetId
    ? [phrase(cause.assetId, 2, 22), cause.assetName && phrase(cause.assetName, cause.test ? 5 : 4, 36)].filter(Boolean).join(", ")
    : "Line 3";
  const location = cause.room ? ` at ${phrase(cause.room, 4, 30)}` : "";
  const evidence = phrase(cause.title, 7, 57);
  const assessment = cause.kind === "risk"
    ? (cause.score >= thresholds.risk ? `Plant risk is ${Number(cause.score.toFixed(1))}`
      : `Plant risk rose ${Number((cause.score - cause.baseline).toFixed(1))} points`)
    : cause.kind === "simulation" ? "Simulation outcome" : "Rules engine alert";
  const loss = cause.loss === null ? "" : ` Estimated loss ${formatUsd(cause.loss)}.`;
  const introduction = cause.test ? TEST_BRIEFING_PREFIX + " " : "";
  return introduction + `Chief here. ${assessment}. ${subject}${location}. ${evidence}.${loss} ${phrase(action, 10, 68)}.`;
}
