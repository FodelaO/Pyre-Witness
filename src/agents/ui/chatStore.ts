/** Keeps the six conversation histories and their in-flight turns in browser memory. */
import { create } from "zustand";
import type { CrewId } from "@/crew/types";
import { postAgentChat, type ChatAddress, type ChatHistoryItem, type ChatMessage } from "./chatStream";

export const CHAT_MESSAGE_LIMIT = 1000;
const HISTORY_LIMIT = 20;

type ThreadId = `direct:${CrewId}` | "group" | "chief";
type ChatEntry = { type: "user"; id: string; text: string; to: ChatHistoryItem["to"] }
  | ChatMessage | { type: "error"; id: string; agent?: CrewId; message: string };

type Thread = { entries: ChatEntry[]; pending: boolean; typing: CrewId | null };
const EMPTY: Thread = { entries: [], pending: false, typing: null };
let nextLocalId = 0;

export const chatThreadId = (address: ChatAddress): ThreadId => address.mode === "direct" ? `direct:${address.to}` : address.mode;

export const useAgentChat = create<{
  threads: Partial<Record<ThreadId, Thread>>;
  send: (address: ChatAddress, input: string) => Promise<void>;
}>((set, get) => ({
  threads: {},
  async send(address, input) {
    const text = input.trim();
    const key = chatThreadId(address);
    const thread = get().threads[key] ?? EMPTY;
    if (!text || text.length > CHAT_MESSAGE_LIMIT || thread.pending) return;
    const change = (update: (thread: Thread) => Thread) => set(({ threads }) => ({
      threads: { ...threads, [key]: update(threads[key] ?? EMPTY) },
    }));
    const append = (entry: ChatEntry) => change((current) => ({ ...current, entries: [...current.entries, entry] }));
    const history = thread.entries.flatMap((entry): ChatHistoryItem[] => {
      if (entry.type === "error") return [];
      return [{ from: entry.type === "user" ? "user" : entry.from, to: entry.to, text: entry.text }];
    }).slice(-HISTORY_LIMIT);
    const to = address.mode === "direct" ? address.to : address.mode;
    const turn = ++nextLocalId;
    change((current) => ({ ...current, pending: true, typing: null,
      entries: [...current.entries, { type: "user", id: `user:${turn}`, text, to }] }));
    let errors = 0;
    try {
      const { readAgentContext } = await import("./chatContext");
      const context = readAgentContext();
      await postAgentChat(address, text, history, context, (event) => {
        if (event.type === "typing") {
          change((current) => ({ ...current, typing: event.agent }));
        } else if (event.type === "message" && event.from !== "user") {
          change((current) => ({ ...current, typing: current.typing === event.from ? null : current.typing,
            entries: [...current.entries, { ...event, id: `${turn}:${event.id}` }] }));
        } else if (event.type === "error") {
          const { agent, message } = event;
          change((current) => ({ ...current, typing: !agent || current.typing === agent ? null : current.typing,
            entries: [...current.entries, { type: "error", id: `error:${turn}:${++errors}`, agent, message }] }));
        }
      });
    } catch {
      append({ type: "error", id: `offline:${turn}`, message: "Agents offline" });
    } finally {
      change((current) => ({ ...current, pending: false, typing: null }));
    }
  },
}));

export function useChatThread(address: ChatAddress) {
  return useAgentChat((state) => state.threads[chatThreadId(address)] ?? EMPTY);
}
