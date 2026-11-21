/** Exercises the real bus subscription, shared feed and event-backed movement lifecycle. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MODEL_IDS } from "@/gemini/models";
import { useRunStore } from "@/pipeline/runStore";
import type { PipelineEvent } from "@/pipeline/types";
import { areaById, distance } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import { connectCrew, startPatrolVisit, useCrewStore } from "./crewStore";
import { useFeedStore } from "./feedStore";
import { deskPosition } from "./officeLayout";
import { observePatrol } from "./patrol";
import { CREW_ORDER } from "./types";
import { BADGE_SEPARATION } from "./walk";

let disconnect: () => void;
const tab = Object.assign(new EventTarget(), { hidden: false });
const preference = Object.assign(new EventTarget(), { matches: false });
const scout = () => useCrewStore.getState().avatars.scout;
const feed = () => useFeedStore.getState().entries;
const ingest = (event: PipelineEvent) => useRunStore.getState().ingest(event);
const run = { runId: "crew-bus-test", at: 10_000 };
const start = (): PipelineEvent => ({ ...run, type: "run.started", input: { kind: "text", label: "Gauge" }, dropPoint: null });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance", "Date"] });
  tab.hidden = false;
  preference.matches = false;
  vi.stubGlobal("document", tab);
  vi.stubGlobal("window", {
    setTimeout, clearTimeout,
    requestAnimationFrame: (callback: FrameRequestCallback) => setTimeout(() => callback(performance.now()), 16),
    cancelAnimationFrame: clearTimeout,
    matchMedia: () => preference,
  });
  useFeedStore.setState({ entries: [] });
  disconnect = connectCrew();
});

afterEach(() => {
  useRunStore.getState().reset();
  disconnect();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("crew bus connection", () => {
  it("logs each live step once and interrupts a running patrol for capture and then for an error", () => {
    const unmountFeed = connectCrew();
    try {
      const visit = observePatrol(SEED_TWIN, "scout", 0, 1)!;
      expect(startPatrolVisit(visit)).toBe(true);
      expect(scout().speech).toEqual({ kind: "patrol", text: visit.activity.text });
      expect(scout().walking).toBe(true);
      vi.advanceTimersByTime(320);
      ingest(start());
      expect(scout().speech).toBeNull();
      expect(scout().walking).toBe(false);
      expect(startPatrolVisit(visit)).toBe(false);
      ingest({ ...run, type: "gate.done", model: MODEL_IDS.decisions, latencyMs: 70, gate: {
        proceed: true, reason: null, answers: { is_device: { type: "noul", value: 0.97, confidence: 0.91 } },
      } });
      ingest({ ...run, type: "perception.started", model: MODEL_IDS.perception });
      expect(scout().speech?.text).toBe("Device? 0.97 · Gate passed");
      vi.advanceTimersByTime(850);
      expect(scout().speech?.text).toBe("Reading the label…");
      expect(scout().walking).toBe(true);
      ingest({ ...run, type: "run.error", stage: "perception", message: "Label unreadable" });
      expect(scout()).toMatchObject({ walking: false, status: "error", speech: { text: "Label unreadable" } });
      vi.advanceTimersByTime(4000);
      expect(scout().status).toBe("error");
      expect(feed().map(({ text }) => text)).toEqual([
        "Label unreadable", "Reading the label…", "Device? 0.97 · Gate passed", "Analysis started", visit.activity.text,
      ]);
    } finally {
      unmountFeed();
    }
  });

  it("shows Chief's real briefing before returning everyone to a separate desk", () => {
    ingest(start());
    ingest({ ...run, type: "perception.started", model: MODEL_IDS.perception });
    ingest({ ...run, type: "summary.done", model: MODEL_IDS.chief, latencyMs: 510, text: "Use the operator panel." });
    ingest({ ...run, type: "run.completed", totalMs: 4800 });
    for (let index = 0; index < 65; index += 1) {
      vi.advanceTimersByTime(160);
      const positions = Object.values(useCrewStore.getState().avatars).map(({ point }) => point);
      for (const [index, point] of positions.entries()) {
        for (const neighbor of positions.slice(index + 1)) expect(distance(point, neighbor)).toBeGreaterThanOrEqual(BADGE_SEPARATION - 1e-5);
      }
      if (index === 20) {
        expect(useCrewStore.getState().avatars.chief.speech).toEqual({ kind: "briefing", text: "Use the operator panel." });
      }
    }
    const { avatars, phase } = useCrewStore.getState();
    expect(phase).toBe("idle");
    for (const crew of CREW_ORDER) {
      expect(avatars[crew]).toMatchObject({ point: deskPosition(crew, SEED_TWIN.plant.building, areaById(SEED_TWIN, "crew_office")),
        walking: false, speech: null });
    }
    expect(feed()).toHaveLength(4);
  });

  it("teleports in reduced motion and rejects patrol while the tab is hidden", () => {
    const visit = observePatrol(SEED_TWIN, "scout", 0, 1)!;
    tab.hidden = true;
    expect(startPatrolVisit(visit)).toBe(false);
    expect(feed()).toHaveLength(0);
    tab.hidden = false;
    preference.matches = true;
    expect(startPatrolVisit(visit)).toBe(true);
    expect(scout()).toMatchObject({ walking: false, speech: { kind: "patrol" }, inspect: visit.inspect });
    ingest(start());
    ingest({ ...run, type: "perception.started", model: MODEL_IDS.perception });
    expect(scout()).toMatchObject({ walking: false, point: { x: 700, y: 640 } });
  });

  it("reads the current twin telemetry for each observation", () => {
    const initial = observePatrol(SEED_TWIN, "scout", 0, 1)!;
    expect(initial.activity.text).toBe("LT-301 60 % · in band");
    const twin = {
      ...SEED_TWIN,
      assets: SEED_TWIN.assets.map((asset) => asset.process?.telemetry ? {
        ...asset,
        process: { ...asset.process, telemetry: asset.process.telemetry.map((point) =>
          point.tag === "LT-301" ? { ...point, value: 92 } : point) },
      } : asset),
    };
    expect(observePatrol(twin, "scout", 0, 2)?.activity).toMatchObject({
      kind: "patrol", at: 2, text: "LT-301 92 %",
    });
  });
});
