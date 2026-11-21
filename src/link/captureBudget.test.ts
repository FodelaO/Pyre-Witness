/** Verifies that the interactive evidence budget preserves late placement facts. */
import { expect, it } from "vitest";
import { CAPTURE_SPEC_CHARS, compactProductSpecs, hasDocumentedProductSpecs } from "./captureBudget";

it("retains identity and placement specifications ahead of catalog noise", () => {
  const specs = compactProductSpecs([
    "Model: FTL33",
    ...Array.from({ length: 100 }, (_, index) => `File name: document_${index}.pdf`),
    ...Array.from({ length: 100 }, (_, index) => `Sensory feature ${index}: ${"c".repeat(100)}`),
    "Main wetted parts: 316L",
    "Hygienic approvals: EHEDG",
    "Communication: IO-Link",
  ]);
  expect(specs).toContain("Model: FTL33");
  expect(specs).toContain("Main wetted parts: 316L");
  expect(specs).toContain("Hygienic approvals: EHEDG");
  expect(specs).toContain("Communication: IO-Link");
  expect(specs).not.toContain("File name");
  expect(specs.length).toBeLessThanOrEqual(CAPTURE_SPEC_CHARS);
  expect(hasDocumentedProductSpecs("Level switch", specs)).toBe(true);
  expect(hasDocumentedProductSpecs("Level switch", "Model: FTL33\nCommunication: IO-Link")).toBe(false);
});

it("puts structured facts ahead of descriptions carrying overlapping vocabulary", () => {
  const specs = compactProductSpecs([
    ...Array.from({ length: 20 }, (_, index) => `Description: Claim ${index} about power and temperature ${"x".repeat(295)}`),
    "Ingress protection: IP69K",
    "Wetted material: 316L",
  ]);
  expect(specs.split("\n").slice(0, 2)).toEqual(["Ingress protection: IP69K", "Wetted material: 316L"]);
  expect(specs.length).toBeLessThanOrEqual(3_000);
});
