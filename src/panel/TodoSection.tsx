/** Shows ranked actions and their projected impact. */
"use client";

import { Check, ListChecks, MapPin, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { formatUsd } from "@/econ/format";
import { LossGlyph } from "@/econ/LossGlyph";
import { useTwinStore } from "@/twin/store";
import type { EquipmentKind } from "@/twin/types";
import { MitigationQueue } from "./MitigationQueue";
import { Disclosure, formatNumber, kindLabel, PanelHeading } from "./PanelParts";

interface TodoAsset {
  id: string;
  kind: EquipmentKind;
  tag: string;
  name: string;
}

interface Todo {
  id: string;
  title: string;
  source?: string;
  assets: readonly TodoAsset[];
  purchase?: { kind: EquipmentKind; name: string; where: string; features?: readonly string[] };
  predicted: { riskDelta: number; lossDeltaPerYear: number };
  description?: string;
  where?: string;
  apply(): unknown;
}

const VISIBLE_ACTIONS = 3;

function AssetDetails({ item }: { item: TodoAsset }) {
  const asset = useTwinStore((state) => state.twin.assets.find(({ id }) => id === item.id));
  const area = useTwinStore((state) => state.twin.areas.find(({ id }) => id === asset?.physical.area));
  const specs = asset?.specs;
  const features = [kindLabel(item.kind), specs?.capacity, specs?.material, specs?.foodGrade && "Food grade", specs?.ipRating, specs?.hazardRating]
    .filter(Boolean);
  return <p><strong>{item.tag} · {item.name}</strong><br />{features.join(" · ")}{area && <><br /><MapPin size={12} aria-hidden /> {area.name}</>}</p>;
}

function TodoCard({ item }: { item: Todo }) {
  const queued = useTwinStore((state) => state.mitigations.find(({ id, status }) => id === item.id && status === "proposed"));
  const destination = queued?.effects.find((effect) => effect.type === "move_asset")?.area;
  const destinationName = useTwinStore((state) => state.twin.areas.find(({ id }) => id === destination)?.name);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const { riskDelta, lossDeltaPerYear } = item.predicted;
  const title = item.title.trim().split(/\s+/).slice(0, 4).join(" ");
  const risk = `${riskDelta > 0 ? "+" : riskDelta < 0 ? "−" : ""}${formatNumber(Math.abs(riskDelta))}`;
  const drawings = item.purchase ? [item.purchase] : item.assets;
  const where = item.purchase?.where ?? item.where ?? destinationName ?? destination;

  async function approve() {
    setPending(true);
    setMessage("");
    try {
      if (await item.apply() === false) setMessage("Action is no longer available.");
    } catch {
      setMessage("Could not approve this action.");
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="pw-todo-card">
      <div className="pw-todo-main">
        {!!drawings.length && <div className="pw-todo-drawings">
          {drawings.map((drawing) => <span className="pw-todo-drawing" key={"id" in drawing ? drawing.id : drawing.name}
            title={drawing.name} role="img" aria-label={drawing.name}><LossGlyph kind={drawing.kind} size={36} /></span>)}
        </div>}
        <strong className="pw-todo-title" title={item.title}>{title}</strong>
        <button type="button" className="pw-panel-button pw-todo-approve" disabled={pending} onClick={() => void approve()}
          aria-label={`Approve ${title}`}><Check size={14} aria-hidden />{pending ? "Approving…" : "Approve"}</button>
      </div>
      <div className="pw-todo-meta">
        <span className="pw-todo-metric" data-benefit={riskDelta < 0} title="Predicted risk score change">{risk} risk</span>
        <span className="pw-todo-metric" data-benefit={lossDeltaPerYear < 0} title="Predicted annual loss change · simulated plant">
          {lossDeltaPerYear > 0 ? "+" : ""}{formatUsd(lossDeltaPerYear)}/yr
        </span>
        {item.source === "simulation" && <span className="pw-todo-basis">Simulation</span>}
      </div>
      {(item.purchase || where || item.description || item.assets.length > 0 || queued) &&
        <Disclosure className="pw-rail-more" label="See more">
          {item.description && <p>{item.description}</p>}
          {item.purchase && <p><ShoppingCart size={13} aria-hidden /> <strong>{item.purchase.name}</strong><br />
            {[kindLabel(item.purchase.kind), ...(item.purchase.features ?? [])].join(" · ")}</p>}
          {where && <p><MapPin size={12} aria-hidden /> <strong>Where it goes</strong> {where}</p>}
          {item.assets.map((asset) => <AssetDetails key={asset.id} item={asset} />)}
          {queued && <button type="button" className="pw-panel-button" aria-label={`Reject ${title}`}
            onClick={() => useTwinStore.getState().decideMitigation(item.id, "rejected")}>Reject</button>}
        </Disclosure>}
      {message && <p className="pw-panel-muted" role="status">{message}</p>}
    </li>
  );
}

export function TodoSection({ items }: { items: readonly Todo[] }) {
  const mitigations = useTwinStore((state) => state.mitigations);
  const decided = mitigations.filter(({ status }) => status !== "proposed");
  const more = items.length - VISIBLE_ACTIONS;
  return (
    <section className="pw-panel-section pw-rail-section pw-panel-mitigation-groups" data-pane="todo">
      <PanelHeading icon={ListChecks} aside={<span className="pw-rail-count pw-mono">{items.length}</span>}>To-do</PanelHeading>
      {items.length ? <>
        <p className="pw-todo-basis">Predicted changes · simulated plant</p>
        <ol className="pw-todo-list">
          {items.slice(0, VISIBLE_ACTIONS).map((item) => <TodoCard key={item.id} item={item} />)}
        </ol>
        {more > 0 && <Disclosure className="pw-rail-more" label={more === 1 ? "1 more action" : `${more} more actions`}>
          <ol className="pw-todo-list" start={VISIBLE_ACTIONS + 1}>
            {items.slice(VISIBLE_ACTIONS).map((item) => <TodoCard key={item.id} item={item} />)}
          </ol>
        </Disclosure>}
      </>
        : <p className="pw-panel-muted">No pending actions.</p>}
      {decided.length > 0 && <Disclosure className="pw-rail-more" label="Decision history"><MitigationQueue items={decided} label="Decisions" /></Disclosure>}
    </section>
  );
}
