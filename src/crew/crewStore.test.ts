/** Exercises the real bus subscription, shared feed and event-backed movement lifecycle. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MODEL_IDS } from "@/gemini/models";
import { useRunStore } from "@/pipeline/runStore";
import type { Assessment, PipelineEvent } from "@/pipeline/types";
import { DEFAULT_DROP } from "@/twin/dropPoint";
import { areaById, distance } from "@/twin/geometry";
import { SEED_TWIN } from "@/twin/seed";
import type { AttackPath } from "@/twin/types";
import { connectCrew, crewAvatar, crewLive, crewPosition, startPatrolVisit, useCrewStore } from "./crewStore";
import { useFeedStore } from "./feedStore";
import { deskPosition } from "./officeLayout";
import { observePatrol } from "./patrol";
import { CREW_ORDER } from "./types";
import { BADGE_SEPARATION } from "./walk";

let disconnect: () => void;
const tab = Object.assign(new EventTarget(), { hidden: false });
const preference = Object.assign(new EventTarget(), { matches: false });
const scout = () => crewAvatar("scout");
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
  it("defaults missing members to their desk and accepts new cues after a partial state restore", () => {
    preference.matches = true;
    useCrewStore.setState({ avatars: {}, live: {} });
    const chiefDesk = deskPosition("chief", SEED_TWIN.plant.building, areaById(SEED_TWIN, "crew_office"));
    expect(crewPosition("chief")).toEqual(chiefDesk);
    expect(crewLive("chief")).toMatchObject({ status: "idle", message: "At desk" });
    expect(() => useCrewStore.getState().dismissBriefing()).not.toThrow();
    ingest(start());
    useCrewStore.setState(({ avatars }) => ({ avatars: { ...avatars, scout: undefined } }));
    ingest({ ...run, type: "perception.started", model: MODEL_IDS.perception });
    expect(scout()).toMatchObject({ walking: false, speech: { text: "Reading the device description…" } });
  });

  it("uses the attention cue and feed row when the unavailable gate allows a continuing capture", () => {
    ingest(start());
    ingest({ ...run, at: 10_100, type: "perception.started", model: MODEL_IDS.perception });
    ingest({ ...run, at: 10_200, type: "gate.done", model: MODEL_IDS.decisions, latencyMs: 90,
      gate: { proceed: true, reason: "Gate unavailable: continued without it", answers: {} } });
    const warning = "Gate unavailable: continued";
    expect(scout()).toMatchObject({ walking: true, speech: { text: warning, attention: true }, speechStartedAt: null, speechLatencyMs: 90 });
    expect(crewLive("scout")).toMatchObject({ status: "working", message: warning, attention: true, startedAt: 10_100 });
    expect(feed()[0]).toMatchObject({ text: warning, attention: true });
  });

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
      expect(scout().speech?.text).toBe("Reading the device description…");
      expect(scout().walking).toBe(true);
      ingest({ ...run, type: "run.error", stage: "perception", message: "Label unreadable" });
      expect(scout()).toMatchObject({ walking: false, status: "error", speech: { text: "Label unreadable" } });
      vi.advanceTimersByTime(4000);
      expect(scout().status).toBe("error");
      expect(feed().map(({ text }) => text)).toEqual([
        "Label unreadable", "Reading the device description…", "Device? 0.97 · Gate passed", "Analysis started", visit.activity.text,
      ]);
    } finally {
      unmountFeed();
    }
  });

  it("keeps Chief’s real briefing pinned until dismissal and then returns it to its desk", () => {
    ingest(start());
    ingest({ ...run, type: "perception.started", model: MODEL_IDS.perception });
    vi.advanceTimersByTime(400);
    ingest({ ...run, type: "summary.started", model: MODEL_IDS.chief });
    expect(useCrewStore.getState().avatars.chief).toMatchObject({
      walking: true, speech: { kind: "step", text: "Writing the briefing…" },
    });
    ingest({ ...run, type: "summary.done", model: MODEL_IDS.chief, latencyMs: 510, text: "Use the operator panel." });
    expect(crewAvatar("chief").speech?.text).toBe("Briefing ready");
    ingest({ ...run, type: "run.completed", totalMs: 4800 });
    for (let index = 0; index < 65; index += 1) {
      vi.advanceTimersByTime(160);
      const positions = Object.values(useCrewStore.getState().avatars).map(({ point }) => point);
      for (const [index, point] of positions.entries()) {
        for (const neighbor of positions.slice(index + 1)) expect(distance(point, neighbor)).toBeGreaterThanOrEqual(BADGE_SEPARATION - 1e-5);
      }
      if (index === 20) {
        expect(crewAvatar("chief").speech).toEqual({ kind: "briefing", text: "Use the operator panel." });
      }
    }
    const { avatars, phase } = useCrewStore.getState();
    expect(phase).toBe("idle");
    const home = (crew: (typeof CREW_ORDER)[number]) => deskPosition(crew, SEED_TWIN.plant.building, areaById(SEED_TWIN, "crew_office"));
    for (const crew of CREW_ORDER.filter((id) => id !== "chief")) {
      expect(avatars[crew]).toMatchObject({ point: home(crew), walking: false, speech: null });
    }
    expect(avatars.chief?.speech).toEqual({ kind: "briefing", text: "Use the operator panel." });
    useCrewStore.getState().dismissBriefing();
    vi.advanceTimersByTime(3500);
    expect(useCrewStore.getState().avatars.chief).toMatchObject({ point: home("chief"), walking: false, speech: null });
    expect(feed()).toHaveLength(5);
  });

  it("keeps Chief at the results edge when the briefing arrives after analysis completes", () => {
    ingest(start());
    ingest({ ...run, type: "summary.started", model: MODEL_IDS.chief });
    ingest({ ...run, type: "run.completed", totalMs: 1100 });
    vi.advanceTimersByTime(15_000);
    expect(crewAvatar("chief")).toMatchObject({ walking: false, speech: { text: "Writing the briefing…" } });
    expect(crewLive("chief").status).toBe("working");
    const point = crewPosition("chief");
    ingest({ ...run, type: "summary.done", model: MODEL_IDS.chief, latencyMs: 12_000, text: "Use the utility header." });
    expect(crewAvatar("chief")).toMatchObject({ point, speech: { kind: "briefing", text: "Use the utility header." } });
    expect(feed()).toContainEqual(expect.objectContaining({ eventType: "summary.done", text: "Use the utility header." }));
  });

  it("pins a late briefing even while Inspector's room visit is still queued", () => {
    ingest(start());
    ingest({ ...run, type: "selfcheck.started", phase: "recommendation", engine: "rules engine" });
    ingest({ ...run, type: "selfcheck.done", phase: "recommendation", latencyMs: 4,
      result: { passed: true, findings: [], paths: [], disagreements: [], revised: false } });
    ingest({ ...run, type: "summary.started", model: MODEL_IDS.chief });
    ingest({ ...run, type: "run.completed", totalMs: 20 });
    expect(crewLive("chief").message).toBe("Writing the briefing…");
    expect(crewAvatar("inspector").walking).toBe(true);
    ingest({ ...run, type: "summary.done", model: MODEL_IDS.chief, latencyMs: 20, text: "Install in utilities." });
    expect(crewAvatar("chief").speech).toEqual({ kind: "briefing", text: "Install in utilities." });
  });

  it("keeps Scout at the desk during reassessment and moves the checking crew", () => {
    const initial = useCrewStore.getState().avatars;
    const dropPoint = { x: 546, y: 234, area: "syrup_room" } as const;
    ingest({ ...run, type: "run.started", mode: "reassess", dropPoint, input: { kind: "text", label: "Reassess" } });
    ingest({ ...run, type: "reasoning.started", model: MODEL_IDS.reasoning, candidateArea: dropPoint.area });
    ingest({ ...run, type: "selfcheck.started", engine: "rules engine" });
    vi.advanceTimersByTime(5500);
    const { avatars } = useCrewStore.getState();
    expect(avatars.scout).toEqual(initial.scout);
    expect(avatars.architect?.point).not.toEqual(initial.architect?.point);
    expect(avatars.inspector?.point).not.toEqual(initial.inspector?.point);
  });

  it("shows the latest live thought while Inspector walks and delays the recommendation check until Architect arrives", () => {
    const path: AttackPath = { id: "check", title: "Path to Filler 3", entry: "parking_rf", target: "HMI-F3",
      steps: [{ from: "parking_rf", to: "HMI-F3", via: "rf", note: "" }], severity: 4, likelihood: 2, impact: "", source: "rules" };
    const result = { passed: true, findings: [], paths: [path], disagreements: [], revised: false };
    const assessment: Assessment = {
      placement: { level: 2, network_area: "Cell Pack", conduit: null, why: "Fixture" },
      physical_placement: { area: "packaging", near_asset_id: null, position_hint: "", connections: [], physical_constraints: [] },
      never_place: [], risks: [], attack_paths: [], compliance: [], mitigations: [], confidence: 0.9,
    };
    const avatar = (crew: "architect" | "inspector") => crewAvatar(crew);
    ingest(start());
    ingest({ ...run, type: "selfcheck.started", engine: "rules engine" });
    ingest({ ...run, type: "selfcheck.path", path });
    ingest({ ...run, type: "selfcheck.done", latencyMs: 3, result });
    expect(avatar("inspector")).toMatchObject({ speech: { text: "Reviewing as-dropped placement…" },
      speechStartedAt: null, speechLatencyMs: 3 });
    ingest({ ...run, type: "reasoning.started", model: MODEL_IDS.reasoning, candidateArea: null });
    ingest({ ...run, type: "reasoning.thought", text: "**Reviewing fit** First summary" });
    ingest({ ...run, type: "reasoning.thought", text: "**Reviewing fit** Latest summary" });
    expect(avatar("architect").speech).toEqual({ kind: "thought", text: "Reviewing fit · Latest summary" });
    ingest({ ...run, type: "reasoning.done", model: MODEL_IDS.reasoning, latencyMs: 4, assessment });
    ingest({ ...run, type: "selfcheck.started", engine: "rules engine" });
    expect(avatar("architect").speech?.kind).toBe("thought");
    const sequence: string[] = [];
    const stop = useCrewStore.subscribe(({ avatars }) => {
      const cues = [avatars.inspector?.speech?.text, avatars.architect?.speech?.text];
      for (const cue of cues) if (cue && !sequence.includes(cue)) sequence.push(cue);
    });
    try {
      vi.advanceTimersByTime(16_000);
      const walk = sequence.indexOf("As dropped · tracing to HMI-F3");
      const proposal = sequence.indexOf("Packaging · Purdue L2");
      const recommendation = sequence.indexOf("Checking the recommendation…");
      expect(walk).toBeGreaterThanOrEqual(0);
      expect(proposal).toBeGreaterThan(walk);
      expect(recommendation).toBeGreaterThan(proposal);
    } finally {
      stop();
    }
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
    expect(scout().walking).toBe(false);
    expect(Math.abs(scout().point.x - DEFAULT_DROP.x)).toBeGreaterThanOrEqual(BADGE_SEPARATION);
    expect(Math.abs(scout().point.y - DEFAULT_DROP.y)).toBeLessThanOrEqual(BADGE_SEPARATION);
  });

  it("publishes real elapsed start and latency with no per-frame avatar state writes", () => {
    ingest(start());
    ingest({ ...run, at: 10_100, type: "perception.started", model: MODEL_IDS.perception });
    const { avatars, live } = useCrewStore.getState();
    expect(live.scout).toMatchObject({ status: "working", startedAt: 10_100, engine: MODEL_IDS.perception });
    vi.advanceTimersByTime(500);
    expect(useCrewStore.getState().avatars).toBe(avatars);
    expect(crewPosition("scout")).not.toEqual(avatars.scout?.point);
    ingest({ ...run, at: 10_600, type: "run.error", stage: "perception", message: "Provider interrupted" });
    expect(useCrewStore.getState().live.scout).toMatchObject({ startedAt: null, status: "error" });
  });

  it("reads the current twin telemetry for each observation", () => {
    const initial = observePatrol(SEED_TWIN, "scout", 0, 1)!;
    expect(initial.activity.text).toBe("LT-301 60% · in band");
    const twin = {
      ...SEED_TWIN,
      assets: SEED_TWIN.assets.map((asset) => asset.process?.telemetry ? {
        ...asset,
        process: { ...asset.process, telemetry: asset.process.telemetry.map((point) =>
          point.tag === "LT-301" ? { ...point, value: 92.00026772523983 } : point) },
      } : asset),
    };
    expect(observePatrol(twin, "scout", 0, 2)?.activity).toMatchObject({
      kind: "patrol", at: 2, text: "LT-301 92%",
    });
  });
});
