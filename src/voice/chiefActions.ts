/** Reads the latest store state and applies the Chief's validated local commands. */
import { create } from "zustand";
import { atRecommendedPlacement } from "@/pipeline/assetFromProfile";
import { moveToRecommended } from "@/pipeline/client";
import { useRunStore } from "@/pipeline/runStore";
import { evaluatePlacement } from "@/rules/engine";
import { tourController } from "@/tour/controller";
import { assetById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { VoiceSnapshot } from "./context";
import { dispatchVoiceTool, type VoiceToolCall } from "./toolDispatch";

export const useChiefPath = create<{ pathId: string | null }>(() => ({ pathId: null }));

export function readChiefSnapshot(): VoiceSnapshot {
  const { twin, risk, selectedId, view } = useTwinStore.getState();
  const { runId, status, profile, assessment, selfCheck, placedAssetId, events } = useRunStore.getState();
  const first = events[0];
  const mode = first?.type === "run.started" ? first.mode ?? "analyze" : undefined;
  const revisionPending = events.findLastIndex((event) => event.type === "revision.done")
    > events.findLastIndex((event) => event.type === "selfcheck.done");
  return { twin, risk, selectedId, view, run: {
    runId, status, profile, assessment, selfCheck: revisionPending ? null : selfCheck, placedAssetId, mode,
  } };
}

export function watchChiefContext(refresh: () => void): () => void {
  const offTwin = useTwinStore.subscribe((next, previous) => {
    if (next.twin !== previous.twin || next.risk !== previous.risk
      || next.selectedId !== previous.selectedId || next.view !== previous.view) refresh();
  });
  const offRun = useRunStore.subscribe((next, previous) => {
    if (next.runId !== previous.runId || next.status !== previous.status || next.profile !== previous.profile
      || next.assessment !== previous.assessment || next.selfCheck !== previous.selfCheck
      || next.placedAssetId !== previous.placedAssetId) refresh();
  });
  return () => { offTwin(); offRun(); };
}

export function actForChief(call: VoiceToolCall, spokenRunId: string | null): Record<string, unknown> {
  const snapshot = readChiefSnapshot();
  const { response, command } = dispatchVoiceTool(call, snapshot, spokenRunId);
  const store = useTwinStore.getState();
  switch (command?.type) {
    case "demo": {
      if (command.action === "status") return { output: tourController.status() };
      const accepted = command.action === "goTo"
        ? tourController.goTo(command.stepId)
        : tourController[command.action]();
      return { output: { accepted, ...tourController.status() } };
    }
    case "select":
      useChiefPath.setState({ pathId: null });
      store.select(command.assetId);
      break;
    case "view":
      store.setView(command.view);
      break;
    case "highlight":
      store.select(command.assetId);
      useChiefPath.setState({ pathId: command.pathId });
      break;
    case "move": {
      const { assessment } = snapshot.run;
      const current = assetById(snapshot.twin, command.assetId);
      const recommended = current && assessment && atRecommendedPlacement(snapshot.twin, current, assessment);
      if (!recommended || evaluatePlacement(snapshot.twin, recommended).findings.some(({ severity }) => severity >= 4)) {
        return { error: "The current twin blocks the recommended placement. Review the recommendation in the results panel." };
      }
      moveToRecommended(command.assetId);
      const after = useTwinStore.getState();
      const moved = assetById(after.twin, command.assetId);
      if (!moved || moved === current) return { error: "The recommended move could not be applied." };
      after.select(moved.id);
      useChiefPath.setState({ pathId: null });
      return { output: { assetId: moved.id, area: moved.physical.area, level: moved.network.level, score: after.risk.score } };
    }
  }
  return response;
}
