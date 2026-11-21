/** Opens existing plant surfaces from an update row. */
import { useTranscriptStore } from "@/transcript/transcriptStore";
import { useTwinStore } from "@/twin/store";
import type { TickerItem } from "./items";

function openPanel(content: string, controller?: string) {
  const control = controller ? document.querySelector<HTMLButtonElement>(controller) : undefined;
  if (control?.getClientRects().length && control.getAttribute("aria-expanded") === "false") control.click();
  requestAnimationFrame(() => {
    const target = document.querySelector<HTMLElement>(content);
    if (!target?.getClientRects().length) return;
    target.scrollIntoView({ block: "nearest" });
    if (target.tabIndex < 0) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });
}

export function openTickerItem(item: TickerItem) {
  const { twin, select } = useTwinStore.getState();
  if (item.assetId && twin.assets.some(({ id }) => id === item.assetId)) {
    select(item.assetId);
    return;
  }

  if (item.source === "news") {
    openPanel("#pw-watch > summary", 'button[aria-controls="pw-watch"]');
  } else if (item.source === "detection" || item.id.startsWith("pipeline:")) {
    const runId = item.id.replace(/^(?:capture:|pipeline:\d+:)/, "");
    useTranscriptStore.getState().open({ runId, at: item.at });
  } else if (item.id.startsWith("mitigation:")) {
    openPanel(".pw-panel-mitigation-groups", 'button[aria-controls="pw-results"]');
  } else if (item.id.startsWith("simulation:")) {
    openPanel(".pw-sim-controls");
  } else {
    const alert = 'section[aria-label="Escalation alert"]';
    if (document.querySelector(alert)) openPanel(alert);
    else openPanel('section[aria-label="Escalation settings"]', 'button[aria-label="Escalation thresholds"]');
  }
}
