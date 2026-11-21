/** Presents the same four capture answers in each lens. */
import { Route } from "lucide-react";
import { Fragment } from "react";
import type { LensMode } from "@/layers/lensStore";
import type { Assessment, DeviceProfile, SelfCheckResult } from "@/pipeline/types";
import { AttackPathList } from "./AttackPathList";
import { ComplianceChips } from "./ComplianceChips";
import { NeverPlace } from "./NeverPlace";
import { Disclosure, PanelHeading, PanelSection } from "./PanelParts";
import { prioritizeLens, showsCompliance, showsRisk } from "./panelLens";
import { PlacementAnswer } from "./PlacementAnswer";
import { RiskList } from "./RiskList";

const pathCount = (n: number) => `${n} ${n === 1 ? "path" : "paths"}`;

type Props = {
  mode: LensMode;
  assessment: Assessment | null;
  objectClass?: DeviceProfile["object_class"];
  dropped: SelfCheckResult | null;
  recommendation: SelfCheckResult | null;
  pending: boolean;
  placedAssetId: string | null;
};

export function RunAnswers({ mode, assessment, objectClass, dropped, recommendation, pending, placedAssetId }: Props) {
  if (!assessment && !dropped) return null;
  const paths = assessment?.attack_paths ?? [];
  const proposals = dropped ? paths.filter(({ source }) => source === "model") : paths;
  const compliance = prioritizeLens(mode, assessment?.compliance ?? [], showsCompliance);
  const risks = assessment && (
    <PanelSection>
      <RiskList risks={prioritizeLens(mode, assessment.risks, showsRisk)} />
      {compliance.length > 0 && <Disclosure label={`Compliance references · ${compliance.length}`}><ComplianceChips items={compliance} /></Disclosure>}
    </PanelSection>
  );
  const attacks = (
    <PanelSection>
      <PanelHeading icon={Route}>Attack paths</PanelHeading>
      {dropped ? (
        <Disclosure label={`As-dropped rules check · ${pathCount(dropped.paths.length)}`}>
          <AttackPathList paths={[]} selfCheck={dropped} placement="as-dropped" />
        </Disclosure>
      ) : <AttackPathList paths={proposals} selfCheck={null} />}
      {dropped && proposals.length > 0 && (
        <Disclosure label={`Model proposals · ${pathCount(proposals.length)}`}>
          <AttackPathList paths={proposals} selfCheck={null} />
        </Disclosure>
      )}
      {recommendation && <Disclosure label={`Recommendation rules check · ${pathCount(recommendation.paths.length)}`}>
        <AttackPathList paths={[]} selfCheck={recommendation} placement="recommendation" />
      </Disclosure>}
    </PanelSection>
  );

  return (
    <>
      {assessment && <>
        <PanelSection><PlacementAnswer {...{ mode, assessment, objectClass, pending, placedAssetId, dropped }} checked={recommendation} /></PanelSection>
        <PanelSection><NeverPlace places={assessment.never_place} mode={mode} /></PanelSection>
      </>}
      {(mode === "data" ? [["paths", attacks], ["risks", risks]] as const : [["risks", risks], ["paths", attacks]] as const)
        .map(([key, answer]) => <Fragment key={key}>{answer}</Fragment>)}
    </>
  );
}
