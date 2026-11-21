/** Maps the crew's assigned engines to their service health readings. */
import { CREW, type CrewId } from "@/crew/types";
import { serviceTone, type ServiceHealth } from "./services";

const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function crewEngineHealth(id: CrewId, services: readonly ServiceHealth[]) {
  const { engine, isModel } = CREW[id];
  if (!isModel) return { tone: "local", label: "local · deterministic" } as const;

  const row = services.find(({ service }) => service.model === engine);
  const checkedAt = Date.parse(row?.lastAttempt?.checkedAt ?? row?.last?.checkedAt ?? "");
  const checked = Number.isFinite(checkedAt) ? ` · checked ${clock.format(checkedAt)}` : "";
  return {
    tone: row ? serviceTone(row) : "checking",
    label: `${engine} · ${row?.status ?? "checking"}${checked}`,
  };
}
