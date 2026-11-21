/** Runs the live health checks once or on a repeating interval. */
import { appendFile, mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { parseArgs } from "node:util";
import { healthErrorDetail } from "../src/health/probe";
import { refreshHealth } from "../src/health/runner";
import { HEALTH_REFRESH_MS } from "../src/health/services";

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
    console.table(services.map(({ service, status, lastAttempt, lastGoodAt }) => ({
      service: service.label,
      model: service.model,
      ok: status === "ok" ? true : status === "failing" ? false : status,
      latency: lastAttempt ? `${lastAttempt.latencyMs} ms` : "—",
      detail: [lastAttempt?.detail, status === "stale" && lastGoodAt ? `Last OK ${lastGoodAt}.` : null].filter(Boolean).join(" "),
    })));
    if (services.some(({ service, status }) => !service.costly && status === "failing")) process.exitCode = 1;
    if (seconds === undefined) return;
    await appendFile(".agents/health.log", `${JSON.stringify(history.at(-1))}\n`, "utf8");
    await delay(Math.max(0, Math.max(HEALTH_REFRESH_MS, seconds * 1_000) - (Date.now() - start)));
  }
}

main().catch((error: unknown) => {
  console.error(healthErrorDetail(error));
  process.exitCode = 1;
});
