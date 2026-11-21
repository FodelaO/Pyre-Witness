/** Places the completed replay's detailed comparison alongside the other evidence. */
"use client";

import { Activity } from "lucide-react";
import { SimulationLoss } from "@/econ/mountsSimulation";
import { counterfactualText } from "@/sim/outcome";
import { useSimStore } from "@/sim/simStore";
import { CompactLossFigure } from "./CompactLossFigure";
import { Disclosure, PanelSection } from "./PanelParts";

export function SimulationComparison() {
  const run = useSimStore((state) => state.mode === "finished" ? state.run : null);
  if (!run) return null;
  return (
    <PanelSection>
      <CompactLossFigure><SimulationLoss run={run} /></CompactLossFigure>
      <Disclosure label={<span className="pw-panel-labeled"><Activity size={15} aria-hidden />Simulation comparison</span>}>
        <p><strong>Simulated outcome</strong> {run.consequence.summary}</p>
        <p><strong>Counterfactual</strong> {counterfactualText(run)}</p>
      </Disclosure>
    </PanelSection>
  );
}
