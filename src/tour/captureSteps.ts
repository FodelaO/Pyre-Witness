/** Drives an ordinary photo capture and presents the resulting twin and placement evidence. */
import { captureErrorMessage } from "@/capture/captureError";
import { MODEL_IDS } from "@/gemini/models";
import { cancelRun } from "@/pipeline/client";
import { pipelineBus } from "@/pipeline/bus";
import { useRunStore } from "@/pipeline/runStore";
import { useTwinStore } from "@/twin/store";
import { OPTION_CONTROL, type TourEvidence } from "./tourEvidence";
import {
  activate, button, closeDrawer, crew, openResults, pointAt, ready, shown, target, waitFor, waitForUi,
} from "./tourDom";
import type { TourStep } from "./tourMachine";

const add = button('button[aria-label="Add a device"]');
const upload = button('.pw-capture-toolbar button[aria-label="Upload"]');
const sample = button('button[aria-label="Run S7-300 PLC sample photo"]');
const collapse = button('button[aria-label="Collapse capture"]');
const sampleError = target('[aria-label="Sample photos"] [role="alert"]');
const optionsUse = button(OPTION_CONTROL);

const pipelineLines = {
  "perception.started": "Scout reads the photo.",
  "reasoning.started": "Architect evaluates placement.",
  "selfcheck.started": "The rules engine checks the twin.",
  "revision.started": "Architect revises the placement.",
  "summary.started": "Chief prepares the briefing.",
} as const;

function resultHeading(label: string) {
  return () => Array.from(document.querySelectorAll("#pw-results .pw-panel-heading"))
    .find((heading) => shown(heading) && heading.querySelector("h2")?.textContent?.trim().startsWith(label))
    ?? null;
}

