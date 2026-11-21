/** Runs the live health checks once or on a repeating interval. */
import { appendFile, mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import { healthErrorDetail } from "../src/health/probe";
import { refreshHealth } from "../src/health/runner";

async function main() {
  const { values } = parseArgs({ options: { all: { type: "boolean" }, watch: { type: "string" } } });
  const seconds = values.watch === undefined ? undefined : Number(values.watch);
  if (seconds !== undefined && (!Number.isInteger(seconds) || seconds < 1 || seconds > 2_147_483)) {
    throw new Error("Use --watch with a positive interval in seconds.");
  }
  if (seconds !== undefined) await mkdir(".agents", { recursive: true });
  let all = values.all === true;
  for (;;) {
    const start = Date.now();
    const { services, history, checkedAt } = await refreshHealth(all);
    all = false;
    console.log(`Pyre Witness health · ${checkedAt}`);
    console.table(services.map(({ service, last, skipped }) => {
      const cadence = skipped === "on-demand" ? "On demand only." : skipped === "cooldown" ? "Costly check is on cooldown." : "";
      return {
        service: service.label,
        model: service.model,
        ok: skipped ? `skipped${last ? ` (last ${last.ok ? "ok" : "failed"})` : ""}` : last?.ok ?? "unknown",
        latency: last ? `${last.latencyMs} ms` : "—",
        detail: [cadence, last?.detail].filter(Boolean).join(" ") || "Never checked.",
      };
    }));
    if (services.some(({ service, last }) => !service.costly && last?.ok === false)) process.exitCode = 1;
    if (seconds === undefined) return;
    await appendFile(".agents/health.log", `${JSON.stringify(history.at(-1))}\n`, "utf8");
    await delay(Math.max(0, seconds * 1_000 - (Date.now() - start)));
  }
}

main().catch((error: unknown) => {
  console.error(healthErrorDetail(error));
  process.exitCode = 1;
});
