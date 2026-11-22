/** Shares the presenter-paced demo lifecycle between the UI and Chief's Live tools. */
import { create } from "zustand";
import { captureSteps } from "./captureSteps";
import { createOperations } from "./operationsSteps";
import { proofStep } from "./proofStep";
import { TOUR_STEP_IDS, type TourStepId } from "./stepIds";
import { TourAdvance } from "./tourAdvance";
import { createTourEvidence } from "./tourEvidence";
import { tourLock } from "./tourLock";
import { runTour, type TourFrame } from "./tourMachine";

type TourState = {
  frame: TourFrame | null;
  completed: TourStepId[];
};

export const useTourStore = create<TourState>(() => ({ frame: null, completed: [] }));

function createSession() {
  const evidence = createTourEvidence();
  const operations = createOperations();
  const steps = [...captureSteps(evidence), ...operations.steps];
  const proof = {
    ...proofStep,
    async run(context: Parameters<typeof proofStep.run>[0]) {
      await context.next();
      await proofStep.run(context);
      evidence.showProof();
    },
  };
  const all = [...steps, proof];
  const listeners = new Set<() => void>();
  const completed = () => TOUR_STEP_IDS.filter(evidence.done);
  const off = evidence.observe(() => {
    const done = completed();
    const previous = useTourStore.getState().completed;
    if (done.join() !== previous.join()) useTourStore.setState({ completed: done });
    listeners.forEach((inspect) => inspect());
  });
  let segment: AbortController | undefined;
  let advance: TourAdvance | undefined;

  return {
    all,
    completed,
    next: () => advance?.press() ?? false,
    go(index: number, holdCompleted: boolean) {
      segment?.abort();
      const current = new AbortController();
      segment = current;
      const input = new TourAdvance();
      advance = input;
      void runTour(steps, proof, current.signal, (frame) => {
        if (current.signal.aborted) return;
        if (frame.status === "done") operations.cleanup();
        useTourStore.setState({ frame, completed: completed() });
      }, input, {
        startIndex: index,
        holdCompleted,
        done: (stepIndex) => evidence.done(TOUR_STEP_IDS[stepIndex]),
        observe(inspect) {
          listeners.add(inspect);
          return () => { listeners.delete(inspect); };
        },
      });
    },
    close() {
      segment?.abort();
      off();
      operations.cleanup();
    },
    skipProof(frame: TourFrame) {
      segment?.abort();
      operations.cleanup();
      useTourStore.setState({
        frame: { ...frame, status: "done", text: "Proof skipped.", nextAction: "Replay or close the demo." },
        completed: completed(),
      });
    },
  };
}

let session: ReturnType<typeof createSession> | undefined;

export const tourController = {
  start(): boolean {
    if (session && useTourStore.getState().frame?.status !== "done") return false;
    if (session) tourController.stop();
    const lock = tourLock.acquire();
    if (!lock) return false;
    session = createSession();
    const active = session;
    lock.signal.addEventListener("abort", () => active.close(), { once: true });
    session.go(0, false);
    return true;
  },
  next(): boolean {
    if (!session?.next()) return false;
    const { frame } = useTourStore.getState();
    if (frame) useTourStore.setState({ frame: { ...frame, status: "running", nextAction: undefined } });
    return true;
  },
  previous(): boolean {
    const index = useTourStore.getState().frame?.index ?? 0;
    if (index === 0) return false;
    return tourController.goTo(TOUR_STEP_IDS[index - 1]);
  },
  goTo(id: TourStepId): boolean {
    const index = TOUR_STEP_IDS.indexOf(id);
    if (!session || index < 0) return false;
    session.go(index, true);
    return true;
  },
  skip(): boolean {
    const frame = useTourStore.getState().frame;
    if (!session || !frame || frame.status === "done") return false;
    if (frame.index === frame.total) session.skipProof(frame);
    else session.go(frame.index + 1, false);
    return true;
  },
  stop(): boolean {
    if (!session) return false;
    tourLock.stop();
    session = undefined;
    useTourStore.setState({ frame: null, completed: [] });
    return true;
  },
  status() {
    const { frame } = useTourStore.getState();
    const stepId = frame ? TOUR_STEP_IDS[frame.index] : null;
    const completedSteps = session?.completed() ?? [];
    const following = frame && TOUR_STEP_IDS.find((id, index) => index > frame.index && !completedSteps.includes(id));
    const ready = frame?.status === "ready" || frame?.status === "skipped";
    let suggestedNextAction = "Start the demo.";
    if (frame?.nextAction) suggestedNextAction = frame.nextAction;
    else if (frame?.status === "done") suggestedNextAction = "Replay or close the demo.";
    // A skipped step has no verified result, so point at this step rather than the following step's cue.
    else if (frame?.status === "skipped" && stepId && !completedSteps.includes(stepId)) {
      suggestedNextAction = "This step was skipped. Complete it manually, or press Next to move on.";
    } else if (ready) suggestedNextAction = following && session
      ? session.all[TOUR_STEP_IDS.indexOf(following)].initial.text : "Press Next to finish the demo.";
    else if (frame) suggestedNextAction = "Wait for the current action to finish, or skip this step.";
    return {
      status: frame?.status ?? "inactive",
      stepId,
      title: frame?.title ?? null,
      ...(frame?.status === "skipped" && { skipReason: frame.text.replace(/^Skipped · /, "") }),
      done: stepId !== null && completedSteps.includes(stepId),
      completedSteps,
      suggestedNextAction,
    };
  },
  stepTitle(id: TourStepId): string {
    return session?.all[TOUR_STEP_IDS.indexOf(id)].title ?? id;
  },
};
