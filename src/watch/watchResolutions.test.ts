/** Checks watch admission, the simulated drill label, and measured To-do projections. */
import { beforeEach, expect, it } from "vitest";
import { useFeedStore } from "@/crew/feedStore";
import { evaluateTwin } from "@/rules/engine";
import { buildTodos } from "@/todo/todos";
import { applyEffects } from "@/twin/effects";
import { useTwinStore } from "@/twin/store";
import type { LiveCheck } from "./liveTypes";
import { publishLiveWatchResolutions, watchResolutionId } from "./watchResolutions";

const check: LiveCheck = {
  checkedAt: 123, items: [],
  sources: [{ source: "cisa-ics", count: 0, ms: 12, cached: false }],
};

beforeEach(() => {
  useTwinStore.getState().reset();
  useFeedStore.setState({ entries: [] });
});

it("queues each available drill once and uses the simulated plant's measured risk reduction", () => {
  const baseline = useTwinStore.getState();
  publishLiveWatchResolutions(check, []);
  const current = useTwinStore.getState();
  expect(current.twin).toBe(baseline.twin);
  const id = watchResolutionId("drill:newSoftware");
  const proposal = current.mitigations.find((item) => item.id === id)!;
  expect(proposal.description).toContain("Simulated drill");
  const delta = evaluateTwin(applyEffects(current.twin, proposal.effects)).score - current.risk.score;
  expect(delta).toBeLessThan(0);
  const [first] = buildTodos(current.twin, current.mitigations, null, current.risk);
  expect(first).toMatchObject({ id, source: "watch", predicted: { riskDelta: delta } });
  expect(useFeedStore.getState().entries.map(({ crew }) => crew)).toEqual(["chief", "architect", "inspector", "scout"]);
  publishLiveWatchResolutions({ ...check, checkedAt: 456 }, []);
  expect(useTwinStore.getState().mitigations).toEqual(current.mitigations);
});

it("creates no findings or proposals when every feed failed", () => {
  publishLiveWatchResolutions({ ...check, sources: [{ ...check.sources[0], error: "Unavailable" }] }, []);
  expect(useTwinStore.getState().mitigations).toEqual([]);
  expect(useFeedStore.getState().entries).toEqual([]);
});
