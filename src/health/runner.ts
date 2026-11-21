/** Keeps a process-local snapshot, single-flight refreshes, and bounded check history. */
import { HEALTH_CHECKS, type HealthCheck } from "./checks";
import { healthErrorDetail } from "./probe";
import type { HealthResult, HealthRun, HealthSnapshot, ServiceHealth } from "./services";

const STALE_MS = 60_000;
const HISTORY_LIMIT = 20;

interface RunInProgress {
  done: Promise<HealthSnapshot>;
  onDemand?: Promise<void[]>;
}

export function createHealthRunner(checks: readonly HealthCheck[], now = Date.now) {
  const results = new Map<string, HealthResult>();
  const eligibleAt = new Map<string, number>();
  const skipped = new Map<string, NonNullable<ServiceHealth["skipped"]>>();
  const history: HealthRun[] = [];
  const periodic = checks.filter(({ service }) => !service.onDemand);
  const onDemand = checks.filter(({ service }) => service.onDemand);
  let lastCompletedAt: number | null = null;
  let active: RunInProgress | undefined;

  function services(): ServiceHealth[] {
    return checks.map(({ service }) => {
      const last = results.get(service.id) ?? null;
      const skip = skipped.get(service.id) ?? null;
      const next = eligibleAt.get(service.id);
      return {
        service, last, skipped: skip,
        status: skip ? "skipped" : last === null ? "unknown" : last.ok ? "ok" : "failing",
        nextEligibleAt: next === undefined ? null : new Date(next).toISOString(),
      };
    });
  }

  function getHealth(): HealthSnapshot {
    return {
      checkedAt: lastCompletedAt === null ? null : new Date(lastCompletedAt).toISOString(),
      refreshing: active !== undefined,
      services: services(),
      history: history.slice(),
    };
  }

  function needsRefresh(): boolean {
    return !active && (lastCompletedAt === null || now() - lastCompletedAt >= STALE_MS);
  }

  async function run({ run: probe, service }: HealthCheck) {
    const start = now();
    if (start < (eligibleAt.get(service.id) ?? -Infinity)) {
      skipped.set(service.id, "cooldown");
      return;
    }
    if (service.minIntervalMs) eligibleAt.set(service.id, start + service.minIntervalMs);
    skipped.delete(service.id);
    try {
      results.set(service.id, await probe());
    } catch (error) {
      // A broken check must not discard the other services' results.
      results.set(service.id, {
        ...service, ok: false, latencyMs: Math.max(0, now() - start),
        checkedAt: new Date(now()).toISOString(), detail: healthErrorDetail(error),
      });
    }
  }

  function refreshHealth(all = false): Promise<HealthSnapshot> {
    if (!active) {
      const startedAt = new Date(now()).toISOString();
      const runInProgress: RunInProgress = {
        done: Promise.resolve().then(async () => {
          if (!runInProgress.onDemand) {
            for (const { service } of onDemand) skipped.set(service.id, "on-demand");
          }
          await Promise.all(periodic.map(run));
          if (runInProgress.onDemand) await runInProgress.onDemand;
          lastCompletedAt = now();
          history.push({ startedAt, checkedAt: new Date(lastCompletedAt).toISOString(),
            all: !!runInProgress.onDemand, services: services() });
          if (history.length > HISTORY_LIMIT) history.shift();
          active = undefined;
          return getHealth();
        }),
      };
      active = runInProgress;
    }
    // An explicit all request can extend a periodic pass already in flight.
    if (all && !active.onDemand) active.onDemand = Promise.all(onDemand.map(run));
    return active.done;
  }

  return { getHealth, needsRefresh, refreshHealth };
}

const shared = globalThis as typeof globalThis & { pyreWitnessHealth?: ReturnType<typeof createHealthRunner> };
export const { getHealth, needsRefresh, refreshHealth } = shared.pyreWitnessHealth ??= createHealthRunner(HEALTH_CHECKS);
