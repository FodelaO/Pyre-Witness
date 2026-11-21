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
interface Assignment { instruction: string; budgetMs?: number; task?: string; staff?: boolean }

// Live Gemini 4 chat calls take roughly 4-10 s each. Independent calls run in parallel and every
// call has a hard timeout that leaves the closing Chief call its reserve, so a turn always ends.
const TURN_MS = { direct: 10_000, group: 25_000, chief: 25_000 } as const;
const CHIEF_SUMMARY_MS = 10_000;
const CHIEF_PLAN_MS = 9_000;
const CHIEF_HANDOFF_MS = 8_000;
const EXTRA_MODEL_MS = 5_000;
const MIN_CALL_MS = 2_000;
const GROUP_LIMIT = 6;
const HISTORY_LINES = 8;
const LINE_CHARS = 600;
// Scout and Architect answer the room together; Chief reads every message before closing it.
const FIRST_ROUND = ["scout", "architect"] as const satisfies readonly ModelAgent[];
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
  const clipLine = ({ from, to, text }: ChatLine): ChatLine => ({ from, to, text: text.slice(0, LINE_CHARS) });
  const history = (request.mode === "direct" ? request.history.filter(({ from, to }) =>
    (from === "user" && to === request.to) || (from === request.to && to === "user")) : request.history)
    .slice(-HISTORY_LINES).map(clipLine);

  function input(task?: string, staff?: boolean): string {
    return JSON.stringify(staff ? { context: request.context, message: task } : {
      context: request.context, message: request.message, history, turn: turn.map(clipLine), task, unavailable: [...unavailable],
    });
  }

  /** Time left in the turn after keeping `reserveMs` for later calls, optionally capped. */
  function remaining(reserveMs = 0, capMs = Infinity): number {
    return Math.min(capMs, deadline - performance.now() - reserveMs);
  }

  function publish(from: CrewId, to: Message["to"], kind: Message["kind"], answer: Answer<string>) {
    if (signal.aborted) return;
    const { value: text, engine, latencyMs } = answer;
    turn.push({ from, to, text });
    emit({ type: "message", id: randomUUID(), from, to, kind, text, engine, latencyMs });
  }

  async function call<T>(agent: ModelAgent, budgetMs: number, work: (callSignal: AbortSignal) => Promise<T>): Promise<Answer<T> | undefined> {
    if (signal.aborted) return;
    const began = performance.now();
    const budget = Math.floor(budgetMs);
    if (budget < MIN_CALL_MS) {
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

  async function ask(agent: CrewId, { instruction, budgetMs, task, staff }: Assignment): Promise<Answer<string> | undefined> {
    if (signal.aborted) return;
    if (agent === "inspector") {
      const began = performance.now();
      const value = inspectorReply(task ?? request.message, request.context);
      return { value, engine: "rules engine", latencyMs: Math.round(performance.now() - began) };
    }
    return call(agent, budgetMs ?? remaining(), (callSignal) => geminiReply(agent, input(task, staff), instruction, callSignal));
  }

  if (request.mode === "direct") {
    const reply = await ask(request.to, { instruction: DIRECT });
    if (reply) publish(request.to, "user", "reply", reply);
    return;
  }

  if (request.mode === "chief") {
    const plan = await call("chief", remaining(CHIEF_SUMMARY_MS, CHIEF_PLAN_MS), (callSignal) => geminiDelegations(input(), callSignal));
    const delegations = CREW_ORDER.flatMap((agent) => plan?.value.find(({ to }) => to === agent) ?? []);
    if (plan) {
      for (const { to, text } of delegations) publish("chief", to, "delegation", { ...plan, value: `@${to}: ${text}` });
    }
    // Staff members answer Chief independently, so their calls share one window in parallel.
    const staffMs = remaining(CHIEF_SUMMARY_MS);
    const replies = delegations.map(({ to, text }) => ask(to, { instruction: HANDOFF, budgetMs: staffMs, task: text, staff: true }));
    for (const [index, pending] of replies.entries()) {
      const reply = await pending;
      if (reply) publish(delegations[index].to, "chief", "reply", reply);
    }
    const summary = await ask("chief", { instruction: CHIEF_SUMMARY });
    if (summary) publish("chief", "user", "summary", summary);
    return;
  }

  const consulted = new Set<CrewId>();
  let extraMessages = GROUP_LIMIT - CREW_ORDER.length;
  // Chief closes the room after reading it, so first-round agents consult only Scout, Architect or Inspector.
  const roundTargets = (agent: CrewId) => CREW_ORDER.filter((member) => member !== agent && member !== "chief");
  // Chief has to wait for the first round anyway, so it may use everything but the summary reserve.
  const firstRoundMs = remaining(CHIEF_SUMMARY_MS);
  const firstRound = FIRST_ROUND.map((agent) =>
    ask(agent, { instruction: groupAssignment(agent, roundTargets(agent)), budgetMs: firstRoundMs }));
  for (const [index, agent] of FIRST_ROUND.entries()) {
    const reply = await firstRound[index];
    if (!reply) continue;
    const open = extraMessages >= 1 && !consulted.has(agent) ? roundTargets(agent).filter((member) => !consulted.has(member)) : [];
    const target = addressedAgent(reply.value, open);
    if (!target) {
      publish(agent, "group", "reply", reply);
      continue;
    }
    consulted.add(agent);
    consulted.add(target);
    extraMessages -= 1;
    publish(agent, target, "handoff", reply);
    const response = await ask(target, { instruction: HANDOFF, budgetMs: remaining(CHIEF_SUMMARY_MS), task: reply.value });
    if (response) publish(target, agent, "reply", response);
  }

  const findings = await ask("inspector", { instruction: DIRECT });
  if (findings) publish("inspector", "group", "reply", findings);

  // A closing handoff uses two extra rows and needs time for Chief to answer again.
  const timeLeft = remaining();
  const targets = extraMessages >= 2 ? CREW_ORDER.filter((member) => member !== "chief" && !consulted.has(member)
    && timeLeft >= CHIEF_HANDOFF_MS + CHIEF_SUMMARY_MS + (member === "inspector" ? 0 : EXTRA_MODEL_MS)) : [];
  const consultationMs = targets.some((target) => target !== "inspector") ? EXTRA_MODEL_MS : 0;
  const closing = await ask("chief", {
    instruction: groupAssignment("chief", targets),
    budgetMs: remaining(targets.length ? CHIEF_SUMMARY_MS + consultationMs : 0),
  });
  if (!closing) return;
  const target = addressedAgent(closing.value, targets);
  if (!target) {
    publish("chief", "group", "summary", closing);
    return;
  }
  publish("chief", target, "handoff", closing);
  const response = await ask(target, { instruction: HANDOFF, budgetMs: remaining(CHIEF_SUMMARY_MS), task: closing.value });
  if (response) publish(target, "chief", "reply", response);
  const summary = await ask("chief", { instruction: groupAssignment("chief", []) });
  if (summary) publish("chief", "group", "summary", summary);
}
