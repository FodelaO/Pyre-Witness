/**
 * Tiny typed event bus for pipeline events (browser side).
 * The API client pushes every server event here via useRunStore.ingest(); the crew avatars,
 * activity feed and floor effects subscribe. No feature should poll or use timers to fake steps.
 */
import type { PipelineEvent } from "./types";

type Listener = (event: PipelineEvent) => void;

const listeners = new Set<Listener>();

export const pipelineBus = {
  on(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit(event: PipelineEvent): void {
    for (const listener of [...listeners]) {
      try {
        listener(event);
      } catch (error) {
        console.error("[pipelineBus] listener failed", error);
      }
    }
  },
};
