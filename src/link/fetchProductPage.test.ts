/**
 * Unit tests for main image download (src/link/image.ts) and end-to-end
 * product page orchestration (src/link/fetchProductPage.ts). No live network.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { isLinkConnectionFailure } from "./errors";
import { fetchProductPage, LinkFetchError } from "./fetchProductPage";
import { fetchMainImage } from "./image";
import type { DnsLookupFn } from "./safeFetch";

const publicDns: DnsLookupFn = async () => [{ address: "93.184.216.34", family: 4 }];

// Minimal valid magic-byte payloads for JPEG, PNG, and WebP.
const TINY_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const TINY_JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const TINY_WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

describe("fetchMainImage", () => {
  it("downloads JPEG, PNG, and WebP images as base64 CaptureImage", async () => {
    const samples: Array<[string, Uint8Array<ArrayBuffer>, string]> = [
      ["image/jpeg; charset=binary", TINY_JPEG, "image/jpeg"],
      ["image/png", TINY_PNG, "image/png"],
      ["image/webp", TINY_WEBP, "image/webp"],
    ];

    for (const [contentType, bytes, expectedMime] of samples) {
      const fetchMock = vi.fn<typeof fetch>(async () =>
        new Response(bytes, { status: 200, headers: { "content-type": contentType } }),
      );
      const image = await fetchMainImage("https://cdn.example.com/item.img", {
        fetchImpl: fetchMock,
        dnsLookup: publicDns,
      });
      expect(image).toEqual({
        mimeType: expectedMime,
        dataBase64: Buffer.from(bytes).toString("base64"),
      });
    }
  });

  it("returns null for unsupported MIME types, blocked hosts, or oversized images", async () => {
    const svgFetch = vi.fn<typeof fetch>(async () =>
      new Response("<svg></svg>", { status: 200, headers: { "content-type": "image/svg+xml" } }),
    );
    expect(
      await fetchMainImage("https://cdn.example.com/icon.svg", {
        fetchImpl: svgFetch,
        dnsLookup: publicDns,
      }),
    ).toBeNull();

    const hugeFetch = vi.fn<typeof fetch>(async () =>
      new Response(TINY_PNG, {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(5 * 1024 * 1024) },
      }),
    );
    expect(
      await fetchMainImage("https://cdn.example.com/huge.png", {
        fetchImpl: hugeFetch,
        dnsLookup: publicDns,
      }),
    ).toBeNull();

    expect(
      await fetchMainImage("http://127.0.0.1/secret.png", {
        fetchImpl: svgFetch,
        dnsLookup: publicDns,
      }),
    ).toBeNull();
  });
});

describe("fetchProductPage", () => {
  it("rejects an already aborted capture without resolving DNS or fetching", async () => {
    const controller = new AbortController();
    controller.abort(new Error("Capture canceled"));
    const dnsLookup = vi.fn(publicDns);
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(fetchProductPage("https://shop.example.com/gauge", { signal: controller.signal, dnsLookup, fetchImpl }))
      .rejects.toBe(controller.signal.reason);
    expect(dnsLookup).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("stops waiting on DNS after canceling the capture", async () => {
    const controller = new AbortController();
    const dnsLookup = vi.fn<DnsLookupFn>(() => new Promise(() => undefined));
    const fetchImpl = vi.fn<typeof fetch>();
    const page = fetchProductPage("https://shop.example.com/gauge", { signal: controller.signal, dnsLookup, fetchImpl });
    expect(dnsLookup).toHaveBeenCalledOnce();
    controller.abort(new Error("Capture canceled"));
    await expect(page).rejects.toBe(controller.signal.reason);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each(["html", "image"] as const)("cancels a stalled %s response body and propagates the abort", async (stage) => {
    const controller = new AbortController();
    let startRead!: () => void;
    const started = new Promise<void>((resolve) => { startRead = resolve; });
    const cancelBody = vi.fn();
    const fetchImpl = vi.fn<typeof fetch>(async (input) => {
      if (stage === "image" && String(input).endsWith("/gauge")) {
        return new Response('<html><head><meta property="og:image" content="/gauge.png"></head></html>', {
          headers: { "Content-Type": "text/html" },
        });
      }
      const body = new ReadableStream<Uint8Array>({ pull: startRead, cancel: cancelBody }, { highWaterMark: 0 });
      return new Response(body, { headers: { "Content-Type": stage === "html" ? "text/html" : "image/png" } });
    });
    const page = fetchProductPage("https://shop.example.com/gauge", { signal: controller.signal, dnsLookup: publicDns, fetchImpl });
    await started;
    controller.abort(new Error("Capture canceled"));
    await expect(page).rejects.toBe(controller.signal.reason);
    expect(cancelBody).toHaveBeenCalledExactlyOnceWith(controller.signal.reason);
  });

  it("fetches HTML, extracts fields, downloads main image, and returns LinkSnapshot", async () => {
    const html = readFileSync(resolve(import.meta.dirname, "__fixtures__", "camera-jsonld.html"), "utf-8");

    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const target = String(input);
      if (target === "https://shop.example.com/products/c420") {
        return new Response(html, {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      if (target === "https://cdn.example.com/cams/c420-hero.webp") {
        return new Response(TINY_WEBP, {
          status: 200,
          headers: { "content-type": "image/webp" },
        });
      }
      return new Response("Not found", { status: 404 });
    });

    const snapshot = await fetchProductPage("https://shop.example.com/products/c420", {
      fetchImpl: fetchMock,
      dnsLookup: publicDns,
    });

    expect(snapshot.url).toBe("https://shop.example.com/products/c420");
    expect(snapshot.title).toBe("NetEye Pro C420 Dual-Band Wi-Fi & PoE Inspection Camera");
    expect(snapshot.specText).toContain("Brand: NetEye");
    expect(snapshot.specText).toContain("Model: C420-POE-WF");
    expect(snapshot.imageUrl).toBe("https://cdn.example.com/cams/c420-hero.webp");
    expect(snapshot.image).toEqual({
      mimeType: "image/webp",
      dataBase64: Buffer.from(TINY_WEBP).toString("base64"),
    });
  });

  it("throws LinkFetchError(not_html) when the target returns non-HTML content", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response("%PDF-1.7", { status: 200, headers: { "content-type": "application/pdf" } }),
    );

    let caught: unknown;
    try {
      await fetchProductPage("https://docs.example.com/datasheet.pdf", {
        fetchImpl: fetchMock,
        dnsLookup: publicDns,
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(LinkFetchError);
    expect((caught as LinkFetchError).code).toBe("not_html");
  });

  it("still succeeds with image=null when the main image fails to download", async () => {
    const html = readFileSync(resolve(import.meta.dirname, "__fixtures__", "meta-only.html"), "utf-8");

    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      if (String(input).endsWith("/gw-900")) {
        return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
      }
      return new Response("Missing", { status: 404 });
    });

    const snapshot = await fetchProductPage("https://celllink.example.com/gw-900", {
      fetchImpl: fetchMock,
      dnsLookup: publicDns,
    });

    expect(snapshot.title).toBe("CellLink GW-900 Industrial 4G LTE Modbus Gateway");
    expect(snapshot.imageUrl).toBe("https://celllink.example.com/og/gw-900.png");
    expect(snapshot.image).toBeNull();
  });

  it.each([true, false])("caps a rich capture thumbnail while retaining sparse visual evidence (%s)", async (rich) => {
    const url = "https://shop.example.com/gauge";
    const html = rich
      ? readFileSync(resolve(import.meta.dirname, "__fixtures__", "camera-jsonld.html"), "utf-8")
      : '<html><head><title>Item</title><meta property="og:image" content="/item.png"></head></html>';
    const image = new Uint8Array(512 * 1024);
    image.set(TINY_PNG);
    const fetchImpl = vi.fn<typeof fetch>(async (input) => String(input) === url
      ? new Response(html, { headers: { "content-type": "text/html" } })
      : new Response(image, { headers: { "content-type": "image/png" } }));
    const snapshot = await fetchProductPage(url, { captureBudget: true, fetchImpl, dnsLookup: publicDns });
    expect(snapshot.imageUrl).toBeTruthy();
    expect(Boolean(snapshot.image)).toBe(!rich);
    const legacy = await fetchProductPage(url, { fetchImpl, dnsLookup: publicDns });
    expect(legacy.image?.dataBase64).toBe(Buffer.from(image).toString("base64"));
  });

  it("retries one transient page failure with a second Accept and language preference", async () => {
    const html = '<html><head><title>Gauge PG-100</title><meta name="description" content="Mechanical pressure gauge rated to 100 psi."></head></html>';
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("Service unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(html, { headers: { "content-type": "text/html" } }));
    const dnsLookup = vi.fn(publicDns);
    const snapshot = await fetchProductPage("https://shop.example.com/gauge", { captureBudget: true, fetchImpl, dnsLookup });
    expect(snapshot.specText).toContain("100 psi");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(dnsLookup).toHaveBeenCalledTimes(2);
    const [first, retry] = fetchImpl.mock.calls.map(([, init]) => new Headers(init?.headers));
    expect(first.get("Accept")).not.toEqual(retry.get("Accept"));
    expect(first.get("Accept-Language")).not.toEqual(retry.get("Accept-Language"));
    expect(first.get("User-Agent")).toBe(retry.get("User-Agent"));
  });

  it("limits repeated transient failures to two credential-free requests", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => new Response(null, { status: 503 }));
    await expect(fetchProductPage("https://shop.example.com/gauge", {
      captureBudget: true, fetchImpl, dnsLookup: publicDns,
    })).rejects.toMatchObject({ status: 503 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls.map(([, init]) => init?.credentials)).toEqual(["omit", "omit"]);
  });

  it.each([401, 403, 429])("stops on a site restriction (%s)", async (status) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));
    await expect(fetchProductPage("https://shop.example.com/gauge", {
      captureBudget: true, fetchImpl, dnsLookup: publicDns,
    })).rejects.toMatchObject({ status });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    '<html><head><title>Just a moment...</title><meta name="description" content="Access this product by completing this challenge"></head><body><form id="challenge-form"></form></body></html>',
    '<html><head><title>Store</title></head><body><noscript>You need to enable JavaScript.</noscript><div id="root"></div></body></html>',
    '<html><head><title>Store</title><meta property="og:image" content="/default.png"></head><body><noscript>You need to enable JavaScript.</noscript><div id="root"></div></body></html>',
    '<html><head><title>Empty result</title></head></html>',
  ])("rejects an unreadable page without emitting a product snapshot", async (html) => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(html, { headers: { "content-type": "text/html" } }));
    await expect(fetchProductPage("https://shop.example.com/gauge", {
      captureBudget: true, fetchImpl, dnsLookup: publicDns,
    })).rejects.toMatchObject({ code: "unreadable_product" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

it("only classifies link connection failures as retryable without an HTTP status", async () => {
  const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
  const url = "https://shop.example.com/gauge";
  const failed = await fetchProductPage(url, { fetchImpl, dnsLookup: publicDns }).catch((error: unknown) => error);
  expect(isLinkConnectionFailure(failed)).toBe(true);
  expect(isLinkConnectionFailure(new LinkFetchError("http_error", "Forbidden", { status: 403 }))).toBe(false);
  expect(isLinkConnectionFailure(new LinkFetchError("blocked_host", "Private host"))).toBe(false);
});