export function captureSteps(evidence: TourEvidence): TourStep[] {
  const placed = () => {
    const completedAsset = evidence.capture()?.id;
    if (!completedAsset || useRunStore.getState().placedAssetId !== completedAsset) return null;
    const id = CSS.escape(completedAsset);
    const label = target('.pw3d-label[data-placed="true"]')();
    return label ?? target(`[data-floor-asset="${id}"] .pw-floor-symbol, .pw-purdue [data-asset="${id}"]`)();
  };
  const risks = resultHeading("Risks");
  const placement = resultHeading("Where it goes");

  return [
    {
      title: "Add new equipment",
      initial: { text: "Open capture for the S7-300 PLC photo.", target: add },
      timeoutMs: 142_000,
      timeoutReason: "The photo analysis or briefing did not finish in time.",
      async run(context) {
        const { signal, show, showLive } = context;
        await context.next();
        if (!ready(sample)()) {
          const close = closeDrawer();
          if (close) activate(close, signal);
          const addButton = await waitForUi(ready(add), signal, "Capture is busy or unavailable.");
          if (addButton.getAttribute("aria-expanded") !== "true") activate(addButton, signal);
          // Opening Upload is one action from the presenter's perspective. The fan closes on outside clicks.
          const uploadButton = await waitForUi(ready(upload), signal, "The Upload control is unavailable.");
          activate(uploadButton, signal);
        }

        const photo = await waitForUi(ready(sample), signal, "The S7-300 sample photo is unavailable.");
        await pointAt(context, sample, "Submit the S7-300 PLC sample.");
        await context.next();
        const previousSampleError = sampleError();
        const previousRun = useRunStore.getState().runId;
        if (useRunStore.getState().status === "running") {
          throw new Error("A capture is already running.");
        }
        let runId: string | null = null;
        let completedAsset: string | null = null;
        let clicked = false;
        let failure: string | null = null;
        let finished = false;
        let briefingModel: string | undefined;
        const presented = new Set<string>();

        function present(text: string) {
          if (presented.has(text)) return;
          presented.add(text);
          showLive({ target: crew, text });
        }

        try {
          const result = await waitFor(() => {
            if (failure) return { error: failure };
            if (finished && (!completedAsset || briefingModel !== undefined)) return { asset: completedAsset };
            if (clicked && !runId) {
              const alert = sampleError();
              const error = alert !== previousSampleError && alert?.textContent?.trim();
              if (error) return { error: captureErrorMessage(error) };
            }
            return null;
          }, signal, (inspect) => {
            const unsubscribe = pipelineBus.on((event) => {
              if (event.runId === previousRun) return;
              if (!runId && ((event.type === "run.started" && event.input.kind === "photo")
                || event.type === "run.error")) runId = event.runId;
              if (event.runId !== runId) return;
              if (event.type === "run.error") failure = captureErrorMessage(event.message);
              if (event.type === "run.completed") {
                finished = true;
                completedAsset = useRunStore.getState().placedAssetId;
              }
              if (event.type === "summary.done") briefingModel = event.model;
              if (event.type === "gate.done" && event.gate.reason?.startsWith("Gate unavailable")) {
                present("Gemini’s input gate is unavailable. Analysis continued.");
              }
              const text = event.type === "selfcheck.started" && event.phase === "as-dropped"
                ? "The rules engine checks the drop point."
                : pipelineLines[event.type as keyof typeof pipelineLines];
              if (text) present(text);
              inspect();
            });
            const observer = new MutationObserver(inspect);
            observer.observe(document.body, { subtree: true, childList: true });
            return () => {
              unsubscribe();
              observer.disconnect();
            };
          }, () => {
            show({ target: crew, text: "Waiting for the photo analysis." });
            activate(photo, signal);
            clicked = true;
          });
          if ("error" in result) throw new Error(result.error);
          if (!result.asset) throw new Error(useRunStore.getState().gate?.reason ?? "The capture did not place a device.");
          if (briefingModel !== MODEL_IDS.chief) throw new Error("Gemini briefing unavailable. Placement is ready.");
          await show({ target: crew, text: "Photo analysis and Gemini briefing complete." });
        } finally {
          if (signal.aborted && clicked) {
            const state = useRunStore.getState();
            if (runId ? state.runId === runId && state.status === "running"
              : !!document.querySelector(".pw-capture-run") && state.runId === previousRun) cancelRun();
            if (!runId) collapse()?.click();
          }
        }
      },
    },
    {
      title: "See the placement risks",
      initial: { text: "Find the captured device in the twin.", target: placed },
      timeoutMs: 22_000,
      timeoutReason: "The placement or risk panel did not appear.",
      async run(context) {
        await context.next();
        const completedAsset = evidence.capture()?.id;
        if (!completedAsset) throw new Error("No completed photo placement.");
        const { signal } = context;
        const state = useTwinStore.getState();
        const asset = state.twin.assets.find(({ id }) => id === completedAsset);
        if (!asset) throw new Error("The captured asset is no longer in the twin.");
        if (state.selectedId !== asset.id) state.select(asset.id);
        const close = closeDrawer();
        if (close) activate(close, signal);
        await waitForUi(placed, signal, "The asset is outside the current view.", 3500);
        await pointAt(context, placed, `${asset.id} is in the simulated plant.`);
        await context.next("Open the placement result.");

        openResults(signal);
        const answer = await waitForUi(placement, signal, "The placement result is unavailable.");
        await pointAt(context, placement, answer.closest(".pw-panel-section")?.querySelector("[data-held]")
          ? "The report puts placement on hold." : "Review the recommended location.");
        await context.next("Read the assessed risks.");
        await waitForUi(risks, signal, "The capture risk results are unavailable.");
        const count = useRunStore.getState().assessment?.risks.length;
        await pointAt(context, risks, count === undefined ? "Review the assessed risks."
          : `${count} ${count === 1 ? "risk" : "risks"} reported for the device.`);
        evidence.reviewPlacement(asset.id);
      },
    },
    {
      title: "Try a better option",
      initial: { text: "Check for a lower-risk option.", target: risks },
      timeoutMs: 18_000,
      timeoutReason: "A qualifying option did not appear.",
      async run(context) {
        await context.next();
        const completedAsset = evidence.capture()?.id;
        if (!completedAsset) throw new Error("No captured device is available.");
        const store = useTwinStore.getState();
        if (store.selectedId !== completedAsset) store.select(completedAsset);
        openResults(context.signal);
        const use = await waitForUi(ready(optionsUse), context.signal, "No better option appeared for this device.", 7500);
        await pointAt(context, optionsUse, "Apply the option shown on the simulated twin.");
        await context.next();
        const current = ready(optionsUse)();
        if (current !== use || useTwinStore.getState().selectedId !== completedAsset) {
          throw new Error("The option changed before it could be applied.");
        }
        const before = evidence.capture();
        activate(use, context.signal);
        const after = evidence.capture();
        if (!after || after.id !== completedAsset || after === before) throw new Error("The option could not be applied.");
        evidence.applyOption(after.id);
        await pointAt(context, placed, "The twin updated.");
      },
    },
  ];
}
