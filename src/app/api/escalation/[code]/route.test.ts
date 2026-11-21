/** Exercises the live relay protocol without disclosing the destination on either event stream. */
import { expect, it } from "vitest";
import { DESK_KEY, PHONE_KEY, type PairingSnapshot } from "@/escalation/protocol";
import { GET, POST } from "./route";

it("returns the private dial link only in the paired handset's POST response", async () => {
  const code = "a".repeat(24);
  const desk = { [DESK_KEY]: "d".repeat(32) };
  const phone = { [PHONE_KEY]: "e".repeat(32) };
  const outsider = { [PHONE_KEY]: "f".repeat(32) };
  const url = "http://localhost:4119/api/escalation/" + code;
  const context = { params: Promise.resolve({ code }) };
  const number = "+15550100";
  const post = (client: Record<string, string>, command: object) => POST(new Request(url, {
    method: "POST", headers: { ...client, "Content-Type": "application/json" }, body: JSON.stringify(command),
  }), context);
  const get = (headers: Record<string, string>) => GET(new Request(url, { headers }), context);
  const id = "e-test-1";
  expect((await post(desk, { type: "pair" })).status).toBe(204);
  expect((await post(desk, { type: "ring",
    alert: { id, kind: "finding", test: true, tag: "TEST-901", room: "Filler 3", title: "Wireless within untrusted reach",
      loss: 290_000, action: "Remove the test gateway", script: "This is a Pyre Witness test.", canApprove: true },
    destination: { number, name: "Presenter" },
  })).status).toBe(204);
  const desktopStream = (await get(desk)).body!.getReader();
  const phoneStream = (await get(phone)).body!.getReader();
  try {
    const frames = await Promise.all([desktopStream.read(), phoneStream.read()]);
    const messages = frames.map(({ value }) => new TextDecoder().decode(value));
    for (const message of messages) {
      expect(message).not.toContain(number);
      expect(message).not.toContain("Presenter");
    }
    const snapshot = JSON.parse(messages[1].slice(6)) as PairingSnapshot;
    const getTarget = { type: "dial-target", id, version: snapshot.call?.destinationVersion };
    expect((await post(desk, getTarget)).status).toBe(404);
    expect((await post(outsider, getTarget)).status).toBe(404);
    const target = await post(phone, getTarget);
    expect(target.headers.get("cache-control")).toBe("no-store");
    expect(await target.json()).toEqual({ href: "tel:" + number, label: "Call Presenter · +1 ··· 0100" });
    expect((await post(phone, { type: "dial", id })).status).toBe(204);
    expect((await post(phone, getTarget)).status).toBe(404);
    const update = new TextDecoder().decode((await phoneStream.read()).value);
    expect(update).toContain("dialedAt");
    expect(update).not.toContain(number);
  } finally {
    await Promise.all([desktopStream.cancel(), phoneStream.cancel()]);
  }
});
