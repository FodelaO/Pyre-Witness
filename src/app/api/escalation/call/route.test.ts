/** Exercises call admission, Twilio payloads, and redacted responses with no network calls. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as status } from "./[sid]/route";
import { GET as mode, POST } from "./route";

const account = "AC" + "a".repeat(32);
const token = "test-token-for-stub";
const from = "+15550101";
const sid = "CA" + "b".repeat(32);
const number = "+1 555-0100";
const normalized = "+15550100";
const maskedNumber = "+1 ··· ··· 0100";
const script = "This is a Pyre Witness test. TEST-901 & Filler 3.";
const base = "http://localhost:4119/api/escalation/call";
const fetchStub = vi.fn<typeof fetch>();

function configure() {
  vi.stubEnv("TWILIO_ACCOUNT_SID", account);
  vi.stubEnv("TWILIO_AUTH_TOKEN", token);
  vi.stubEnv("TWILIO_FROM_NUMBER", from);
}

function call(override: Record<string, unknown> = {}, origin = "http://localhost:4119") {
  return POST(new Request(base, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ number, script, ...override }),
  }));
}

function poll(id: string = sid, origin = "http://localhost:4119") {
  return status(new Request(base + "/" + id, { headers: { Origin: origin } }), { params: Promise.resolve({ sid: id }) });
}

beforeEach(() => {
  vi.stubEnv("TWILIO_ACCOUNT_SID", "");
  vi.stubEnv("TWILIO_AUTH_TOKEN", "");
  vi.stubEnv("TWILIO_FROM_NUMBER", "");
  vi.stubGlobal("pyreRateLimits", new Map());
  vi.stubGlobal("pyreTelephoneReceipts", new Map());
  vi.stubGlobal("fetch", fetchStub);
  fetchStub.mockReset();
  fetchStub.mockImplementation(async () => Response.json({ sid, status: "queued", to: normalized, from }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("escalation call endpoints", () => {
  it("reports device mode and returns a mask without reaching a provider", async () => {
    expect(await mode(new Request(base)).json()).toEqual({ mode: "device" });
    const response = await call();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ mode: "device", maskedNumber });
    expect(fetchStub).not.toHaveBeenCalled();
  });

  it("posts TwiML and polls only a known SID with no destination in the URLs or JSON", async () => {
    configure();
    expect(await mode(new Request(base)).json()).toEqual({ mode: "twilio" });
    const response = await call();
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ mode: "twilio", sid, status: "queued", maskedNumber });
    const [url, init] = fetchStub.mock.calls[0];
    expect(url).toBe("https://api.twilio.com/2010-04-01/Accounts/" + account + "/Calls.json");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("authorization")).toBe("Basic " + Buffer.from(account + ":" + token).toString("base64"));
    expect(Object.fromEntries(init?.body as URLSearchParams)).toEqual({
      To: normalized, From: from,
      Twiml: "<Response><Say>This is a Pyre Witness test. TEST-901 &amp; Filler 3.</Say>"
        + '<Pause length="1"/><Say>This is a Pyre Witness test. TEST-901 &amp; Filler 3.</Say></Response>',
    });

    fetchStub.mockResolvedValueOnce(Response.json({ sid, status: "completed", duration: "34", to: normalized, from }));
    const complete = await poll();
    expect(await complete.json()).toEqual({ mode: "twilio", sid, status: "completed", durationSeconds: 34, maskedNumber });
    const [pollUrl, pollInit] = fetchStub.mock.calls[1];
    expect(pollUrl).toBe("https://api.twilio.com/2010-04-01/Accounts/" + account + "/Calls/" + sid + ".json");
    expect(pollInit?.body).toBeUndefined();
    expect((await poll("CA" + "f".repeat(32))).status).toBe(404);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it.each(["ringing", "in-progress", "busy", "no-answer", "failed"] as const)("returns a redacted %s status", async (providerStatus) => {
    configure();
    await call();
    fetchStub.mockResolvedValueOnce(Response.json({ sid, status: providerStatus, to: normalized, from }));
    const result = await poll();
    expect(await result.json()).toEqual({
      mode: "twilio", sid, status: providerStatus, maskedNumber,
      ...(providerStatus === "failed" ? { reason: "Twilio could not complete the call." } : {}),
    });
  });

  it("does not forward provider errors or transport details", async () => {
    configure();
    fetchStub.mockResolvedValueOnce(Response.json({ message: normalized + " " + token }, { status: 400 }));
    const rejected = await call();
    expect(rejected.status).toBe(502);
    expect(await rejected.json()).toEqual({ error: "Twilio rejected the call. Check the destination and voice permissions." });
    fetchStub.mockRejectedValueOnce(new Error(normalized + " " + token));
    expect(await (await call()).json()).toEqual({ error: "Twilio could not confirm the call request." });
  });

  it("admits at most three carrier requests in the shared ten-minute window", async () => {
    configure();
    for (let i = 0; i < 3; i++) expect((await call()).status).toBe(201);
    const limited = await call();
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(fetchStub).toHaveBeenCalledTimes(3);
  });

  it("shares the automatic cooldown across requests while keeping a manual action available", async () => {
    configure();
    expect((await call({ automatic: true })).status).toBe(201);
    expect((await call({ automatic: true })).status).toBe(429);
    expect((await call()).status).toBe(201);
    expect(fetchStub).toHaveBeenCalledTimes(2);
  });

  it("validates numbers and rejects foreign origins before spending", async () => {
    configure();
    const invalid = await call({ number: "15550100" });
    expect(invalid.status).toBe(400);
    expect((await invalid.text()).includes("15550100")).toBe(false);
    expect((await call({}, "https://example.invalid")).status).toBe(403);
    expect(mode(new Request(base, { headers: { Host: "example.invalid" } })).status).toBe(403);
    expect((await poll(sid, "https://example.invalid")).status).toBe(403);
    expect(fetchStub).not.toHaveBeenCalled();
  });
});
