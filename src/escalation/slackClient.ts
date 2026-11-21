/** Sends each new escalation to Slack once per tab and records its result for the card. */
"use client";

import { create } from "zustand";
import { useEscalationStore } from "./store";
import type { EscalationRecord } from "./types";

type SlackStatus = "pending" | "sent" | "not set" | "failed";
export const useSlackStatuses = create<Record<string, SlackStatus>>(() => ({}));

async function postAlert({ trigger, action }: EscalationRecord): Promise<SlackStatus> {
  try {
    const response = await fetch("/api/escalation/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetTag: trigger.assetId ?? "Line 3",
        assetName: trigger.assetName ?? "Bottling line",
        lossUsd: trigger.loss,
        risk: trigger.score,
        action,
        test: trigger.test === true,
      }),
    });
    if (!response.ok) return "failed";
    const result = await response.json();
    if (result?.sent === true) return "sent";
    if (result?.reason === "not-configured") return "not set";
  } catch {
    // The Slack receipt is independent of the call.
  }
  return "failed";
}

export function monitorSlackAlerts() {
  function sendNewAlerts(records: readonly EscalationRecord[]) {
    for (const record of records) {
      if (record.level !== 2 || record.resolvedAt || record.dismissedAt || useSlackStatuses.getState()[record.id]) continue;
      useSlackStatuses.setState({ [record.id]: "pending" });
      void postAlert(record).then((status) => useSlackStatuses.setState({ [record.id]: status }));
    }
  }

  sendNewAlerts(useEscalationStore.getState().records);
  return useEscalationStore.subscribe((current, previous) => {
    if (current.records.length > previous.records.length) {
      sendNewAlerts(current.records.slice(previous.records.length));
    }
  });
}
