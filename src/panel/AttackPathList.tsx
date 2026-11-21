/** Reachability diagrams from assessment and rules-engine results, linked to the twin. */
"use client";

import { ArrowRight, Cable, Footprints, Globe, Network, Radio, Route, Router, Usb, Waves } from "lucide-react";
import { Fragment, useEffect, useId, useRef } from "react";
import type { SelfCheckResult } from "@/pipeline/types";
import { assetById, entryPointById } from "@/twin/geometry";
import { useTwinStore } from "@/twin/store";
import type { AttackPath, AttackStep, Twin } from "@/twin/types";
import { Disclosure, PanelHeading, readableId } from "./PanelParts";

const VIA = {
  rf: { icon: Radio, label: "Radio" },
  network: { icon: Cable, label: "Network" },
  physical: { icon: Footprints, label: "Physical" },
  usb: { icon: Usb, label: "USB" },
  internet: { icon: Globe, label: "Internet" },
  remote: { icon: Router, label: "Remote" },
  process: { icon: Waves, label: "Process" },
};

function Hop({ step }: { step: AttackStep }) {
  const { icon: Icon, label } = VIA[step.via];
  const description = [label, step.technique?.id].filter(Boolean).join(" · ");
  return (
    <span className="pw-panel-hop pw-mono" title={description} aria-label={description}>
      <span><Icon size={12} aria-hidden /><ArrowRight size={12} aria-hidden /></span>
      {step.technique?.id}
    </span>
  );
}

function PathRow({ path, twin }: { path: AttackPath; twin: Twin }) {
  const highlighted = useRef<string | null>(null);
  const hopDetails = useId();
  const target = assetById(twin, path.target) ?? entryPointById(twin, path.target);
  const targetLabel = target?.id ?? readableId(path.target);
  const hops = path.steps.map(({ via, technique }) => [VIA[via].label, technique?.id].filter(Boolean).join(" ")).join(", ");

  function highlight(id: string | null) {
    const state = useTwinStore.getState();
    if (id !== null || (highlighted.current !== null && state.hoveredId === highlighted.current)) state.hover(id);
    highlighted.current = id;
  }

  useEffect(() => () => {
    const state = useTwinStore.getState();
    if (highlighted.current !== null && state.hoveredId === highlighted.current) state.hover(null);
  }, []);

  function node(id: string) {
    const asset = assetById(twin, id);
    const entry = entryPointById(twin, id);
    return (
      <span className="pw-panel-node" data-target={id === path.target} title={asset?.name ?? entry?.name ?? id}
        onMouseEnter={() => highlight(id)} onMouseLeave={() => highlight(path.target)}>
        {asset ? <span className="pw-mono">{asset.id}</span> : entry?.name ?? readableId(id)}
      </span>
    );
  }

  const gap = <span className="pw-panel-hop" aria-label="Unspecified hop">···</span>;
  return (
    <li>
      {hops && <span id={hopDetails} hidden>{hops}</span>}
      <button type="button" className="pw-panel-path" title={path.title} aria-label={`${path.title}. Select target ${targetLabel}`}
        aria-describedby={hops ? hopDetails : undefined}
        disabled={!target} onClick={() => useTwinStore.getState().select(path.target)}
        onMouseEnter={() => highlight(path.target)} onMouseLeave={() => highlight(null)}
        onFocus={() => highlight(path.target)} onBlur={() => highlight(null)}>
        <span className="pw-panel-path-heading">
          <span className="pw-panel-path-source" data-source={path.source}>{path.source === "rules" ? "Rules engine" : "Model proposal"}</span>
          <span className="pw-mono pw-panel-path-target" title={target?.name}>{targetLabel}</span>
        </span>
        <span className="pw-panel-chain pw-scroll">
          {node(path.entry)}
          {path.steps.map((step, index) => {
            const previous = path.steps[index - 1]?.to ?? path.entry;
            return (
              <Fragment key={`${step.from}-${step.to}-${index}`}>
                {previous !== step.from && <>{gap}{node(step.from)}</>}
                <Hop step={step} />{node(step.to)}
              </Fragment>
            );
          })}
          {(path.steps.at(-1)?.to ?? path.entry) !== path.target && <>{gap}{node(path.target)}</>}
        </span>
      </button>
    </li>
  );
}

export function AttackPathList({ paths, selfCheck }: { paths: AttackPath[]; selfCheck: SelfCheckResult | null }) {
  const twin = useTwinStore((state) => state.twin);
  const unique = new Map<string, AttackPath>();
  for (const path of [...(selfCheck?.paths ?? []), ...paths]) {
    const key = `${path.source}:${path.id}`;
    if (!unique.has(key)) unique.set(key, path);
  }
  return (
    <>
      <PanelHeading icon={Route}>New attack paths {unique.size > 0 && <span className="pw-panel-muted pw-mono">{unique.size}</span>}</PanelHeading>
      {unique.size > 0 && <ul className="pw-panel-list">{Array.from(unique, ([key, path]) => <PathRow key={key} path={path} twin={twin} />)}</ul>}
      {selfCheck && (
        <div className="pw-panel-selfcheck">
          <p><Network size={13} aria-hidden />
            <span>Rules engine {selfCheck.passed ? "passed placement" : "flagged placement"} · {selfCheck.paths.length} {selfCheck.paths.length === 1 ? "path" : "paths"}{selfCheck.revised ? " · Architect revised once" : ""}</span>
          </p>
          {selfCheck.disagreements.length > 0 && (
            <Disclosure label={`${selfCheck.disagreements.length} ${selfCheck.disagreements.length === 1 ? "disagreement" : "disagreements"}`}>
              <ul className="pw-panel-bullets">{selfCheck.disagreements.map((item, index) => <li key={index}>{item}</li>)}</ul>
            </Disclosure>
          )}
        </div>
      )}
    </>
  );
}
