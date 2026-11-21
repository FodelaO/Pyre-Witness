/** Shows an observed item, its cited evidence and the exact proposed change. */
"use client";

import { Check, X } from "lucide-react";
import { Equipment, FOOTPRINT } from "@/equipment";
import type { Asset, Twin } from "@/twin/types";
import type { ModelVote } from "./modelerStore";
import type { ModelItem, ModelUpdate } from "./types";

type Props = {
  item: ModelItem;
  twin: Twin;
  addition?: Asset;
  update?: ModelUpdate;
  vote?: ModelVote;
  onVote: (vote: "accept" | "reject") => void;
  onPreview: (active: boolean) => void;
};

export function ProposalRow({ item, twin, addition, update, vote, onVote, onPreview }: Props) {
  const { w, h } = FOOTPRINT[item.kind];
  const { outcome } = item;
  const asset = outcome.action === "unplaced" ? undefined
    : addition ?? twin.assets.find(({ id }) => id === outcome.assetId);
  const room = twin.areas.find(({ id }) => id === asset?.physical.area)?.name;
  const action = outcome.action === "new_asset" ? "New"
    : outcome.action === "update_existing" ? "Update"
    : outcome.action === "match_existing" ? "Match" : "Unplaced";
  const links = addition?.physical.connections ?? update?.connections ?? [];

  return (
    <li className="pw-model-row" data-vote={vote}
      tabIndex={asset ? 0 : undefined}
      onPointerEnter={() => onPreview(true)} onPointerLeave={() => onPreview(false)}
      onFocus={() => onPreview(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) onPreview(false); }}>
      <svg className="pw-model-glyph" viewBox={`${-w / 2 - 3} ${-h / 2 - 3} ${w + 6} ${h + 6}`} aria-hidden="true">
        <Equipment kind={item.kind} compact />
      </svg>
      <div className="pw-model-row-info">
        <div className="pw-model-label">
          <strong>{item.label}</strong>
          {item.tag && <span className="pw-mono">{item.tag}</span>}
        </div>
        <div className="pw-model-detail">
          {action}{room && asset ? ` · ${room} · L${asset.network.level}` : ""}
          {asset && room !== asset.network.area ? ` · ${asset.network.area}` : ""}
          {asset && outcome.action !== "new_asset" ? ` · ${asset.id}` : ""}
        </div>
        {update?.name && <div className="pw-model-detail">Rename {update.beforeName} → {update.name}</div>}
        {links.length > 0 && (
          <div className="pw-model-detail">Links · {links.map(({ to, medium }) => `${to} (${medium})`).join(", ")}</div>
        )}
        {item.evidence.map(({ locator, detail }) => (
          <div key={locator} className="pw-model-evidence">
            <span className="pw-mono">{locator}</span>
            <span>{detail}</span>
          </div>
        ))}
      </div>
      <div className="pw-model-votes">
        {vote === "applied" ? <span className="pw-model-done"><Check size={15} aria-hidden /> Applied</span>
          : outcome.action !== "unplaced" && <>
            <button type="button" aria-label={`Accept ${item.label}`} title="Accept" aria-pressed={vote === "accept"}
              data-vote="accept" onClick={() => onVote("accept")}><Check size={15} aria-hidden /></button>
            <button type="button" aria-label={`Reject ${item.label}`} title="Reject" aria-pressed={vote === "reject"}
              data-vote="reject" onClick={() => onVote("reject")}><X size={15} aria-hidden /></button>
          </>}
      </div>
    </li>
  );
}
