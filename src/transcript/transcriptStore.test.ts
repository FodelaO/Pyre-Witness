/** Verifies run retention, downloadable fidelity, and rendering without raw provider events. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MODEL_IDS } from "@/gemini/models";
import { useRunStore } from "@/pipeline/runStore";
import type { PipelineEvent, TranscriptEntry } from "@/pipeline/types";
import { TranscriptHistory } from "./TranscriptDrawer";
import { serializeTranscript } from "./transcriptExport";
import { createTranscriptStore, isPipelineRun } from "./transcriptStore";
import { locateStep, timeline } from "./transcriptSteps";

const at = 1_795_276_800_000;

function started(runId: string, timestamp = at, mode: "analyze" | "reassess" = "analyze"): PipelineEvent {
  return { type: "run.started", runId, at: timestamp, mode, input: { kind: "text", label: runId }, dropPoint: null };
}

describe("transcript session", () => {
  it("keeps the last twenty analysis and reassess runs across resets", () => {
    const store = createTranscriptStore();
    const { syncPipeline } = store.getState();
    for (let index = 0; index <= 20; index++) {
      const runId = `run-${index}`;
      const start = started(runId, at + index * 100, index % 2 ? "reassess" : "analyze");
      const events: PipelineEvent[] = index === 20
        ? [start, { runId, at: start.at + 10, type: "run.error", message: "Capture stopped.", stage: "gate" }]
        : [start, { runId, at: start.at + 10, type: "run.completed", totalMs: 10 }];
      syncPipeline({ events: [start], transcript: [] });
      syncPipeline({ events, transcript: [] });
      syncPipeline({ events: [], transcript: [] });
    }

    const runs = store.getState().runs;
    expect(runs).toHaveLength(20);
    expect(runs[0]).toMatchObject({ id: "run-1", source: "reassess", status: "completed", totalMs: 10 });
    expect(runs.at(-1)).toMatchObject({ id: "run-20", status: "error", endedAt: at + 2010 });
  });

  it("retains call metadata and original multiline payloads in JSON and Markdown", () => {
    const store = createTranscriptStore();
    const { syncPipeline } = store.getState();
    const runId = "test-capture";
    const entry: TranscriptEntry = {
      stage: "reasoning",
      crew: "architect",
      engine: MODEL_IDS.reasoning,
      thinkingLevel: "low",
      request: { system: "First instruction\nSecond instruction", text: "Exact request", attachments: 2 },
      response: { text: "Original response", json: { field: "value\nwith a newline" } },
      usage: { inputTokens: 21, outputTokens: 3, totalTokens: 24 },
      latencyMs: 17,
      note: "retry 1 after HTTP 429",
    };
    const events: PipelineEvent[] = [
      started(runId),
      { type: "transcript.entry", runId, at: at + 18, entry },
      { type: "run.completed", runId, at: at + 19, totalMs: 19 },
    ];
    const { ingest, reset } = useRunStore.getState();
    const disconnect = useRunStore.subscribe(syncPipeline);
    try {
      events.forEach(ingest);
      expect(useRunStore.getState().transcript).toEqual([entry]);
    } finally {
      disconnect();
      reset();
    }
    const runs = store.getState().runs;
    const stamp = "2026-11-21T20:00:00.000Z";
    const json = JSON.parse(serializeTranscript(runs, "json", stamp));
    expect(json).toMatchObject({ exportedAt: stamp, runs: [{
      events, transcript: [entry], totalMs: 19,
      metadata: {
        engines: [MODEL_IDS.reasoning],
        thinkingLevels: [{ engine: MODEL_IDS.reasoning, level: "low", stepId: `${runId}:1` }],
        timings: [{ label: "Reasoning record", latencyMs: 17 }, { label: "Run completed", latencyMs: 19 }],
      },
    }] });
    const markdown = serializeTranscript(runs, "md", stamp);
    expect(markdown).toContain("# Pyre Witness session transcript");
    expect(markdown).toContain("### Reasoning record");
    expect(markdown).toContain("First instruction\\nSecond instruction");
    expect(markdown).toContain("Original response");
    expect(markdown).toContain("retry 1 after HTTP 429");
    expect(markdown).toContain('"totalTokens": 24');
    const html = renderToStaticMarkup(createElement(TranscriptHistory, { runs, target: {} }));
    expect(html).toContain("First instruction\nSecond instruction");
    expect(html).toContain("Exact request");
    expect(html).toContain("Original response");
    expect(html).toContain("Raw response JSON");
    expect(html).toContain("24 total tokens");
    expect(html.match(/aria-label="Reasoning record"/g)).toHaveLength(1);
  });

  it.each(["completed", "error"] as const)("keeps a %s run terminal when Chief records arrive afterward", (status) => {
    const runId = `late-chief-${status}`;
    const terminal: PipelineEvent = status === "completed"
      ? { type: "run.completed", runId, at: at + 10, totalMs: 9 }
      : { type: "run.error", runId, at: at + 10, stage: "summary", message: "Briefing stopped." };
    const entry: TranscriptEntry = { stage: "summary", crew: "chief", engine: MODEL_IDS.chief,
      response: { text: "Late briefing." }, usage: { totalTokens: 5 } };
    const initial = [started(runId), terminal];
    const events: PipelineEvent[] = [
      ...initial,
      { type: "transcript.entry", runId, at: at + 19, entry },
      { type: "summary.done", runId, at: at + 20, model: MODEL_IDS.chief, latencyMs: 10, text: "Late briefing." },
    ];
    const existing = createTranscriptStore();
    existing.getState().syncPipeline({ events: initial, transcript: [] });
    for (const store of [existing, createTranscriptStore()]) {
      const { syncPipeline } = store.getState();
      syncPipeline({ events, transcript: [entry] });
      syncPipeline({ events: [], transcript: [] });
      const run = store.getState().runs[0];
      expect(run).toMatchObject({ status, endedAt: terminal.at, events, transcript: [entry] });
      expect(run.totalMs).toBe(terminal.type === "run.completed" ? terminal.totalMs : undefined);
    }
  });

  it("lists and exports stored provider records when the snapshot has incomplete wire history", () => {
    const store = createTranscriptStore();
    const runId = "mixed-wire";
    const entry: TranscriptEntry = { stage: "summary", crew: "chief", engine: MODEL_IDS.chief,
      response: { text: "Stored briefing." }, usage: { totalTokens: 5 } };
    const events: PipelineEvent[] = [started(runId), { type: "transcript.entry", runId, at: at + 2, entry }];
    // Identical responses can represent separate calls. Match the mirrored event once.
    store.getState().syncPipeline({ events, transcript: [{ ...entry }, { ...entry }] });
    const runs = store.getState().runs;
    const steps = timeline(runs[0]);
    expect(steps.map(({ id }) => id)).toEqual([`${runId}:0`, `${runId}:1`, `${runId}:record:1`]);
    expect(steps[2]).toMatchObject({ providerRecord: entry, raw: entry });
    expect(steps[2].at).toBeUndefined();
    expect(serializeTranscript(runs, "md").match(/Stored briefing\./g)).toHaveLength(2);
    expect(JSON.parse(serializeTranscript(runs, "json")).runs[0].transcript).toEqual([entry, entry]);
  });

  it("renders the timeline and orders thought summaries with zero transcript.entry events", () => {
    const store = createTranscriptStore();
    const runId = "old-wire";
    const events: PipelineEvent[] = [
      started(runId),
      { type: "gate.done", runId, at: at + 3, model: MODEL_IDS.decisions, latencyMs: 3,
        gate: { proceed: true, reason: null, answers: { is_object: { type: "noul", value: 0.82, confidence: 0.9 } } } },
      { type: "reasoning.thought", runId, at: at + 7, text: "First streamed summary" },
      { type: "reasoning.thought", runId, at: at + 7, text: "Second streamed summary" },
      { type: "summary.done", runId, at: at + 10, model: MODEL_IDS.chief, latencyMs: 2, text: "Exact engineer briefing" },
      { type: "run.completed", runId, at: at + 11, totalMs: 11 },
    ];
    store.getState().syncPipeline({ events, transcript: [] });
    const runs = store.getState().runs;
    expect(runs[0] && isPipelineRun(runs[0]) && runs[0].transcript).toEqual([]);
    const html = renderToStaticMarkup(createElement(TranscriptHistory, { runs, target: {} }));
    expect(html).toContain("Calibrated decisions");
    expect(html).toContain("is_object");
    expect(html).toContain("Raw JSON");
    expect(html).not.toContain("<pre");
    expect(html).toContain("Exact engineer briefing");
    expect(html.indexOf("First streamed summary")).toBeLessThan(html.indexOf("Second streamed summary"));
    expect(locateStep(timeline(runs[0]), { entryId: `${runId}:3` })?.event).toEqual(events[3]);
  });
});
