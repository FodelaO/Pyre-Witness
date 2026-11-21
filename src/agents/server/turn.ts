/** Orchestrates direct, group and Chief of staff turns with bounded consultations. */
import { randomUUID } from "node:crypto";
import { CREW_ORDER, type CrewId } from "@/crew/types";
import { providerDiagnostic } from "@/gemini/transport";
import { geminiDelegations, geminiReply } from "./gemini";
import { inspectorReply } from "./inspector";
import { CHAT_MODELS, CHIEF_SUMMARY, groupAssignment, type ModelAgent } from "./personas";
import type { AgentChatRequest, ChatLine } from "./requests";

type Message = ChatLine & { type: "message"; id: string; kind: "reply" | "delegation" | "handoff" | "summary"; engine: string; latencyMs: number };
export type AgentChatEvent = Message | { type: "typing"; agent: CrewId }
  | { type: "error"; agent?: CrewId; message: string } | { type: "done" };

interface Answer<T> { value: T; engine: string; latencyMs: number }
interface Assignment { instruction: string; reserveMs?: number; callsLeft?: number; task?: string; staff?: boolean }

const TURN_MS = { direct: 8_000, group: 25_000, chief: 25_000 } as const;
const CHIEF_SUMMARY_MS = 10_000;
const CHIEF_PLAN_REMAINDER_MS = 15_000;
const CHIEF_HANDOFF_MS = 8_000;
const EXTRA_MODEL_MS = 5_000;
const GROUP_LIMIT = 6;
const DIRECT = "Contesta directamente al operador a partir del contexto actual. Mantente en tu función y responde tú mismo.";
const HANDOFF = "Contesta la consulta del agente que te escribió. Da tu hallazgo sin iniciar otra consulta.";

function addressedAgent(text: string, targets: readonly CrewId[]): CrewId | undefined {
  const tag = text.match(/(?:^|\s)@(scout|architect|inspector|chief)(?![\w-])/i)?.[1].toLowerCase();
  return targets.find((agent) => agent === tag);
}

function modelError(error: unknown, signal: AbortSignal): string {
  if (signal.aborted) return "Gemini timed out.";
  const { status } = providerDiagnostic(error);
  if (status === 429) return "Gemini is rate limited or out of quota.";
  if (status === 401 || status === 403) return "Gemini denied access to this model.";
  return "Gemini could not complete the reply.";
}

