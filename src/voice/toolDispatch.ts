/** Validates model tool requests and returns only authorized local twin commands. */
import { capturedAssetId } from "@/pipeline/assetFromProfile";
import { explainRule } from "@/rules/engine";
import { isTourStepId, type TourStepId } from "@/tour/stepIds";
import type { AttackPath, RuleFinding, ViewMode } from "@/twin/types";
import { summarizeFinding, type VoiceSnapshot } from "./context";

export interface VoiceToolCall {
  id?: string;
  name?: string;
  args?: Record<string, unknown>;
}

export type VoiceCommand =
  | { type: "select"; assetId: string }
  | { type: "view"; view: ViewMode }
  | { type: "highlight"; pathId: string; assetId: string | null }
  | { type: "move"; assetId: string }
  | { type: "demo"; action: "start" | "next" | "previous" | "stop" | "status" }
  | { type: "demo"; action: "goTo"; stepId: TourStepId };

const demoActions = {
  start_demo: "start",
  next_demo_step: "next",
  previous_demo_step: "previous",
  stop_demo: "stop",
  demo_status: "status",
} as const;

export type ToolDecision = { response: Record<string, unknown>; command?: VoiceCommand };

function stringArg(args: VoiceToolCall["args"], key: string): string | undefined {
  const value = args?.[key];
  if (typeof value === "string" && Object.keys(args ?? {}).length === 1) return value.trim() || undefined;
}

function reject(error: string): ToolDecision {
  return { response: { error } };
}

export function voicePath(id: string, current: readonly AttackPath[], check: readonly AttackPath[] = []) {
  return current.find((path) => path.id === id && path.source === "rules")
    ?? check.find((path) => path.id === id && path.source === "rules");
}

export function dispatchVoiceTool({ name, args }: VoiceToolCall, { twin, risk, run, selectedId }: VoiceSnapshot,
  spokenRunId: string | null): ToolDecision {
  switch (name) {
    case "start_demo":
    case "next_demo_step":
    case "previous_demo_step":
    case "stop_demo":
    case "demo_status":
      if (args && Object.keys(args).length) return reject("This demo action takes no arguments.");
      return { response: {}, command: { type: "demo", action: demoActions[name] } };
    case "go_to_demo_step": {
      const stepId = stringArg(args, "stepId");
      if (!isTourStepId(stepId)) return reject("Choose a valid demo step ID.");
      return { response: {}, command: { type: "demo", action: "goTo", stepId } };
    }
    case "select_asset": {
      const id = stringArg(args, "id");
      const asset = twin.assets.find((item) => item.id === id);
      if (!asset) return reject("That asset tag is absent from the current twin.");
      return { response: { output: { assetId: asset.id, name: asset.name } }, command: { type: "select", assetId: asset.id } };
    }
    case "show_view": {
      const view = stringArg(args, "view");
      if (view !== "floor" && view !== "purdue" && view !== "split") return reject("Choose floor, purdue, or split.");
      return { response: { output: { view } }, command: { type: "view", view } };
    }
    case "highlight_path": {
      const id = stringArg(args, "pathId");
      const path = id && voicePath(id, risk.paths, run.selfCheck?.paths);
      if (!path) return reject("That path is absent from the current rules report and placement check.");
      const anchor = path.causedBy ?? path.target;
      const assetId = twin.assets.some((asset) => asset.id === anchor) ? anchor : null;
      return {
        response: { output: { pathId: path.id, title: path.title, severity: path.severity, simulated: true } },
        command: { type: "highlight", pathId: path.id, assetId },
      };
    }
    case "move_device_to_recommended": {
      const { runId, placedAssetId, status, profile, assessment, selfCheck, mode } = run;
      if ((args && Object.keys(args).length > 0) || !runId || spokenRunId !== runId
        || status !== "done" || mode === "reassess" || !placedAssetId || capturedAssetId(runId) !== placedAssetId
        || !profile || !assessment || !selfCheck?.passed || (!selfCheck.revised && selfCheck.disagreements.length)) {
        return reject("A finished capture with a passing recommendation is required to move the newly added device by voice. Review placement in the results panel.");
      }
      if (!twin.assets.some((asset) => asset.id === placedAssetId && asset.origin === "added")) {
        return reject("The newly added device is absent from the current twin.");
      }
      return { response: {}, command: { type: "move", assetId: placedAssetId } };
    }
    case "explain_finding": {
      const id = stringArg(args, "ruleId")?.toUpperCase();
      if (!id) return reject("Provide a rules-engine rule ID.");
      const rule = explainRule(id);
      const related = (findings: readonly RuleFinding[]) => findings.filter((item) => item.ruleId === id)
        .sort((a, b) => Number(b.assetId === selectedId) - Number(a.assetId === selectedId) || b.severity - a.severity)
        .slice(0, 4).map(summarizeFinding);
      const current = related(risk.findings);
      const findings = related(run.selfCheck?.findings ?? []);
      if (!rule && !current.length && !findings.length) return reject("That rule ID is unknown.");
      const placementCheck = run.selfCheck && { scope: run.mode === "reassess" ? "current" : "recommended", findings };
      return { response: { output: { rule, current, placementCheck } } };
    }
    default:
      return reject("That action is unavailable by voice. Review and confirm twin changes in the results panel.");
  }
}
