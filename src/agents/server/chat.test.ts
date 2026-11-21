/** Checks request bounds, deterministic findings and the three streamed conversation modes. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentContext } from "@/agents/context";
import { POST } from "@/app/api/agents/chat/route";
import { MODEL_IDS } from "@/gemini/models";
import { inspectorReply } from "./inspector";
import { agentChatRequestSchema } from "./requests";
import type { AgentChatEvent } from "./turn";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/gemini/transport", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/gemini/transport")>(),
  geminiClients: () => ({ interactions: { create } }),
}));

const context: AgentContext = {
  plant: "North Beverage Facility, Line 3",
  risk: { score: 42, band: "elevated" },
  selected: { id: "PLC-F3", name: "Filler PLC", kind: "plc", area: "Filling" },
  findings: [
    { assetId: "PLC-F3", ruleId: "MGMT-01", title: "Inventory review", severity: 3 },
    { assetId: "HMI-F3", ruleId: "ZONE-01", title: "Segmentation review", severity: 5 },
    { assetId: "PLC-F30", ruleId: "ZONE-03", title: "Zone mismatch", severity: 4 },
    { assetId: "PLC-F3", ruleId: "SAFE-01", title: "Safety case review", severity: 4 },
  ],
  news: [],
  crew: [],
};
const body = { mode: "group", message: "Review the plant", history: [], context };
const reply = (text: string) => ({ status: "completed", output_text: text });
const messages = (events: AgentChatEvent[]) => events.filter((event) => event.type === "message");
const rows = (events: AgentChatEvent[]) => messages(events).map(({ from, to, kind }) => [from, to, kind]);
const prompt = (index: number) => JSON.parse(create.mock.calls[index][0].input);

function request(payload: unknown, headers: HeadersInit = {}) {
  return new Request("http://localhost:4119/api/agents/chat", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload),
  });
}

async function chat(payload: unknown): Promise<AgentChatEvent[]> {
  const response = await POST(request(payload));
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  const frames = (await response.text()).trim().split("\n\n");
  expect(frames.every((frame) => frame.startsWith("data: "))).toBe(true);
  const events: AgentChatEvent[] = frames.map((frame) => JSON.parse(frame.slice(6)));
  expect(events.at(-1)).toEqual({ type: "done" });
  const ids = messages(events).map(({ id }) => id);
  expect(new Set(ids).size).toBe(ids.length);
  return events;
}

beforeEach(() => create.mockReset());

describe("chat admission", () => {
  it("requires a direct recipient and forbids an override on group and chief routes", () => {
    for (const mode of ["group", "chief"]) {
      expect(agentChatRequestSchema.safeParse({ ...body, mode }).success).toBe(true);
      expect(agentChatRequestSchema.safeParse({ ...body, mode, to: "scout" }).success).toBe(false);
    }
    expect(agentChatRequestSchema.safeParse({ ...body, mode: "direct", to: "chief" }).success).toBe(true);
    for (const to of ["group", "unknown", undefined]) {
      expect(agentChatRequestSchema.safeParse({ ...body, mode: "direct", to }).success).toBe(false);
    }
  });

  it("bounds messages, supported history fields and UTF-8 context size", () => {
    const history = Array.from({ length: 20 }, () => ({ from: "user", to: "group", text: "Review" }));
    expect(agentChatRequestSchema.safeParse({ ...body, message: "a".repeat(1000), history }).success).toBe(true);
    for (const patch of [
      { message: "a".repeat(1001) }, { message: " " }, { history: [...history, history[0]] },
      { history: [{ from: "group", to: "user", text: "Invalid sender" }] },
      { history: [{ from: "user", text: "Missing recipient" }] },
      { context: { ...context, plant: "界".repeat(9000) } },
      { context: { ...context, findings: Array(13).fill(context.findings[0]) } },
      { context: { ...context, news: Array(6).fill({ title: "Report", severity: 3 }) } },
    ]) expect(agentChatRequestSchema.safeParse({ ...body, ...patch }).success).toBe(false);
  });

  it("rejects cross-origin and invalid requests before a Gemini call", async () => {
    expect((await POST(request(body, { Origin: "https://example.com" }))).status).toBe(403);
    expect((await POST(request({ ...body, mode: "direct" }))).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("Inspector", () => {
  it("filters exact asset tags and rule IDs case-insensitively", () => {
    const asset = inspectorReply("What about plc-f3?", context);
    expect(asset.split("\n")).toHaveLength(2);
    expect(asset).toContain("PLC-F3 · SAFE-01");
    expect(asset).not.toContain("PLC-F30");
    expect(inspectorReply("Show zone-01", context)).toContain("HMI-F3 · ZONE-01");
    expect(inspectorReply("Check PLC-F300", context)).toBe("No matching rule findings in this snapshot.");
  });

  it("returns the top three without a tag and distinguishes an empty snapshot", () => {
    const top = inspectorReply("What should I review?", context);
    expect(top.split("\n").map((line) => line.match(/\((\d)\/5\)$/)?.[1])).toEqual(["5", "4", "4"]);
    expect(inspectorReply("Any findings?", { ...context, findings: [] })).toBe("No rule findings in this snapshot.");
  });
});

describe("chat turns", () => {
  it("sends a direct reply to the user without routing mentions or other chats", async () => {
    create.mockResolvedValueOnce(reply("Ask @inspector about PLC-F3."));
    const history = [
      { from: "user", to: "chief", text: "Earlier chief question" },
      { from: "chief", to: "group", text: "Earlier group summary" },
    ];
    const events = await chat({ ...body, mode: "direct", to: "chief", history });
    expect(rows(events)).toEqual([["chief", "user", "reply"]]);
    expect(events[0]).toEqual({ type: "typing", agent: "chief" });
    expect(messages(events)[0]).toMatchObject({ engine: MODEL_IDS.chief, latencyMs: expect.any(Number) });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0]).toMatchObject({ model: MODEL_IDS.chief, store: false, generation_config: { thinking_level: "low" } });
    expect(prompt(0).history).toEqual([history[0]]);
  });

  it("answers Inspector direct chat without a model invocation", async () => {
    const events = await chat({ ...body, mode: "direct", to: "inspector" });
    expect(rows(events)).toEqual([["inspector", "user", "reply"]]);
    expect(messages(events)[0].engine).toBe("rules engine");
    expect(create).not.toHaveBeenCalled();
  });

  it("runs Scout and Architect in parallel, keeps the room order and closes with Chief", async () => {
    let scoutAnswered = false;
    let architectStartedFirst = false;
    create.mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      scoutAnswered = true;
      return reply("Capture identified.");
    }).mockImplementationOnce(async () => {
      architectStartedFirst = !scoutAnswered;
      return reply("Review the zone.");
    }).mockResolvedValueOnce(reply("Review placement.\nCheck the rule findings."));
    const events = await chat(body);
    expect(rows(events)).toEqual([
      ["scout", "group", "reply"], ["architect", "group", "reply"],
      ["inspector", "group", "reply"], ["chief", "group", "summary"],
    ]);
    expect(architectStartedFirst).toBe(true);
    expect(create.mock.calls.map(([options]) => options.model)).toEqual([MODEL_IDS.perception, MODEL_IDS.reasoning, MODEL_IDS.chief]);
    expect(prompt(1).turn).toEqual([]);
    expect(prompt(2).turn.map(({ from }: { from: string }) => from)).toEqual(["scout", "architect", "inspector"]);
  });

  it("routes one first-round hop, ignores a consulted agent's mention and a recursive mention", async () => {
    create.mockResolvedValueOnce(reply("@architect: Is PLC-F3 in the right zone?"))
      .mockResolvedValueOnce(reply("@inspector: List findings for PLC-F3."))
      .mockResolvedValueOnce(reply("@scout: More context would help."))
      .mockResolvedValueOnce(reply("Review PLC-F3.\nConfirm the placement."));
    const events = await chat(body);
    expect(rows(events)).toEqual([
      ["scout", "architect", "handoff"], ["architect", "scout", "reply"], ["architect", "group", "reply"],
      ["inspector", "group", "reply"], ["chief", "group", "summary"],
    ]);
    expect(messages(events)[1]).toMatchObject({ engine: MODEL_IDS.reasoning, text: "@scout: More context would help." });
    expect(create).toHaveBeenCalledTimes(4);
    expect(prompt(2)).toMatchObject({ task: "@architect: Is PLC-F3 in the right zone?" });
    expect(prompt(3).turn).toHaveLength(4);
    expect(create.mock.calls[3][0].system_instruction).not.toContain("@agente: pregunta");
  });

  it("does not let first-round agents consult Chief", async () => {
    create.mockResolvedValueOnce(reply("@chief: What should the operator review?"))
      .mockResolvedValueOnce(reply("Review the zone."))
      .mockResolvedValueOnce(reply("Review PLC-F3.\nConfirm the placement."));
    const events = await chat(body);
    expect(rows(events)[0]).toEqual(["scout", "group", "reply"]);
    expect(create.mock.calls[0][0].system_instruction).toContain("a uno de: @architect, @inspector.");
    expect(create).toHaveBeenCalledTimes(3);
  });

  it("declines a second group hop involving an already consulted agent", async () => {
    create.mockResolvedValueOnce(reply("@inspector: Check PLC-F3."))
      .mockResolvedValueOnce(reply("@inspector: Check HMI-F3."))
      .mockResolvedValueOnce(reply("Review PLC-F3.\nConfirm the placement."));
    const events = await chat(body);
    expect(messages(events).filter(({ kind }) => kind === "handoff")).toHaveLength(1);
    expect(messages(events)[2]).toMatchObject({ from: "architect", to: "group", kind: "reply" });
  });

  it("closes the room after a handoff initiated by Chief", async () => {
    create.mockResolvedValueOnce(reply("Capture identified."))
      .mockResolvedValueOnce(reply("Review the zone."))
      .mockResolvedValueOnce(reply("@inspector: Confirm SAFE-01."))
      .mockResolvedValueOnce(reply("Inspector confirmed SAFE-01.\nReview segmentation."));
    const events = await chat(body);
    expect(rows(events)).toEqual([
      ["scout", "group", "reply"], ["architect", "group", "reply"], ["inspector", "group", "reply"],
      ["chief", "inspector", "handoff"], ["inspector", "chief", "reply"], ["chief", "group", "summary"],
    ]);
    expect(prompt(3).turn.at(-1)).toMatchObject({ from: "inspector", to: "chief", text: expect.stringContaining("SAFE-01") });
  });

  it("shows Chief's actual delegations, staff replies to Chief, and only Chief's synthesis to the user", async () => {
    create.mockResolvedValueOnce(reply(JSON.stringify({ delegations: [
      { to: "inspector", text: "Check MGMT-01" }, { to: "scout", text: "Identify the selected device" },
      { to: "scout", text: "Duplicate request" },
    ] }))).mockResolvedValueOnce(reply("PLC-F3 is the filler PLC."))
      .mockResolvedValueOnce(reply("Scout identified PLC-F3; Inspector flagged inventory review."));
    const events = await chat({ ...body, mode: "chief", message: "Brief me on PLC-F3" });
    expect(rows(events)).toEqual([
      ["chief", "scout", "delegation"], ["chief", "inspector", "delegation"],
      ["scout", "chief", "reply"], ["inspector", "chief", "reply"], ["chief", "user", "summary"],
    ]);
    expect(messages(events)[0]).toMatchObject({ engine: MODEL_IDS.chief, text: "@scout: Identify the selected device" });
    expect(messages(events)[3]).toMatchObject({ engine: "rules engine", text: expect.stringContaining("MGMT-01") });
    expect(create.mock.calls[0][0].response_format).toMatchObject({ type: "text", mime_type: "application/json" });
    expect(prompt(1)).toEqual({ context, message: "Identify the selected device" });
    expect(prompt(2).turn.slice(-2)).toMatchObject([{ from: "scout", to: "chief" }, { from: "inspector", to: "chief" }]);
  });

  it("streams an agent error and continues to the rules and summary", async () => {
    create.mockResolvedValueOnce(reply("Capture identified."))
      .mockRejectedValueOnce(Object.assign(new Error("Provider details"), { status: 429 }))
      .mockResolvedValueOnce(reply("Placement was not confirmed.\nReview the rule findings."));
    const events = await chat(body);
    expect(events).toContainEqual({ type: "error", agent: "architect", message: "Gemini is rate limited or out of quota." });
    expect(rows(events)).toEqual([["scout", "group", "reply"], ["inspector", "group", "reply"], ["chief", "group", "summary"]]);
    expect(prompt(2).unavailable).toEqual(["architect"]);
  });

  it("gives the parallel first round all but the Group summary reserve", async () => {
    let elapsed = 0;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => elapsed);
    const timeouts = vi.spyOn(AbortSignal, "timeout");
    create.mockImplementationOnce(async () => { elapsed = 5_800; return reply("Capture identified."); })
      .mockImplementationOnce(async () => { elapsed = 11_000; throw new Error("Provider failure"); })
      .mockResolvedValueOnce(reply("Placement remains unconfirmed.\nReview the rule findings."));
    try {
      expect(rows(await chat(body)).at(-1)).toEqual(["chief", "group", "summary"]);
      expect(timeouts.mock.calls.flat()).toEqual([15_000, 15_000, 14_000]);
    } finally {
      clock.mockRestore();
      timeouts.mockRestore();
    }
  });

  it("budgets time for Chief to plan, consult and synthesize in one turn", async () => {
    let elapsed = 0;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => elapsed);
    const timeouts = vi.spyOn(AbortSignal, "timeout");
    create.mockImplementationOnce(async () => {
      elapsed = 7_800;
      return reply(JSON.stringify({ delegations: [{ to: "scout", text: "Identify the selected device" }] }));
    }).mockImplementationOnce(async () => { elapsed = 13_600; return reply("PLC-F3 is the filler PLC."); })
      .mockResolvedValueOnce(reply("Scout identified PLC-F3."));
    try {
      expect(rows(await chat({ ...body, mode: "chief" }))).toEqual([
        ["chief", "scout", "delegation"], ["scout", "chief", "reply"], ["chief", "user", "summary"],
      ]);
      expect(timeouts.mock.calls.flat()).toEqual([9_000, 7_200, 11_400]);
    } finally {
      clock.mockRestore();
      timeouts.mockRestore();
    }
  });

  it("lets delegated staff answer Chief in parallel and keeps crew order", async () => {
    let scoutAnswered = false;
    let architectStartedFirst = false;
    create.mockResolvedValueOnce(reply(JSON.stringify({ delegations: [
      { to: "architect", text: "Check the PLC-F3 zone" }, { to: "scout", text: "Identify the selected device" },
    ] }))).mockImplementationOnce(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      scoutAnswered = true;
      return reply("PLC-F3 is the filler PLC.");
    }).mockImplementationOnce(async () => {
      architectStartedFirst = !scoutAnswered;
      return reply("The zone needs segmentation review.");
    }).mockResolvedValueOnce(reply("Scout identified PLC-F3; Architect asks for segmentation review."));
    const events = await chat({ ...body, mode: "chief" });
    expect(rows(events)).toEqual([
      ["chief", "scout", "delegation"], ["chief", "architect", "delegation"],
      ["scout", "chief", "reply"], ["architect", "chief", "reply"], ["chief", "user", "summary"],
    ]);
    expect(architectStartedFirst).toBe(true);
  });

  it("removes Markdown emphasis that the plain-text chat would show literally", async () => {
    create.mockResolvedValueOnce(reply("Revisa **PLC-F3** (`plc_cabinet`) y *SAFE-01* (5/5)."));
    const events = await chat({ ...body, mode: "direct", to: "scout" });
    expect(messages(events)[0].text).toBe("Revisa PLC-F3 (plc_cabinet) y SAFE-01 (5/5).");
  });

  it("keeps prompt history compact and marks a reply clipped at 60 words", async () => {
    create.mockResolvedValueOnce(reply(Array.from({ length: 70 }, (_, index) => `w${index}`).join(" ")));
    const history = Array.from({ length: 12 }, (_, index) => ({ from: "user", to: "group", text: `${index}${"x".repeat(900)}` }));
    const events = await chat({ ...body, history });
    expect(prompt(0).history).toHaveLength(8);
    expect(prompt(0).history[0].text).toMatch(/^4x+$/);
    expect(prompt(0).history.every(({ text }: { text: string }) => text.length <= 600)).toBe(true);
    const text = messages(events)[0].text;
    expect(text.split(" ")).toHaveLength(60);
    expect(text.endsWith("w59…")).toBe(true);
  });

  it("aborts the in-flight Gemini request when the stream is cancelled", async () => {
    create.mockImplementationOnce(() => new Promise(() => undefined));
    const response = await POST(request({ ...body, mode: "direct", to: "scout" }));
    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel();
    expect(create.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
