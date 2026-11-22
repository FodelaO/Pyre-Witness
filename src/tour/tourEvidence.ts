/** Reads completion from the current twin, run receipts, and actual results interactions. */
import { useEscalationStore } from "@/escalation/store";
import { gatewayRehearsal, TEST_ASSET_ID } from "@/escalation/testScenario";
import { useRunStore } from "@/pipeline/runStore";
import { useTwinStore } from "@/twin/store";
import { useWatchStore } from "@/watch/watchStore";
import type { TourStepId } from "./stepIds";

export const OPTION_CONTROL = 'section:is([aria-label="Better option"], [aria-label="Better options"]) button[aria-label^="Use "]';

export const activeTest = () => useTwinStore.getState().twin.assets.find(gatewayRehearsal);

export function createTourEvidence() {
  const startedAt = Date.now();
  const initialRun = useRunStore.getState();
  const initialReport = useWatchStore.getState().review.report?.runId;
  const appliedBefore = new Set(useTwinStore.getState().mitigations.filter(({ status }) => status === "applied").map(({ id }) => id));
  const testAtStart = activeTest();
  const testRecordsBefore = new Set(useEscalationStore.getState().records
    .filter(({ resolvedAt }) => resolvedAt != null || !testAtStart).map(({ id }) => id));
  let capturedId: string | null = null;
  let reviewedAsset: string | null = null;
  let optionAsset: string | null = null;
  let proofShown = false;

  function capture() {
    const run = useRunStore.getState();
    const { twin } = useTwinStore.getState();
    const entry = run.events[0];
    if (run.status === "done" && (initialRun.status !== "done" || run.runId !== initialRun.runId)
      && entry?.type === "run.started" && entry.mode !== "reassess" && run.assessment && run.placedAssetId
      && twin.assets.some(({ id, origin }) => id === run.placedAssetId && origin === "added")) {
      capturedId = run.placedAssetId;
    }
    return twin.assets.find(({ id }) => id === capturedId);
  }

  function testRecords() {
    return useEscalationStore.getState().records.filter(({ id, trigger }) =>
      !testRecordsBefore.has(id) && trigger.test && trigger.assetId === TEST_ASSET_ID);
  }

  function done(id: TourStepId): boolean {
    switch (id) {
      case "capture": return Boolean(capture());
      case "placement": return Boolean(reviewedAsset && capture()?.id === reviewedAsset);
      case "better-option": return Boolean(optionAsset && capture()?.id === optionAsset);
      case "threat-watch": {
        const { status, cached, report } = useWatchStore.getState().review;
        return status === "finished" && !cached && !!report && report.runId !== initialReport
          && report.finishedAt >= startedAt && !report.stages.some(({ name, state }) => name !== "feeds" && state === "failed");
      }
      case "approve-todo":
        return useTwinStore.getState().mitigations.some(({ id, status }) => status === "applied" && !appliedBefore.has(id));
      case "test-alert": return testRecords().length > 0;
      case "clear-test": {
        const records = testRecords();
        return records.length > 0 && !activeTest() && records.every(({ resolvedAt }) => resolvedAt != null);
      }
      case "proof": return proofShown || (typeof location !== "undefined" && location.pathname === "/proof");
    }
  }

  function observe(onChange: () => void) {
    let pending = false;
    let observing = true;
    function changed() {
      if (pending) return;
      pending = true;
      queueMicrotask(() => {
        pending = false;
        if (observing) onChange();
      });
    }

    function inspectClick(event: Event) {
      if (!(event.target instanceof Element)) return;
      const asset = capture();
      const control = event.target.closest(OPTION_CONTROL);
      if (asset && control && useTwinStore.getState().selectedId === asset.id) {
        queueMicrotask(() => {
          const after = capture();
          if (observing && after?.id === asset.id && after !== asset) {
            optionAsset = asset.id;
            changed();
          }
        });
      } else if (asset && event.isTrusted && useRunStore.getState().placedAssetId === asset.id
        && event.target.closest("#pw-results .pw-panel-section:has(.pw-panel-placement), #pw-results .pw-panel-risk-row")) {
        reviewedAsset = asset.id;
        changed();
      }
    }

    const off = [
      useRunStore.subscribe(() => { capture(); changed(); }),
      useTwinStore.subscribe(changed),
      useWatchStore.subscribe(changed),
      useEscalationStore.subscribe(changed),
    ];
    if (typeof document !== "undefined") document.addEventListener("click", inspectClick, true);
    return () => {
      observing = false;
      off.forEach((unsubscribe) => unsubscribe());
      if (typeof document !== "undefined") document.removeEventListener("click", inspectClick, true);
    };
  }

  return {
    capture, done, observe,
    reviewPlacement: (id: string) => { reviewedAsset = id; },
    applyOption: (id: string) => { optionAsset = id; },
    showProof: () => { proofShown = true; },
  };
}

export type TourEvidence = ReturnType<typeof createTourEvidence>;
