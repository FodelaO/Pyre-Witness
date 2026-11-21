/** Watches optional feature stores for real session transitions without making them dependencies. */
import { MODEL_IDS } from "@/gemini/models";
import { useTranscriptStore, type AuxiliarySource, type TranscriptObservation, type TranscriptStatus } from "./transcriptStore";

type OptionalStore<State> = {
  getState: () => State;
  subscribe: (listen: (next: State, previous: State) => void) => () => void;
};

type OptionalContext = {
  keys(): string[];
  (file: string): Record<string, unknown>;
};

declare const require: { context: (directory: string, deep: boolean, files: RegExp) => OptionalContext };

type Observation = Omit<TranscriptObservation, "at"> & { at?: number };

let sequence = 0;
let connected = false;

function recorder(source: AuxiliarySource, label: string) {
  const id = `${source}-session-${++sequence}`;
  return (observation: Observation, status?: TranscriptStatus) => {
    useTranscriptStore.getState().recordObservation({
      id, source, label, observation: { at: Date.now(), ...observation }, status,
    });
  };
}

function observe<State>(store: OptionalStore<State>, onChange: (next: State, previous?: State) => void) {
  const safe = (next: State, previous?: State) => {
    try { onChange(next, previous); } catch { /* Leave the pipeline transcript available. */ }
  };
  safe(store.getState());
  store.subscribe(safe);
}

interface SimulationSnapshot {
  run?: { id: string; stages: { title: string }[] };
  currentStage: number;
  outcome?: string;
  mode: string;
}

function simulation(store: OptionalStore<SimulationSnapshot>) {
  let record: ReturnType<typeof recorder> | undefined;
  return observe(store, (next, previous) => {
    if (next.run !== previous?.run) {
      if (record) record({ crew: "inspector", origin: "simulation", title: "Simulation ended" }, "interrupted");
      record = undefined;
      if (next.run) {
        record = recorder("simulation", next.run.id);
        record({ crew: "inspector", origin: "simulation", title: "Simulation started", raw: { scenario: next.run.id } });
      }
    }
    if (!record || !next.run) return;
    const start = previous?.run === next.run ? previous.currentStage + 1 : 0;
    for (const stage of next.run.stages.slice(start, next.currentStage + 1)) {
      record({ crew: "inspector", origin: "simulation", title: stage.title, raw: stage });
    }
    if (next.mode === "finished") {
      record({ crew: "inspector", origin: "simulation", title: "Simulation result", text: next.outcome, raw: next.run }, "completed");
      record = undefined;
    }
  });
}

interface WatchChannel {
  status: string;
  message?: string;
  sources?: { source: string; ms?: number; error?: string }[];
  candidates?: unknown[];
  stages?: { name: string; model?: string; ms?: number; detail?: string }[];
  managedProgress?: { phase: string; ms?: number };
  report?: { headline?: string; finishedAt?: number };
}

type WatchSnapshot = Partial<Record<"local" | "managed", WatchChannel>>;

function watch(store: OptionalStore<WatchSnapshot>) {
  const records: Partial<Record<keyof WatchSnapshot, ReturnType<typeof recorder>>> = {};
  return observe(store, (next, previous) => {
    for (const mode of ["local", "managed"] as const) {
      const channel = next[mode];
      const before = previous?.[mode];
      if (!channel || channel === before) continue;
      if (channel.status === "running" && !records[mode]) {
        records[mode] = recorder("watch", mode === "managed" ? "Managed threat watch" : "Daily threat watch");
        records[mode]({ crew: "chief", origin: "system", title: "Threat watch started", raw: { mode } });
      }
      const record = records[mode];
      if (!record) continue;
      for (const source of channel.sources?.slice(before?.sources?.length ?? 0) ?? []) {
        record({ crew: "chief", origin: "system", title: source.source, latencyMs: source.ms, text: source.error, raw: source });
      }
      if (channel.candidates !== before?.candidates && channel.candidates?.length) {
        record({ crew: "chief", origin: "rules", title: "Inventory matches", raw: channel.candidates });
      }
      if (channel.managedProgress && channel.managedProgress !== before?.managedProgress) {
        const { phase, ms } = channel.managedProgress;
        record({ crew: "chief", origin: "model", engine: MODEL_IDS.managedAgent, title: `Managed agent · ${phase}`,
          latencyMs: ms, raw: channel.managedProgress });
      }
      for (const stage of channel.stages?.slice(before?.stages?.length ?? 0) ?? []) {
        record({ crew: "chief", origin: stage.model ? "model" : stage.name === "rules" ? "rules" : "system",
          engine: stage.model ?? (stage.name === "rules" ? "rules engine" : undefined), title: stage.name,
          latencyMs: stage.ms, text: stage.detail, raw: stage });
      }
      if (channel.status === "finished" || channel.status === "error") {
        const finished = channel.status === "finished";
        record({
          crew: "chief", origin: "system", title: finished ? "Threat watch report" : "Threat watch error",
          text: channel.report?.headline ?? channel.message, raw: channel.report ?? channel.message,
          ...(channel.report?.finishedAt ? { at: channel.report.finishedAt } : {}),
        }, finished ? "completed" : "error");
        delete records[mode];
      }
    }
  });
}

