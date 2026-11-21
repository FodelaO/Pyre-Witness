/** Checks the chip severity and completed-probe fraction. */
import { expect, it } from "vitest";
import { initialServices, serviceTone, summarizeHealth, type ServiceHealth } from "./services";

const checkedAt = "2026-11-21T18:00:00.000Z";

function withFailure(...ids: string[]): ServiceHealth[] {
  return initialServices.map((row) => {
    const failed = ids.includes(row.service.id);
    if (row.service.costly && !failed) return row;
    const last = { ...row.service, ok: !failed, latencyMs: 100, detail: "Test result", checkedAt };
    return { ...row, status: failed ? "failing" : "ok", last, lastAttempt: last };
  });
}

it.each(["decisions", "perception", "reasoning", "briefing"])("reserves the red chip for confirmed %s failure", (id) => {
  expect(summarizeHealth(withFailure(id, "image"))).toEqual({ status: "failing", healthy: 7, completed: 8 });
});

it.each(["speech", "live", "files_video", "feeds"])("shows an amber 7/8 for confirmed %s failure", (id) => {
  const rows = withFailure(id);
  expect(summarizeHealth(rows)).toEqual({ status: "degraded", healthy: 7, completed: 8 });
  expect(serviceTone(rows.find(({ service }) => service.id === id)!)).toBe("degraded");
});

it.each(["image", "managed_agent"])("flags confirmed %s failure without changing the cheap fraction", (id) => {
  expect(summarizeHealth(withFailure(id))).toEqual({ status: "degraded", healthy: 8, completed: 8 });
});

it("keeps a single core timeout neutral and leaves idle optional checks out of the count", () => {
  const rows = withFailure();
  expect(summarizeHealth(rows)).toEqual({ status: "ok", healthy: 8, completed: 8 });
  const core = rows.find(({ service }) => service.id === "perception")!;
  expect(summarizeHealth(rows.map((row) => row === core ? { ...row, status: "stale" } : row)))
    .toEqual({ status: "stale", healthy: 8, completed: 8 });
});
