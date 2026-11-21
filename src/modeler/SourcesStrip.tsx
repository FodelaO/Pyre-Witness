/** Renders seed provenance and actual session ingestion counts. */
"use client";

import { useModelerStore } from "./modelerStore";
import { MODEL_SOURCES } from "./sources";

export default function SourcesStrip() {
  const counts = useModelerStore((state) => state.sessionCounts);
  const isConnector = (id: string) => id === "historian" || id === "cmms" || id === "scan";
  const imports = MODEL_SOURCES.filter(({ id }) => !isConnector(id));
  const connectors = MODEL_SOURCES.filter(({ id }) => isConnector(id));
  return (
    <section className="pw-model-sources" aria-label="Modelled from">
      <div className="pw-model-source-head"><strong>Modelled from</strong><span>Simulated plant: seed model</span></div>
      <ul aria-label="Session imports, items observed">
        {imports.map(({ id, label }) => {
          const count = counts[id as keyof typeof counts];
          return (
            <li key={id} data-empty={count === undefined || undefined} title={count === undefined ? "No import this session" : `${count} observed this session`}>
              <strong>{label}</strong><small className="pw-mono">{count ?? 0}</small>
            </li>
          );
        })}
      </ul>
      <p className="pw-model-unconnected">Not connected · {connectors.map(({ label }) => label).join(" · ")}</p>
    </section>
  );
}