export async function runAgentTurn(request: AgentChatRequest, emit: (event: AgentChatEvent) => void, signal: AbortSignal): Promise<void> {
  const started = performance.now();
  const deadline = started + TURN_MS[request.mode];
  const turn: ChatLine[] = [];
  const unavailable = new Set<CrewId>();
  const history = request.mode === "direct" ? request.history.filter(({ from, to }) =>
    (from === "user" && to === request.to) || (from === request.to && to === "user")) : request.history;

  function input(task?: string, staff?: boolean): string {
    return JSON.stringify(staff ? { context: request.context, message: task } : {
      context: request.context, message: request.message, history, turn, task, unavailable: [...unavailable],
    });
  }

  function publish(from: CrewId, to: Message["to"], kind: Message["kind"], answer: Answer<string>) {
    if (signal.aborted) return;
    const { value: text, engine, latencyMs } = answer;
    turn.push({ from, to, text });
    emit({ type: "message", id: randomUUID(), from, to, kind, text, engine, latencyMs });
  }

  async function call<T>(agent: ModelAgent, reserveMs: number, callsLeft: number, work: (callSignal: AbortSignal) => Promise<T>): Promise<Answer<T> | undefined> {
    if (signal.aborted) return;
    const began = performance.now();
    // Protect the final synthesis and share the remaining time among the other calls.
    const budget = Math.floor((deadline - began - reserveMs) / callsLeft);
    if (budget < 1) {
      unavailable.add(agent);
      emit({ type: "error", agent, message: "No time remained for this agent." });
      return;
    }
    const callSignal = AbortSignal.any([signal, AbortSignal.timeout(budget)]);
    try {
      emit({ type: "typing", agent });
      const value = await work(callSignal);
      callSignal.throwIfAborted();
      return { value, engine: CHAT_MODELS[agent], latencyMs: Math.round(performance.now() - began) };
    } catch (error) {
      unavailable.add(agent);
      if (!signal.aborted) emit({ type: "error", agent, message: modelError(error, callSignal) });
    }
  }

  async function ask(agent: CrewId, { instruction, reserveMs = 0, callsLeft = 1, task, staff }: Assignment): Promise<Answer<string> | undefined> {
    if (signal.aborted) return;
    if (agent === "inspector") {
      const began = performance.now();
      const value = inspectorReply(task ?? request.message, request.context);
      return { value, engine: "rules engine", latencyMs: Math.round(performance.now() - began) };
    }
    return call(agent, reserveMs, callsLeft, (callSignal) => geminiReply(agent, input(task, staff), instruction, callSignal));
  }

  if (request.mode === "direct") {
    const reply = await ask(request.to, { instruction: DIRECT });
    if (reply) publish(request.to, "user", "reply", reply);
    return;
  }

  if (request.mode === "chief") {
    const plan = await call("chief", CHIEF_PLAN_REMAINDER_MS, 1, (callSignal) => geminiDelegations(input(), callSignal));
    const delegations = CREW_ORDER.flatMap((agent) => plan?.value.find(({ to }) => to === agent) ?? []);
    if (plan) {
      for (const { to, text } of delegations) publish("chief", to, "delegation", { ...plan, value: `@${to}: ${text}` });
    }
    let callsLeft = delegations.filter(({ to }) => to !== "inspector").length;
    for (const { to, text } of delegations) {
      const reply = await ask(to, { instruction: HANDOFF, reserveMs: CHIEF_SUMMARY_MS, callsLeft, task: text, staff: true });
      if (reply) publish(to, "chief", "reply", reply);
      if (to !== "inspector") callsLeft--;
    }
    const summary = await ask("chief", { instruction: CHIEF_SUMMARY });
    if (summary) publish("chief", "user", "summary", summary);
    return;
  }

  const consulted = new Set<CrewId>();
  let extraMessages = GROUP_LIMIT - CREW_ORDER.length;
  for (const [index, agent] of CREW_ORDER.entries()) {
    const isChief = agent === "chief";
    const callsLeft = 1 + CREW_ORDER.slice(index + 1).filter((member) => member !== "chief" && member !== "inspector").length;
    const timeLeft = deadline - performance.now();
    // A closing handoff uses two extra rows and needs time for Chief to answer again.
    const roomForHandoff = extraMessages >= (isChief ? 2 : 1);
    const targets = roomForHandoff && !consulted.has(agent)
      ? CREW_ORDER.filter((member) => member !== agent && !consulted.has(member)
        && (!isChief || timeLeft >= CHIEF_HANDOFF_MS + CHIEF_SUMMARY_MS + (member === "inspector" ? 0 : EXTRA_MODEL_MS))) : [];
    const instruction = agent === "inspector" ? DIRECT : groupAssignment(agent, targets);
    const reserveMs = !isChief || targets.length ? CHIEF_SUMMARY_MS : 0;
    const consultationMs = isChief && targets.some((target) => target !== "inspector") ? EXTRA_MODEL_MS : 0;
    const reply = await ask(agent, { instruction, callsLeft, reserveMs: reserveMs + consultationMs });
    if (!reply) continue;
    const target = agent === "inspector" ? undefined : addressedAgent(reply.value, targets);
    if (!target) {
      publish(agent, "group", isChief ? "summary" : "reply", reply);
      continue;
    }
    consulted.add(agent);
    consulted.add(target);
    extraMessages -= isChief ? 2 : 1;
    publish(agent, target, "handoff", reply);
    const response = await ask(target, { instruction: HANDOFF, callsLeft, reserveMs, task: reply.value });
    if (response) publish(target, agent, "reply", response);
    if (isChief) {
      const summary = await ask("chief", { instruction: groupAssignment("chief", []) });
      if (summary) publish("chief", "group", "summary", summary);
    }
  }
}
