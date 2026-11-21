/** Covers crew assignments, confirmed failures, and local rules engine health. */
import { expect, it } from "vitest";
import { MODEL_IDS } from "@/gemini/models";
import { crewEngineHealth } from "./crewHealth";
import { initialServices } from "./services";

it.each([
  ["scout", MODEL_IDS.perception],
  ["architect", MODEL_IDS.reasoning],
  ["chief", MODEL_IDS.chief],
] as const)("matches %s to the assigned model independently of row order", (id, model) => {
  const services = [...initialServices].reverse().map((row) =>
    row.service.model === model ? { ...row, status: "ok" as const } : row);
  expect(crewEngineHealth(id, services)).toEqual({ tone: "ok", label: `${model} · ok` });
});

it("keeps missing model evidence neutral and the Inspector local", () => {
  expect(crewEngineHealth("scout", [])).toEqual({
    tone: "checking", label: `${MODEL_IDS.perception} · checking`,
  });
  expect(crewEngineHealth("inspector", [])).toEqual({ tone: "local", label: "local · deterministic" });
});

it.each(["stale", "failing"] as const)("keeps the %s state and timestamps the latest service attempt", (status) => {
  const row = initialServices.find(({ service }) => service.id === "reasoning")!;
  const lastAttempt = {
    ...row.service, ok: false, failure: "timeout" as const, latencyMs: 8000,
    detail: "Test fixture", checkedAt: "2026-11-21T18:21:00.000Z",
  };
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(Date.parse(lastAttempt.checkedAt));
  expect(crewEngineHealth("architect", [{ ...row, status, lastAttempt }])).toEqual({
    tone: status, label: `${MODEL_IDS.reasoning} · ${status} · checked ${time}`,
  });
});
