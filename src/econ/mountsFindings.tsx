/** Renders estimates beside a rules-engine finding or an assessment compliance gap. */
"use client";

import { useMemo } from "react";
import { useRunStore } from "@/pipeline/runStore";
import type { ComplianceItem } from "@/pipeline/types";
import { assetById } from "@/twin/geometry";
import type { RuleFinding, Twin } from "@/twin/types";
import { LossFigure } from "./LossFigure";
import { estimateLoss } from "./model";
import { useCaptureAssessmentTwin } from "./mountsCapture";
import { scenarioFromCompliance, scenarioFromFinding } from "./scenarios";
import { useEconomicTwin } from "./useEconomicTwin";

export function FindingLoss({ finding, checkedTwin }: { finding: RuleFinding; checkedTwin?: Twin }) {
  const liveTwin = useEconomicTwin();
  const twin = checkedTwin ?? liveTwin;
  const estimate = useMemo(() => {
    if (!assetById(twin, finding.assetId)) return null;
    const scenario = scenarioFromFinding(twin, finding);
    return scenario && estimateLoss(twin, scenario);
  }, [twin, finding]);
  return estimate ? <LossFigure estimate={estimate} /> : null;
}

export function ComplianceGapLoss({ item }: { item: ComplianceItem }) {
  const twin = useCaptureAssessmentTwin("as-dropped");
  const assetId = useRunStore((state) => state.placedAssetId);
  const estimate = useMemo(() => {
    if (item.status !== "gap" || !assetId || !assetById(twin, assetId)) return null;
    const scenario = scenarioFromCompliance(twin, item, assetId);
    return scenario && estimateLoss(twin, scenario);
  }, [twin, item, assetId]);
  return estimate ? <LossFigure estimate={estimate} /> : null;
}
