/** Checks the content-type gate and that the byte limit holds without a Content-Length header. */
import { describe, expect, it } from "vitest";
import { BodyError, readBoundedJson } from "./boundedJson";

const json = (body: BodyInit, headers: Record<string, string> = { "Content-Type": "application/json" }) =>
  new Request("http://localhost:4119/api/fit", { method: "POST", headers, body, duplex: "half" } as RequestInit);

function chunked(chunks: string[]) {
  const encoder = new TextEncoder();
  let pulled = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled < chunks.length) controller.enqueue(encoder.encode(chunks[pulled]));
      else controller.close();
      pulled += 1;
    },
  }, { highWaterMark: 0 });
  return { stream, pulled: () => pulled };
}

describe("bounded JSON body", () => {
  it("parses a JSON body within the limit, including a charset parameter", async () => {
    expect(await readBoundedJson(json('{"text":"Línea 3"}', { "Content-Type": "application/json; charset=utf-8" }), 64))
      .toEqual({ text: "Línea 3" });
  });

  it("refuses content types a cross-site form or no-cors fetch can send", async () => {
    for (const type of ["text/plain", "application/x-www-form-urlencoded", "multipart/form-data; boundary=x"]) {
      await expect(readBoundedJson(json("{}", { "Content-Type": type }), 64)).rejects.toMatchObject({ status: 415 });
    }
    await expect(readBoundedJson(new Request("http://localhost/x", { method: "POST" }), 64)).rejects.toBeInstanceOf(BodyError);
  });

  it("rejects a declared length over the limit before reading", async () => {
    const body = chunked(['{"a":1}']);
    const request = json(body.stream, { "Content-Type": "application/json", "Content-Length": "1000" });
    await expect(readBoundedJson(request, 64)).rejects.toMatchObject({ status: 413 });
    expect(body.pulled()).toBe(0);
  });

  it("stops reading a chunked body once it passes the limit", async () => {
    const body = chunked(Array.from({ length: 1_000 }, () => "x".repeat(32)));
    await expect(readBoundedJson(json(body.stream), 64)).rejects.toMatchObject({ status: 413 });
    expect(body.pulled()).toBeLessThan(10);
  });

  it("reports malformed JSON and a missing body as 400", async () => {
    await expect(readBoundedJson(json("{not json"), 64)).rejects.toMatchObject({ status: 400 });
    const empty = new Request("http://localhost/x", { method: "POST", headers: { "Content-Type": "application/json" } });
    await expect(readBoundedJson(empty, 64)).rejects.toMatchObject({ status: 400 });
  });
});
