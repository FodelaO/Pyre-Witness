/** Verifies byte-derived MIME, framing and image limits at the server boundary. */
import { expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze/route";
import { SEED_TWIN } from "@/twin/seed";
import { MAX_CAPTURE_IMAGE_BYTES, normalizeCaptureImages } from "./captureImages";
import { captureImageSchema } from "./requests";

const JPEG = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAABP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AS//Z";
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGMQClwKAAGBAQnBRazOAAAAAElFTkSuQmCC";
const WEBP_LOSSY = "UklGRjoAAABXRUJQVlA4IC4AAADQAQCdASoBAAEAAUAmJaACdLoB+AADsAD+9IiH/oSfgk/BJ/CZ/8pV4LG7NgAA";
const WEBP_LOSSLESS = "UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQqEq0tP+BiOh/AAA=";
const WEBP_ALPHA = "UklGRlYAAABXRUJQVlA4WAoAAAAQAAAAAAAAAAAAQUxQSAIAAAAAUFZQOCAuAAAA0AEAnQEqAQABAAFAJiWgAnS6AfgAA7AA/vSIh/6En4JPwSfwmf/KVeCxuzYAAA==";

function image(dataBase64: string) {
  return { mimeType: "application/octet-stream", dataBase64 };
}

it.each([
  ["image/jpeg", JPEG],
  ["image/png", PNG],
  ["image/webp", WEBP_LOSSY],
  ["image/webp", WEBP_LOSSLESS],
  ["image/webp", WEBP_ALPHA],
])("uses %s from actual still-image bytes", (mimeType, base64) => {
  expect(captureImageSchema.parse(image(base64))).toEqual({ mimeType, dataBase64: base64 });
});

it("normalizes unpadded base64 for direct callers and leaves their input intact", () => {
  const unpadded = WEBP_LOSSLESS.slice(0, -1);
  const original = { kind: "photo" as const, images: [image(unpadded)] };
  expect(normalizeCaptureImages(original)).toEqual({
    kind: "photo", images: [{ mimeType: "image/webp", dataBase64: WEBP_LOSSLESS }],
  });
  expect(original.images[0]).toEqual(image(unpadded));
});

it.each([JPEG, PNG, WEBP_LOSSLESS, WEBP_ALPHA])("rejects truncated image data", (base64) => {
  const truncated = Buffer.from(base64, "base64").subarray(0, -2).toString("base64");
  expect(() => captureImageSchema.parse(image(truncated))).toThrow("incomplete or unreadable");
});

it("rejects oversized, unsupported and malformed photos before the provider call", async () => {
  const wide = Buffer.from(PNG, "base64");
  wide.writeUInt32BE(1601, 16);
  expect(() => captureImageSchema.parse(image(wide.toString("base64")))).toThrow("1600 pixels");
  const tooLarge = Buffer.alloc(MAX_CAPTURE_IMAGE_BYTES + 1).toString("base64");
  expect(() => captureImageSchema.parse(image(tooLarge))).toThrow("2 MiB");
  expect(() => captureImageSchema.parse(image(Buffer.from("GIF89a").toString("base64")))).toThrow("still JPEG, PNG, or WebP");
  expect(() => captureImageSchema.parse(image("AR==="))).toThrow("incomplete or unreadable");
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  try {
    const response = POST(new Request("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({ input: { kind: "photo", images: [image(wide.toString("base64"))] }, twin: SEED_TWIN }),
    }));
    expect(await response.text()).toContain("Upload it through the capture card to resize it.");
    expect(fetch).not.toHaveBeenCalled();
  } finally {
    vi.unstubAllGlobals();
  }
});
