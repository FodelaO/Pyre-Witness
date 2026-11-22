/** Runs threat review, a simulated-twin approval, and the app's escalation drill. */
import { useEscalationStore } from "@/escalation/store";
import { clearTestAlert, gatewayRehearsal, TEST_ASSET_ID } from "@/escalation/testScenario";
import { riskScore } from "@/panel/riskNumber";
import { useTwinStore } from "@/twin/store";
import { useWatchStore } from "@/watch/watchStore";
import {
  activate, button, closeDrawer, crew, dial, openResults, openReview, pointAt, ready, target, waitFor, waitForUi,
} from "./tourDom";
import { activeTest } from "./tourEvidence";
import { type TourStep } from "./tourMachine";

const runWatch = button('#pw-risk-panel-watch .pw-signal-run', "Run now");
const watchDesk = target('#pw-risk-panel-watch [aria-label="Plant intelligence"] .pw-signal-header');
const todo = target('#pw-risk-panel-todo .pw-todo-card:has(.pw-todo-metric[data-benefit="true"])');
const predicted = '[title="Predicted risk score change"]';
const thresholds = button('button[aria-label="Escalation thresholds"]');
const runTest = button('[aria-label="Escalation settings"] .pw-es-test-action', "Run test alert");
const clearTest = button('[aria-label="Escalation settings"] .pw-es-test-action', "Clear test");
const alertChips = target('[aria-label="Alert ladder"] .pw-es-ladder-row');
const plantFlag = target('.pw3d-escalation-flag[title^="TEST SCENARIO"], .pw-lens-escalation-flag[aria-label^="TEST SCENARIO"]');
const ladderFlag = target('[aria-label="Alert ladder"] button.pw-es-tier[aria-label^="Flag · "]:not([aria-disabled="true"])');
// The plant marker leaves the view when the camera frames the test asset; the ladder chip carries the same "!".
const assetFlag = () => {
  const flag = plantFlag();
  const box = flag?.getBoundingClientRect();
  const frame = flag?.closest(".pw3d-overlay")?.getBoundingClientRect()
    ?? { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
  const inside = box && box.right > frame.left + 4 && box.left < frame.right - 4
    && box.bottom > frame.top + 4 && box.top < frame.bottom - 4;
  return inside ? flag : ladderFlag();
};
const callChip = button(`[aria-label="Alert ladder"] button[aria-label^="Call · ${TEST_ASSET_ID} · "]`);
const callDetails = target('[aria-label="Call details"]');
const callRecord = () => useEscalationStore.getState().records.findLast(({ level, trigger, resolvedAt }) =>
  level === 3 && trigger.test && trigger.assetId === TEST_ASSET_ID && !resolvedAt);

export function createOperations() {
  let retainedTest: symbol | undefined;

  function cleanup() {
    if (retainedTest && gatewayRehearsal(activeTest()) === retainedTest) clearTestAlert();
    retainedTest = undefined;
  }

  const steps: TourStep[] = [
    {
      title: "Check today’s threats",
      initial: { text: "Open Threat watch from the risk dial.", target: dial },
      timeoutMs: 142_000,
      timeoutReason: "The threat review did not finish in time.",
      async run(context) {
        const { signal, show, showLive } = context;
        await context.next();
        await openReview("watch", context);
        if (useWatchStore.getState().review.status === "running") {
          show({ text: "Waiting for the current review.", target: watchDesk });
          await waitFor(() => {
            const run = useWatchStore.getState().review;
            return run.status !== "running" ? run : null;
          }, signal, useWatchStore.subscribe);
        }
        const control = await waitForUi(ready(runWatch), signal, "Run now is unavailable.", 10_000);
        await pointAt(context, runWatch, "Run a fresh threat review.");
        await context.next();
        const before = useWatchStore.getState().review;
        activate(control, signal);
        const started = useWatchStore.getState().review;
        if (before === started || started.status !== "running") throw new Error("A fresh threat review did not start.");

        const close = closeDrawer();
        if (close) activate(close, signal);
        showLive({ text: "Threat watch started.", target: crew });
        const result = await waitFor(() => {
          const { review } = useWatchStore.getState();
          if (review.status !== "running") return review;
          const stage = review.stages.at(-1);
          if (stage) showLive({ text: stage.detail, target: crew });
          return null;
        }, signal, useWatchStore.subscribe);

        if (result.status === "error" || !result.report || result.cached || result.report.runId === before.report?.runId) {
          throw new Error(result.message ?? "A fresh threat review was unavailable.");
        }
        if (result.report.stages.some(({ name, state }) => name !== "feeds" && state === "failed")) {
          throw new Error("Gemini threat review unavailable.");
        }
        openResults(signal);
        await pointAt(context, watchDesk, result.report.headline);
      },
    },
    {
      title: "Approve a proposed fix",
      initial: { text: "Open To-dos to review the predicted drop.", target: dial },
      timeoutMs: 23_000,
      timeoutReason: "The approval did not update the twin in time.",
      async run(context) {
        await context.next();
        await openReview("todo", context);
        const row = await waitForUi(todo, context.signal, "No To-do shows a predicted risk drop.", 3000);
        const action = row.querySelector<HTMLButtonElement>(".pw-todo-approve");
        const drop = row.querySelector(predicted)?.textContent?.trim();
        if (!action || !drop) throw new Error("The proposed fix is unavailable.");
        await pointAt(context, () => action.isConnected ? action : null, `Predicted change · ${drop}`);
        await context.next("Approve the displayed To-do on the simulated twin.");
        if (todo() !== row || row.querySelector(predicted)?.textContent?.trim() !== drop) {
          throw new Error("The proposal changed before approval.");
        }
        const before = useTwinStore.getState().risk;
        activate(action, context.signal);
        const after = useTwinStore.getState().risk;
        if (after === before) throw new Error("Approval did not change the simulated twin.");
        const scores = `${riskScore(before.score)} → ${riskScore(after.score)}`;
        await pointAt(context, dial, `Approved on the simulated twin · risk ${scores}.`);
      },
    },
    {
      title: "Review a test escalation",
      initial: { text: "Open the simulated alert drill.", target: thresholds },
      timeoutMs: 47_000,
      timeoutReason: "The test escalation did not finish in time.",
      async run(context) {
        const { signal } = context;
        await context.next();
        const close = closeDrawer();
        if (close) activate(close, signal);
        const settings = await waitForUi(ready(thresholds), signal, "Escalation settings are unavailable.");
        if (activeTest()) throw new Error("A test alert is already open.");
        if (settings.getAttribute("aria-expanded") !== "true") activate(settings, signal);
        await waitForUi(ready(runTest), signal, "Run test alert is unavailable.");
        await pointAt(context, runTest, "Run the simulated alert drill.");
        await context.next();
        // Pressing Next is an outside click that may close the settings popover; reopen it once.
        let test = ready(runTest)();
        if (!test) {
          const reopen = await waitForUi(ready(thresholds), signal, "Escalation settings are unavailable.");
          if (reopen.getAttribute("aria-expanded") !== "true") activate(reopen, signal);
          test = await waitForUi(ready(runTest), signal, "Run test alert is unavailable.");
        }
        let ownedTest: ReturnType<typeof gatewayRehearsal>;
        try {
          activate(test, signal);
          ownedTest = gatewayRehearsal(activeTest());
          if (!ownedTest) {
            throw new Error(target('[aria-label="Escalation settings"] [role="status"]')()?.textContent?.trim()
              || "The simulated alert could not start.");
          }
          const call = await waitForUi(ready(callChip), signal, "The simulated Call chip is unavailable.");
          await pointAt(context, alertChips, "Simulated alert chips are active.");
          await context.next("Inspect the simulated asset flag.", () => !activeTest());
          const marker = await waitForUi(assetFlag, signal, "The simulated asset flag is outside the view.", 2800).catch(() => null);
          if (marker) {
            await pointAt(context, assetFlag, "The ! marks the flagged asset in the drill.");
            await context.next("Open the simulated Call details.", () => !activeTest());
          }
          const chip = ready(callChip)() ?? call;
          if (chip.getAttribute("aria-expanded") !== "true") activate(chip, signal);
          await pointAt(context, callDetails, "Waiting for the Decisions API choice.");
          const receipt = await waitFor(() => {
            const record = callRecord();
            return record?.decision !== undefined ? record : null;
          }, signal, useEscalationStore.subscribe);
          if (!receipt.decision) throw new Error("Gemini decision unavailable for the test alert.");
          await pointAt(context, callDetails, `Test choice · ${receipt.decision.choice}`);
          signal.throwIfAborted();
          retainedTest = ownedTest;
        } finally {
          if (ownedTest && retainedTest !== ownedTest && gatewayRehearsal(activeTest()) === ownedTest) {
            clearTestAlert();
          }
        }
      },
    },
    {
      title: "Clear the test alert",
      initial: { text: "Clear the simulated alert from the twin.", target: () => clearTest() ?? thresholds() },
      timeoutMs: 12_000,
      timeoutReason: "Clear test was unavailable.",
      async run(context) {
        await context.next();
        const { signal } = context;
        if (!activeTest()) throw new Error("There is no active test alert to clear.");
        const settings = await waitForUi(ready(thresholds), signal, "Escalation settings are unavailable.");
        if (settings.getAttribute("aria-expanded") !== "true") activate(settings, signal);
        const clear = await waitForUi(ready(clearTest), signal, "Clear test is unavailable.");
        if (activeTest()) activate(clear, signal);
        if (activeTest()) throw new Error("The test alert is still active.");
        retainedTest = undefined;
        await pointAt(context, alertChips, "The test alert is cleared.");
      },
    },
  ];

  return { steps, cleanup };
}
