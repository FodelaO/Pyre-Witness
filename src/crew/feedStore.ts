/** Holds the most recent activity entries across floor and network views. */
import { create } from "zustand";
import type { CrewActivity } from "./director";
import type { ActivityEntry } from "./types";

const CAPACITY = 200;
let sequence = 0;

export const useFeedStore = create<{ entries: ActivityEntry[] }>(() => ({ entries: [] }));

export function appendActivity(activity: CrewActivity): void {
  const entry = { ...activity, id: `crew-${++sequence}` };
  useFeedStore.setState(({ entries }) => ({
    entries: [entry, ...entries].sort((a, b) => b.at - a.at).slice(0, CAPACITY),
  }));
}
