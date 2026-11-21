/**
 * Unit tests for SSRF host/IP guards, redirect checks, timeout, and size caps
 * in src/link/safeFetch.ts. No live network access.
 */
import { describe, expect, it, vi } from "vitest";
import { LinkFetchError } from "./errors";
import {
  isBlockedHostname,
  isBlockedIp,
  safeFetch,
  validateSafeUrl,
  type DnsLookupFn,
} from "./safeFetch";

const publicDns: DnsLookupFn = async () => [{ address: "93.184.216.34", family: 4 }];

describe("isBlockedIp", () => {
  const cases: Array<[string, boolean, string]> = [
    // Blocked IPv4 ranges
    ["0.0.0.0", true, "0.0.0.0/8 unspecified"],
    ["0.1.2.3", true, "0.0.0.0/8 current network"],
    ["10.0.0.1", true, "10/8 private"],
    ["10.255.255.254", true, "10/8 upper bound"],
    ["100.64.0.1", true, "100.64/10 CGNAT lower"],
    ["100.127.255.254", true, "100.64/10 CGNAT upper"],
    ["127.0.0.1", true, "127/8 loopback"],
    ["127.255.255.254", true, "127/8 loopback upper"],
    ["169.254.169.254", true, "169.254/16 cloud metadata"],
    ["169.254.0.1", true, "169.254/16 link-local"],
    ["172.16.0.1", true, "172.16/12 private lower"],
    ["172.31.255.254", true, "172.16/12 private upper"],
    ["192.0.2.1", true, "TEST-NET-1"],
    ["192.168.0.1", true, "192.168/16 private"],
    ["192.168.255.254", true, "192.168/16 private upper"],
    ["198.18.0.1", true, "benchmarking"],
    ["224.0.0.1", true, "multicast"],
    ["239.255.255.250", true, "multicast SSDP"],
    ["240.0.0.1", true, "reserved"],
    ["255.255.255.255", true, "broadcast"],

    // Allowed public IPv4
    ["1.1.1.1", false, "Cloudflare public"],
    ["8.8.8.8", false, "Google DNS public"],
    ["93.184.216.34", false, "example.com public"],
    ["100.63.255.255", false, "just below CGNAT"],
    ["100.128.0.1", false, "just above CGNAT"],
    ["172.15.255.255", false, "just below 172.16/12"],
    ["172.32.0.1", false, "just above 172.16/12"],
    ["192.167.1.1", false, "just below 192.168/16"],
    ["192.169.1.1", false, "just above 192.168/16"],
    ["169.253.1.1", false, "just below 169.254/16"],

    // Blocked IPv6 ranges
    ["::", true, "IPv6 unspecified"],
    ["::1", true, "IPv6 loopback"],
    ["[::1]", true, "bracketed IPv6 loopback"],
    ["fc00::1", true, "IPv6 ULA fc00::/7"],
    ["fd12:3456:789a::1", true, "IPv6 ULA fd00::/8"],
    ["fe80::1", true, "IPv6 link-local"],
    ["febf::1", true, "IPv6 link-local upper"],
    ["fe80::1%eth0", true, "IPv6 link-local with zone ID"],
    ["ff02::1", true, "IPv6 multicast"],
    ["2001:db8::1", true, "IPv6 documentation"],
    ["::ffff:127.0.0.1", true, "IPv4-mapped loopback"],
    ["::ffff:7f00:1", true, "IPv4-mapped loopback hex"],
    ["::ffff:169.254.169.254", true, "IPv4-mapped metadata"],
    ["::ffff:10.0.0.5", true, "IPv4-mapped private"],
    ["64:ff9b::192.168.1.1", true, "NAT64 private"],
    ["2002:7f00:0001::1", true, "6to4 loopback"],

    // Allowed public IPv6
    ["2606:2800:220:1:248:1893:25c8:1946", false, "example.com IPv6"],
    ["2001:4860:4860::8888", false, "Google public IPv6"],
    ["::ffff:93.184.216.34", false, "IPv4-mapped public IPv4"],
  ];

  it.each(cases)("%s -> blocked=%s (%s)", (ip, expected) => {
    expect(isBlockedIp(ip)).toBe(expected);
  });
});

describe("isBlockedHostname", () => {
  const cases: Array<[string, boolean]> = [
    ["localhost", true],
    ["LOCALHOST.", true],
    ["api.localhost", true],
    ["printer.local", true],
    ["metadata.google.internal", true],
    ["db.internal", true],
    ["router.home.arpa", true],
    ["127.0.0.1", true],
    ["[::1]", true],
    ["www.endress.com", false],
    ["catalog.siemens.com", false],
    ["localhost-shop.example.com", false],
  ];

  it.each(cases)("%s -> blocked=%s", (host, expected) => {
    expect(isBlockedHostname(host)).toBe(expected);
  });
});

