/** Checks which browser origins and Host names may call the quota-spending routes. */
import { describe, expect, it } from "vitest";
import { crossOriginRejection, isLocalHost } from "./originGuard";

const request = (headers: Record<string, string>, url = "http://localhost:4119/api/fit") =>
  new Request(url, { method: "POST", headers });

describe("origin guard", () => {
  it("admits the app on localhost and on a LAN address", () => {
    expect(crossOriginRejection(request({ host: "localhost:4119", origin: "http://localhost:4119", "sec-fetch-site": "same-origin" }))).toBeNull();
    expect(crossOriginRejection(request({ host: "192.168.1.20:4119", origin: "http://192.168.1.20:4119" }))).toBeNull();
    expect(crossOriginRejection(request({ host: "[::1]:4119", origin: "http://[::1]:4119" }))).toBeNull();
    expect(crossOriginRejection(request({ host: "LOCALHOST:4119", origin: "http://localhost:4119" }))).toBeNull();
  });

  it("admits non-browser clients that send no Origin, because this is not authentication", () => {
    expect(crossOriginRejection(request({ host: "localhost:4119" }))).toBeNull();
    expect(crossOriginRejection(request({ host: "127.0.0.1:4119" }))).toBeNull();
  });

  it("rejects another site, another port, an opaque origin and a cross-site fetch", async () => {
    const foreign: Record<string, string>[] = [
      { host: "localhost:4119", origin: "https://evil.example" },
      { host: "localhost:4119", origin: "http://localhost:3000" },
      { host: "localhost:4119", origin: "null" },
      { host: "localhost:4119", origin: "http://127.0.0.1:4119" },
      { host: "localhost:4119", "sec-fetch-site": "cross-site" },
      { host: "192.168.1.20:4119", origin: "http://192.168.1.99:4119" },
    ];
    for (const headers of foreign) {
      const response = crossOriginRejection(request(headers));
      expect(response?.status, JSON.stringify(headers)).toBe(403);
    }
    const body = await crossOriginRejection(request(foreign[0]))!.json();
    expect(body).toEqual({ error: "Open Pyre Witness to use this action." });
  });

  it("rejects a public DNS name in Host even when the Origin matches it (DNS rebinding)", () => {
    const rebound = request({ host: "attacker.example:4119", origin: "http://attacker.example:4119", "sec-fetch-site": "same-origin" });
    expect(crossOriginRejection(rebound)?.status).toBe(403);
    expect(crossOriginRejection(request({ host: "localhost.attacker.example:4119" }))?.status).toBe(403);
  });

  it("treats literal addresses and local-only names as local, and nothing else by default", () => {
    for (const host of ["localhost", "localhost:4119", "app.localhost:4119", "127.0.0.1:4119", "10.0.0.7", "[fe80::1]:4119", "pablo-mbp.local:4119", "localhost.:4119"]) {
      expect(isLocalHost(host, ""), host).toBe(true);
    }
    for (const host of ["", "example.com", "example.com:4119", "127.0.0.1.nip.io:4119", "local", "notlocalhost:4119", "1.2.3:80"]) {
      expect(isLocalHost(host, ""), host).toBe(false);
    }
  });

  it("admits extra host names only when they are listed exactly", () => {
    expect(isLocalHost("demo.example.com:443", "demo.example.com, other.example.com")).toBe(true);
    expect(isLocalHost("evil-demo.example.com", "demo.example.com")).toBe(false);
    expect(isLocalHost("example.com", "demo.example.com")).toBe(false);
  });
});
