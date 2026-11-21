/** Subscribes the to-do list to plant configuration and admitted proposal sources. */
"use client";

import { useMemo } from "react";
import { useEconomicTwin } from "@/econ/useEconomicTwin";
import { useRunStore } from "@/pipeline/runStore";
import { useTwinStore } from "@/twin/store";
import { captureIsChecked } from "./captureProposal";
import { buildTodos } from "./todos";

export function useTodos() {
  const twin = useEconomicTwin();
  const risk = useTwinStore((state) => state.risk);
  const mitigations = useTwinStore((state) => state.mitigations);
  const runId = useRunStore((state) => state.runId);
  const assessment = useRunStore((state) => state.assessment);
  const placedAssetId = useRunStore((state) => state.placedAssetId);
  const objectClass = useRunStore((state) => state.profile?.object_class);
  const checked = useRunStore(captureIsChecked);
  return useMemo(() => buildTodos(twin, mitigations, checked ? { runId, assessment, placedAssetId, objectClass } : null, risk),
    [twin, risk, mitigations, checked, runId, assessment, placedAssetId, objectClass]);
}
