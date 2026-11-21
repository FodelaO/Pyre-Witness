/** Covers Inspector feed integration on replay and repeated monitor ticks. */
import { afterEach, expect, it } from "vitest";
import { useFeedStore } from "@/crew/feedStore";
import { useTwinStore } from "@/twin/store";
import { useSimStore } from "./simStore";

afterEach(() => {
  useSimStore.getState().reset();
  useTwinStore.getState().reset();
  useFeedStore.setState({ entries: [] });
});

it("publishes each newly observed simulated alarm to Inspector's feed", () => {
  const { start, advance, tickPlant } = useSimStore.getState();
  start("ammonia");
  advance(8);
  const entries = useFeedStore.getState().entries;
  expect(entries).toEqual(expect.arrayContaining([
    expect.objectContaining({ crew: "inspector", engine: "rules engine", kind: "sim",
      text: expect.stringMatching(/^Simulated plant · GT-401 detector high/), runId: expect.stringMatching(/^sim-\d+$/) }),
    expect.objectContaining({ kind: "sim", text: "Simulated incident · Machinery-room release reported" }),
  ]));
  tickPlant();
  tickPlant();
  expect(useFeedStore.getState().entries.filter(({ text }) => text.includes("GT-401 detector high"))).toHaveLength(1);
});
