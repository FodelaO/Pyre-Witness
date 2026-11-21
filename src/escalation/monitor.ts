/** Bridges configuration, capture and outcome changes into the pure escalation policy. */
import { useRunStore } from "@/pipeline/runStore";
import { useSimStore } from "@/sim/simStore";
import { useTwinStore } from "@/twin/store";
import { readCauses } from "./evidence";
import { advancePolicy, initialPolicy } from "./policy";
import { approvalTitle, planApproval } from "./recommendation";
import { buildEscalationScript } from "./script";
import { useEscalationStore } from "./store";
import type { EscalationCause, EscalationRecord } from "./types";

let sequence = 0;

export function recommendedBriefing(cause: EscalationCause, thresholds: EscalationRecord["thresholds"]) {
  const plan = planApproval(cause);
  const action = plan ? approvalTitle(plan) : cause.assetId ? "Review the finding in the plant twin" : "Review the plant risk and pending controls";
  return { plan, action, script: buildEscalationScript(cause, action, thresholds) };
}

export function monitorEscalations(): () => void {
  const { initialize, add, update } = useEscalationStore.getState();
  initialize();
  let policy = initialPolicy;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function check() {
    clearTimeout(timer);
    const { records, thresholds } = useEscalationStore.getState();
    const causes = readCauses(useRunStore.getState().placedAssetId);
    const now = Date.now();
    const result = advancePolicy(policy, causes, thresholds, now);
    policy = result.state;

    for (const record of records) {
      if (!record.resolvedAt && !policy.episodes.has(record.trigger.key)) update(record.id, { resolvedAt: now });
    }
    add(result.raised.filter((cause) => !records.some((record) => !record.resolvedAt && record.trigger.key === cause.key))
      .map((trigger) => {
        const { action, plan, script } = recommendedBriefing(trigger, thresholds);
        return {
          id: `e-${now.toString(36)}-${++sequence}`, trigger, thresholds, script, action,
          canApprove: plan !== null, raisedAt: now,
        };
      }));

    if (result.nextAt !== undefined) timer = setTimeout(check, Math.max(0, result.nextAt - Date.now()));
  }

  const stops = [
    useTwinStore.subscribe((current, previous) => {
      if (current.risk !== previous.risk || current.mitigations !== previous.mitigations) check();
    }),
    useSimStore.subscribe((current, previous) => {
      if (current.mode !== previous.mode || current.run !== previous.run) check();
    }),
    useRunStore.subscribe((current, previous) => {
      // The captured device is priced when its run settles, the moment the panel prints its figure.
      if (current.placedAssetId !== previous.placedAssetId || current.status !== previous.status
        || (current.status !== "running" && current.assessment !== previous.assessment)) check();
    }),
    useEscalationStore.subscribe((current, previous) => {
      if (current.thresholds !== previous.thresholds) check();
    }),
  ];
  check();

  return () => { clearTimeout(timer); stops.forEach((stop) => stop()); };
}
