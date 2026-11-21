/** Verifies both upload encodings, project context and early input failures. */
import { describe, expect, it } from "vitest";
import { SEED_TWIN } from "@/twin/seed";
import { modelTwinContext } from "./context";
import { prepareSource } from "./media";
import { readModelRequest } from "./request";

const signal = new AbortController().signal;
const file = new File(["tag,label\nPT-902,Pressure transmitter\n"], "inventory.csv", { type: "text/csv" });
const url = "http://localhost/api/model/ingest";

describe("ingest payload", () => {
  it("accepts multipart with the projected current twin", async () => {
    const body = new FormData();
    body.append("files", file);
    body.append("twin", JSON.stringify(modelTwinContext(SEED_TWIN)));
    const { files, context } = await readModelRequest(new Request(url, { method: "POST", body }), signal);
    expect(context.twin.assets).toHaveLength(SEED_TWIN.assets.length);
    expect(context.reservedIds.has("C-WAN-ENT")).toBe(true);
    expect((await prepareSource(files, signal)).inventoryLines?.[1]).toBe("PT-902,Pressure transmitter");
  });

  it("decodes JSON base64 when no snapshot is supplied", async () => {
    const body = JSON.stringify({ files: [{
      name: file.name, mimeType: file.type, dataBase64: Buffer.from(await file.arrayBuffer()).toString("base64"),
    }] });
    const result = await readModelRequest(new Request(url, { method: "POST", headers: { "Content-Type": "application/json" }, body }), signal);
    expect(result.context.twin).toBe(SEED_TWIN);
    expect(await result.files[0].text()).toBe(await file.text());
  });

  it("rejects oversized and mixed inputs before Gemini, and detects mislabeled files", async () => {
    const request = new Request(url, {
      method: "POST", headers: { "Content-Type": "application/json", "Content-Length": "68000001" }, body: "{}",
    });
    await expect(readModelRequest(request, signal)).rejects.toThrow("too large");
    const bogus = new File(["Not a PNG"], "wrong.png", { type: "image/png" });
    await expect(prepareSource([file, bogus], signal)).rejects.toThrow("one video, PDF or inventory");
    await expect(prepareSource([bogus], signal)).rejects.toThrow("declared format");
  });

  it("rejects a MOV past 60 seconds before upload", async () => {
    const bytes = new ArrayBuffer(36);
    const view = new DataView(bytes);
    view.setUint32(0, 36);
    view.setUint32(4, 0x6d6f6f76); // moov
    view.setUint32(8, 28);
    view.setUint32(12, 0x6d766864); // mvhd
    view.setUint32(28, 1_000);
    view.setUint32(32, 61_000);
    await expect(prepareSource([new File([bytes], "too-long.mov", { type: "video/quicktime" })], signal))
      .rejects.toThrow("Trim the video");
  });
});
