/**
 * Unit tests for pure HTML product extraction (src/link/extract.ts).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractProductInfo, MAX_SPEC_TEXT_CHARS } from "./extract";

const fixture = (name: string) =>
  readFileSync(resolve(import.meta.dirname, "__fixtures__", name), "utf-8");

describe("extractProductInfo", () => {
  it("extracts title, spec table, features, and relative main image from tank fixture", () => {
    const html = fixture("tank-spec-table.html");
    const result = extractProductInfo(html, "https://vessels.example.com/catalog/tanks/vt-5000");

    expect(result.title).toBe("Vortex Sanitary Mixing Tank VT-5000 | Industrial Process Vessels");
    expect(result.description).toContain("5000 L food-grade 316L stainless steel");
    expect(result.imageUrl).toBe("https://vessels.example.com/catalog/media/vt-5000-front.jpg");

    expect(result.specText).toContain("Capacity: 5,000 L");
    expect(result.specText).toContain("Wetted Material: AISI 316L Stainless Steel (Ra <= 0.4 um)");
    expect(result.specText).toContain("Food Grade Compliance: FDA 21 CFR 177.2600 / 3-A Sanitary");
    expect(result.specText).toContain("Ingress Protection (Agitator Drive): IP66 washdown rated");
    expect(result.specText).toContain("Electropolished interior with sloped bottom drain");

    // Duplicate "Capacity: 5,000 L" from features list should be deduplicated.
    const capacityOccurrences = result.specText.match(/Capacity: 5,000 L/gi) ?? [];
    expect(capacityOccurrences).toHaveLength(1);

    // Nav and footer list items must not leak into specs.
    expect(result.specText).not.toContain("Privacy Policy");
    expect(result.specText).not.toContain("Terms of Service");
  });

  it("extracts JSON-LD Product fields, og tags, definition list, and features from camera fixture", () => {
    const html = fixture("camera-jsonld.html");
    const result = extractProductInfo(html, "https://shop.example.com/products/c420");

    expect(result.title).toBe("NetEye Pro C420 Dual-Band Wi-Fi & PoE Inspection Camera");
    expect(result.imageUrl).toBe("https://cdn.example.com/cams/c420-hero.webp");

    expect(result.specText).toContain("Brand: NetEye");
    expect(result.specText).toContain("Model: C420-POE-WF");
    expect(result.specText).toContain("SKU: NE-C420-US");
    expect(result.specText).toContain("Wireless: Wi-Fi 802.11ac, Bluetooth LE");
    expect(result.specText).toContain("Power: 12 W (PoE+ 802.3at)");
    expect(result.specText).toContain("Network Interface: 1x RJ45 100/1000 Mbps Ethernet (PoE+)");
    expect(result.specText).toContain("Cloud remote viewing enabled out of the box");

    // Duplicate "Ingress Protection: IP67" across JSON-LD and <dl> is deduplicated.
    const ipOccurrences = result.specText.match(/Ingress Protection: IP67/gi) ?? [];
    expect(ipOccurrences).toHaveLength(1);
  });

  it("extracts title, description, and relative og:image from meta-only SPA fixture", () => {
    const html = fixture("meta-only.html");
    const result = extractProductInfo(html, "https://celllink.example.com/gw-900");

    expect(result.title).toBe("CellLink GW-900 Industrial 4G LTE Modbus Gateway");
    expect(result.description).toContain("DIN-rail cellular router");
    expect(result.specText).toContain("Description: DIN-rail cellular router");
    expect(result.imageUrl).toBe("https://celllink.example.com/og/gw-900.png");
  });

  it("falls back to JSON-LD image and <h1> title when og tags and <title> are absent", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">{ bad json }</script>
          <script type="application/ld+json">
            {
              "@type": "Product",
              "name": "FlowMeter FM-20",
              "image": { "@type": "ImageObject", "contentUrl": "/img/fm20.png" }
            }
          </script>
        </head>
        <body><h1>FlowMeter FM-20 Ultrasonic</h1></body>
      </html>
    `;
    const result = extractProductInfo(html, "https://meters.example.com/fm20");

    expect(result.title).toBe("FlowMeter FM-20 Ultrasonic");
    expect(result.imageUrl).toBe("https://meters.example.com/img/fm20.png");
  });

  it("normalizes whitespace and caps specText at MAX_SPEC_TEXT_CHARS", () => {
    const rows = Array.from({ length: 250 }, (_, i) =>
      `<tr><th>Parameter ${i}</th><td>Value   with   extra\n\twhitespace   number ${i} (${"x".repeat(30)})</td></tr>`,
    ).join("");
    const html = `<html><head><title>Big Spec</title></head><body><h2>Specifications</h2><table>${rows}</table></body></html>`;

    const result = extractProductInfo(html, "https://example.com/big");

    expect(result.specText.length).toBeLessThanOrEqual(MAX_SPEC_TEXT_CHARS);
    expect(result.specText).not.toContain("   ");
    expect(result.specText).not.toContain("\t");
  });
});