interface ModelerSnapshot {
  phase: string;
  source?: unknown;
  observations?: unknown[];
  proposal?: unknown;
  error?: string;
  applied?: string;
  applyIssues?: unknown;
}

function modeler(store: OptionalStore<ModelerSnapshot>) {
  let record: ReturnType<typeof recorder> | undefined;
  let finished = false;
  return observe(store, (next, previous) => {
    const ingesting = ["upload", "gate", "extract", "reconcile"].includes(next.phase);
    if ((next.phase === "upload" && previous?.phase !== "upload") || (!record && ingesting)) {
      if (record && !finished) record({ crew: "scout", origin: "system", title: "Modeler upload replaced" }, "interrupted");
      record = recorder("modeler", "Twin modeler ingest");
      finished = false;
    }
    if (!record) return;
    if (next.phase === "idle") {
      if (!finished) record({ crew: "scout", origin: "system", title: "Modeler ingest canceled" }, "interrupted");
      record = undefined;
      return;
    }
    if (next.phase !== previous?.phase && !["review", "error"].includes(next.phase)) {
      record({ crew: "scout", origin: "system", title: `Modeler · ${next.phase}`, raw: { phase: next.phase } });
    }
    if (next.source && next.source !== previous?.source) {
      record({ crew: "scout", origin: "system", title: "Ingest source", raw: next.source });
    }
    if (next.observations?.length && next.observations !== previous?.observations) {
      record({ crew: "scout", origin: "model", title: "Extracted observations", raw: next.observations });
    }
    if (next.proposal && next.proposal !== previous?.proposal) {
      record({ crew: "architect", origin: "system", title: "Modeler review proposal", raw: next.proposal }, "completed");
      finished = true;
    }
    if (next.error && next.error !== previous?.error) {
      record({ crew: "scout", origin: "system", title: "Modeler error", text: next.error }, "error");
      finished = true;
    }
    if (next.applied && next.applied !== previous?.applied) {
      record({ crew: "scout", origin: "system", title: "Modeler review applied", text: next.applied, raw: next.applyIssues }, "completed");
    }
  });
}

interface VoiceSnapshot {
  runId?: string;
  phase?: string;
  transcript?: unknown[] | string;
  transcripts?: unknown[];
}

function voice(store: OptionalStore<VoiceSnapshot>) {
  let record: ReturnType<typeof recorder> | undefined;
  return observe(store, (next, previous) => {
    const transcript = next.transcripts ?? next.transcript;
    const prior = previous?.transcripts ?? previous?.transcript;
    if (next.runId !== previous?.runId || next.phase === "idle") {
      record?.({ crew: "chief", origin: "system", title: "Voice session ended" }, "completed");
      record = undefined;
    }
    if (!transcript || transcript === prior) return;
    const entries = Array.isArray(transcript) ? transcript.slice(Array.isArray(prior) ? prior.length : 0) : [transcript];
    for (const item of entries) {
      record ??= recorder("voice", "Chief voice");
      record({ crew: "chief", origin: "system", title: "Voice transcript", engine: MODEL_IDS.live,
        text: typeof item === "string" ? item : undefined, raw: item });
    }
  });
}

function connect<State>(
  context: OptionalContext,
  path: RegExp,
  exports: string[],
  attach: (store: OptionalStore<State>) => void,
) {
  for (const file of context.keys().filter((key) => path.test(key))) {
    try {
      const bindings = context(file);
      for (const name of exports) {
        const store = bindings[name] as Partial<OptionalStore<State>> | undefined;
        if (typeof store?.getState === "function" && typeof store.subscribe === "function") {
          attach(store as OptionalStore<State>);
          break;
        }
      }
    } catch { /* An optional feature may be absent in this build. */ }
  }
}

export function connectTranscriptAdapters() {
  if (connected) return;
  let context: OptionalContext;
  try {
    context = require.context("..", true, /^\.\/(?:sim\/simStore|watch\/watchStore|modeler\/modelerStore|voice\/(?:voiceStore|liveStore|talkStore|transcriptStore))\.[cm]?[jt]sx?$/);
  } catch {
    return;
  }
  connected = true;
  connect(context, /^\.\/sim\//, ["useSimStore"], simulation);
  connect(context, /^\.\/watch\//, ["useWatchStore"], watch);
  connect(context, /^\.\/modeler\//, ["useModelerStore"], modeler);
  connect(context, /^\.\/voice\//, ["useVoiceStore", "useLiveStore", "useTalkStore", "useTranscriptStore"], voice);
}
