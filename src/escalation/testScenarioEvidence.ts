/** Prices the strongest rules-engine path introduced by the test gateway. */
import { displayedEventLoss } from "@/econ/displayLedger";
import { estimateLoss } from "@/econ/model";
import { scenarioFromPath } from "@/econ/scenarios";
import { areaById, assetById } from "@/twin/geometry";
import type { TwinState } from "@/twin/store";
import { TEST_ASSET_ID } from "./testScenario";
import type { EscalationCause } from "./types";

const byReport = new WeakMap<TwinState["risk"], EscalationCause | null>();

export function testScenarioCause({ twin, risk, baselineScore }: TwinState): EscalationCause | null {
  const cached = byReport.get(risk);
  if (cached !== undefined) return cached;
  const asset = assetById(twin, TEST_ASSET_ID);
  let cause: EscalationCause | null = null;
  if (asset) {
    const priced = risk.paths
      .filter((path) => path.source === "rules" && path.steps[0]?.to === asset.id)
      .map((path) => ({ path, estimate: estimateLoss(twin, scenarioFromPath(twin, path)) }))
      .sort((a, b) => b.estimate.lossIfManifests - a.estimate.lossIfManifests)[0];
    if (priced) {
      cause = {
        key: "test-scenario:" + asset.id, kind: "finding", test: true,
        assetId: asset.id, assetName: asset.name, assetKind: asset.physical.kind,
        room: areaById(twin, asset.physical.area)?.name ?? null,
        title: priced.path.title,
        loss: displayedEventLoss(priced.estimate),
        score: risk.score, baseline: baselineScore,
      };
    }
  }
  byReport.set(risk, cause);
  return cause;
}
