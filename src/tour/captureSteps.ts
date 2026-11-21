/** Drives an ordinary photo capture and presents the resulting twin and placement evidence. */
import { captureErrorMessage } from "@/capture/captureError";
import { MODEL_IDS } from "@/gemini/models";
import { cancelRun } from "@/pipeline/client";
import { pipelineBus } from "@/pipeline/bus";
import { useRunStore } from "@/pipeline/runStore";
import { useTwinStore } from "@/twin/store";
import {
  activate, button, closeDrawer, crew, openResults, pointAt, ready, shown, target, waitFor, waitForUi,
} from "./tourDom";
import { pause, type TourStep } from "./tourMachine";

const add = button('button[aria-label="Add a device"]');
const upload = button('.pw-capture-toolbar button[aria-label="Upload"]');
const sample = button('button[aria-label="Run S7-300 PLC sample photo"]');
const collapse = button('button[aria-label="Collapse capture"]');
const sampleError = target('[aria-label="Sample photos"] [role="alert"]');
const optionsUse = button('section:is([aria-label="Better option"], [aria-label="Better options"]) button[aria-label^="Use "]');

const pipelineLines = {
  "perception.started": "Scout reads the photo.",
  "reasoning.started": "Architect evaluates placement.",
  "selfcheck.started": "The rules engine checks the twin.",
  "revision.started": "Architect revises the placement.",
  "summary.started": "Chief prepares the briefing.",
} as const;

function resultSection(label: string) {
  return () => Array.from(document.querySelectorAll("#pw-results .pw-panel-heading"))
    .find((heading) => shown(heading) && heading.querySelector("h2")?.textContent?.trim().startsWith(label))
    ?.closest(".pw-panel-section") ?? null;
}

export function captureSteps(): TourStep[] {
  let completedAsset: string | null = null;
  const placed = () => {
    if (!completedAsset || useRunStore.getState().placedAssetId !== completedAsset) return null;
    const id = CSS.escape(completedAsset);
    const label = target('.pw3d-label[data-placed="true"]')();
    return label ?? target(`[data-floor-asset="${id}"] .pw-floor-symbol, .pw-purdue [data-asset="${id}"]`)();
  };
  const risks = resultSection("Risks");
  const placement = resultSection("Where it goes");

  return [
    {
      title: "Add new equipment",
      initial: { text: "Open capture for the S7-300 PLC photo.", target: add },
      timeoutMs: 130_000,
      timeoutReason: "The photo analysis or briefing did not finish in time.",
      async run(context) {
        const { signal, show } = context;
        const close = closeDrawer();
        if (close) activate(close, signal);
        const addButton = await waitForUi(ready(add), signal, "Capture is busy or unavailable.");
        await pointAt(context, add, "Open capture for the S7-300 PLC photo.", 900);
        if (addButton.getAttribute("aria-expanded") !== "true") activate(addButton, signal);
        const uploadButton = await waitForUi(ready(upload), signal, "The Upload control is unavailable.");
        await pointAt(context, upload, "Choose Upload.", 700);
        activate(uploadButton, signal);

        const photo = await waitForUi(ready(sample), signal, "The S7-300 sample photo is unavailable.");
        await pointAt(context, sample, "Submit the S7-300 PLC sample.", 950);
        const previousSampleError = sampleError();
        const previousRun = useRunStore.getState().runId;
        let runId: string | null = null;
        let clicked = false;
        let failure: string | null = null;
        let finished = false;
        let briefingModel: string | undefined;
        let captions = Promise.resolve();
        const presented = new Set<string>();

        function present(text: string) {
          if (presented.has(text)) return;
          presented.add(text);
          // Preserve brief stages that can arrive in the same network chunk.
          captions = captions.then(async () => {
            signal.throwIfAborted();
            show({ target: crew, text });
            await pause(950, signal);
          }).catch(() => {});
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
            activate(photo, signal);
            clicked = true;
            show({ target: crew, text: "Waiting for the photo analysis." });
          });
          if ("error" in result) throw new Error(result.error);
          if (!result.asset) throw new Error(useRunStore.getState().gate?.reason ?? "The capture did not place a device.");
          await captions;
          if (briefingModel !== MODEL_IDS.chief) throw new Error("Gemini briefing unavailable. Placement is ready.");
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
      timeoutMs: 16_000,
      timeoutReason: "The placement or risk panel did not appear.",
      async run(context) {
        if (!completedAsset) throw new Error("No completed photo placement.");
        const { signal } = context;
        const state = useTwinStore.getState();
        const asset = state.twin.assets.find(({ id }) => id === completedAsset);
        if (!asset) throw new Error("The captured asset is no longer in the twin.");
        if (state.selectedId !== asset.id) state.select(asset.id);
        const close = closeDrawer();
        if (close) activate(close, signal);
        await waitForUi(placed, signal, "The asset is outside the current view.", 3500);
        await pointAt(context, placed, `${asset.id} is in the simulated plant.`, 1600, false);

        openResults(signal);
        const answer = await waitForUi(placement, signal, "The placement result is unavailable.");
        await pointAt(context, placement, answer.querySelector("[data-held]")
          ? "The report puts placement on hold." : "Review the recommended location.", 1600, "start");
        await waitForUi(risks, signal, "The capture risk results are unavailable.");
        const count = useRunStore.getState().assessment?.risks.length;
        await pointAt(context, risks, count === undefined ? "Review the assessed risks."
          : `${count} ${count === 1 ? "risk" : "risks"} reported for the device.`, 1600, "start");
      },
    },
    {
      title: "Try a better option",
      initial: { text: "Check for a lower-risk option.", target: risks },
      timeoutMs: 13_000,
      timeoutReason: "A qualifying option did not appear.",
      async run(context) {
        if (!completedAsset || useTwinStore.getState().selectedId !== completedAsset) {
          throw new Error("No captured device is selected.");
        }
        openResults(context.signal);
        const use = await waitForUi(ready(optionsUse), context.signal, "No better option appeared for this device.", 7500);
        const row = () => optionsUse()?.closest("article") ?? null;
        await pointAt(context, row, "Apply the option shown on the simulated twin.", 1500, "center");
        const current = ready(optionsUse)();
        if (current !== use || useTwinStore.getState().selectedId !== completedAsset) {
          throw new Error("The option changed before it could be applied.");
        }
        const before = useTwinStore.getState().twin;
        activate(use, context.signal);
        if (useTwinStore.getState().twin === before) throw new Error("The option could not be applied.");
        await pointAt(context, placed, "The twin updated.", 850, false);
      },
    },
  ];
}