describe("validateSafeUrl", () => {
  it("rejects non-http(s) schemes and embedded credentials", async () => {
    await expect(validateSafeUrl("file:///etc/passwd", publicDns)).rejects.toMatchObject({
      code: "invalid_url",
    });
    await expect(validateSafeUrl("ftp://files.example.com/spec.pdf", publicDns)).rejects.toMatchObject({
      code: "invalid_url",
    });
    await expect(validateSafeUrl("https://user:pass@example.com/item", publicDns)).rejects.toMatchObject({
      code: "invalid_url",
    });
    await expect(validateSafeUrl("not a url", publicDns)).rejects.toMatchObject({
      code: "invalid_url",
    });
  });

  it("blocks integer/hex loopback encodings normalized by WHATWG URL", async () => {
    await expect(validateSafeUrl("http://2130706433/", publicDns)).rejects.toMatchObject({
      code: "blocked_host",
    });
    await expect(validateSafeUrl("http://0x7f000001/", publicDns)).rejects.toMatchObject({
      code: "blocked_host",
    });
  });

  it("blocks hostnames that resolve to any private IP (dual-stack check)", async () => {
    const mixedDns: DnsLookupFn = async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "fd00::1", family: 6 },
    ];
    await expect(validateSafeUrl("https://dual.example.com/prod", mixedDns)).rejects.toMatchObject({
      code: "blocked_host",
    });
  });
});

describe("safeFetch", () => {
  it("sends browser-like headers, omits credentials, and returns body for public URLs", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("user-agent")).toContain("Mozilla/5.0");
      expect(headers.get("accept-language")).toContain("en-US");
      expect(headers.get("cookie")).toBeNull();
      expect(headers.get("authorization")).toBeNull();
      expect(init?.credentials).toBe("omit");
      expect(init?.redirect).toBe("manual");
      return new Response("<html><body>ok</body></html>", {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    });

    const res = await safeFetch("https://catalog.example.com/pump", {
      maxBytes: 1024,
      fetchImpl: fetchMock,
      dnsLookup: publicDns,
    });

    expect(res.finalUrl).toBe("https://catalog.example.com/pump");
    expect(res.status).toBe(200);
    expect(new TextDecoder().decode(res.body)).toContain("ok");
  });

  it("follows up to 3 redirects and re-validates each hop", async () => {
    let calls = 0;
    const fetchMock = vi.fn<typeof fetch>(async (url) => {
      calls++;
      if (calls <= 3) {
        return new Response(null, {
          status: 302,
          headers: { location: `/hop-${calls}` },
        });
      }
      return new Response("<html>done</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    });

    const res = await safeFetch("https://catalog.example.com/start", {
      maxBytes: 1024,
      fetchImpl: fetchMock,
      dnsLookup: publicDns,
    });

    expect(calls).toBe(4);
    expect(res.finalUrl).toBe("https://catalog.example.com/hop-3");
  });

  it("rejects more than 3 redirects", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(null, { status: 302, headers: { location: "https://catalog.example.com/loop" } }),
    );

    await expect(
      safeFetch("https://catalog.example.com/start", {
        maxBytes: 1024,
        fetchImpl: fetchMock,
        dnsLookup: publicDns,
      }),
    ).rejects.toMatchObject({ code: "http_error" });
  });

  it("blocks redirect hops pointing to private metadata IPs", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(null, {
        status: 301,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      }),
    );

    await expect(
      safeFetch("https://catalog.example.com/start", {
        maxBytes: 1024,
        fetchImpl: fetchMock,
        dnsLookup: publicDns,
      }),
    ).rejects.toMatchObject({ code: "blocked_host" });
  });

  it("enforces streaming response size cap even without Content-Length", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(600));
        controller.enqueue(new Uint8Array(600));
        controller.close();
      },
    });

    const fetchMock = vi.fn<typeof fetch>(async () =>
      new Response(stream, { status: 200, headers: { "content-type": "text/html" } }),
    );

    await expect(
      safeFetch("https://catalog.example.com/huge", {
        maxBytes: 1000,
        fetchImpl: fetchMock,
        dnsLookup: publicDns,
      }),
    ).rejects.toMatchObject({ code: "too_large" });
  });

  it("throws LinkFetchError with code timeout when request exceeds timeoutMs", async () => {
    const fetchMock = vi.fn<typeof fetch>((_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(init.signal?.reason ?? new Error("aborted"));
        });
      }),
    );

    let caught: unknown;
    try {
      await safeFetch("https://slow.example.com/page", {
        maxBytes: 1024,
        timeoutMs: 40,
        fetchImpl: fetchMock,
        dnsLookup: publicDns,
      });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(LinkFetchError);
    expect((caught as LinkFetchError).code).toBe("timeout");
  });
});
