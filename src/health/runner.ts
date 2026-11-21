/** Schedules bounded probes and retains confirmed health across inconclusive attempts. */
import { setTimeout as delay } from "node:timers/promises";
import type { HealthCheck } from "./checks";
import {
  HEALTH_REFRESH_MS, SERVICES, initialServiceHealth,
  type HealthResult, type HealthRun, type HealthSnapshot, type ServiceHealth,
} from "./services";

const CONCURRENCY = 3;
const HISTORY_LIMIT = 20;
const RETRY_MS = 750;

interface RunInProgress {
  done: Promise<HealthSnapshot>;
  all: boolean;
}

function recordAttempt(row: ServiceHealth, attempt: HealthResult): ServiceHealth {
  if (attempt.ok) {
    return { ...row, status: "ok", last: attempt, lastAttempt: attempt, lastGoodAt: attempt.checkedAt, failingSince: undefined };
  }
  const failure = attempt.failure;
  const confirmed = (failure === "http" || failure === "timeout")
    && row.lastAttempt?.failure === failure;
  return {
    ...row, status: confirmed ? "failing" : "stale",
    last: confirmed ? attempt : row.last, lastAttempt: attempt,
    failingSince: confirmed ? row.failingSince ?? attempt.checkedAt : row.failingSince,
  };
}

export function createHealthRunner(checks: readonly HealthCheck[], now = Date.now, backoff = () => delay(RETRY_MS)) {
  const rows = new Map(checks.map(({ service }) => [service.id, initialServiceHealth(service)]));
  const history: HealthRun[] = [];
  const periodic = checks.filter(({ service }) => !service.onDemand);
  const onDemand = checks.filter(({ service }) => service.onDemand);
  let lastStartedAt: number | null = null;
  let lastCompletedAt: number | null = null;
  let active: RunInProgress | undefined;

  function getHealth(): HealthSnapshot {
    return {
      checkedAt: lastCompletedAt === null ? null : new Date(lastCompletedAt).toISOString(),
      refreshing: active !== undefined,
      services: Array.from(rows.values()),
      history: history.slice(),
    };
  }

  function canStart() {
    return lastStartedAt === null || now() - lastStartedAt >= HEALTH_REFRESH_MS;
  }

  function needsRefresh(): boolean {
    return !active && canStart() && (lastCompletedAt === null || now() - lastCompletedAt >= HEALTH_REFRESH_MS);
  }

  async function attempt({ run: probe, service }: HealthCheck): Promise<HealthResult> {
    const start = now();
    try {
      return await probe();
    } catch (error) {
      // A broken check must not discard the other services' results.
      const { classifyProbeFailure, healthErrorDetail } = await import("./probe");
      return {
        ...service, ok: false, failure: classifyProbeFailure(error), latencyMs: Math.max(0, now() - start),
        checkedAt: new Date(now()).toISOString(), detail: healthErrorDetail(error),
      };
    }
  }

  async function run(check: HealthCheck) {
    const { service } = check;
    const start = now();
    let row = rows.get(service.id)!;
    if (row.nextEligibleAt && start < Date.parse(row.nextEligibleAt)) return;
    if (service.minIntervalMs) {
      row = { ...row, nextEligibleAt: new Date(start + service.minIntervalMs).toISOString() };
    }
    if (row.status === "on-demand") row = { ...row, status: "checking" };
    rows.set(service.id, row);
    const first = await attempt(check);
    row = recordAttempt(row, first);
    rows.set(service.id, row);
    if (!service.costly && row.status === "stale" && first.failure && first.failure !== "other") {
      await backoff();
      rows.set(service.id, recordAttempt(row, await attempt(check)));
    }
  }

  async function scan(selected: readonly HealthCheck[]) {
    let next = 0;
    async function worker() {
      while (next < selected.length) await run(selected[next++]);
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, selected.length) }, worker));
  }

  function refreshHealth(all = false): Promise<HealthSnapshot> {
    if (active) {
      active.all ||= all;
      return active.done;
    }
    if (!canStart()) return Promise.resolve(getHealth());
    lastStartedAt = now();
    const startedAt = new Date(lastStartedAt).toISOString();
    const pass: RunInProgress = {
      all,
      done: Promise.resolve().then(async () => {
        try {
          await scan(periodic);
          if (pass.all) await scan(onDemand);
          lastCompletedAt = now();
          history.push({ startedAt, checkedAt: new Date(lastCompletedAt).toISOString(),
            all: pass.all, services: Array.from(rows.values()) });
          if (history.length > HISTORY_LIMIT) history.shift();
        } finally {
          active = undefined;
        }
        return getHealth();
      }),
    };
    active = pass;
    return pass.done;
  }

  return { getHealth, needsRefresh, refreshHealth };
}

// The cache can answer a cold GET before loading the Gemini SDK and probe implementations.
const checks: HealthCheck[] = SERVICES.map((service, index) => ({
  service,
  run: async () => (await import("./checks")).HEALTH_CHECKS[index].run(),
}));
const shared = globalThis as typeof globalThis & { pyreWitnessHealthV3?: ReturnType<typeof createHealthRunner> };
export const { getHealth, needsRefresh, refreshHealth } = shared.pyreWitnessHealthV3 ??= createHealthRunner(checks);
