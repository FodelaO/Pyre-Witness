/** Pins facts, shared currency formatting and the short deterministic call script. */
import { expect, it } from "vitest";
import { DEFAULT_THRESHOLDS } from "./policy";
import { buildEscalationScript } from "./script";
import type { EscalationCause } from "./types";

const camera: EscalationCause = {
  key: "finding:CAM-901:CRED-01", kind: "finding", title: "Default credentials on a networked asset",
  assetId: "CAM-901", assetName: "Wi-Fi camera", assetKind: "ip_camera", room: "Filler 3",
  loss: 340_280, score: 62, baseline: 46, ruleId: "CRED-01",
};

it("includes the tag, name, room, finding, estimate and proposed action", () => {
  expect(buildEscalationScript(camera, "Replace default credentials", DEFAULT_THRESHOLDS)).toBe(
    "Chief here. Rules engine alert. CAM-901, Wi-Fi camera at Filler 3. Default credentials on a networked asset. Estimated loss $340k. Replace default credentials.",
  );
});

it("identifies simulated outcomes and avoids invented estimates for risk-only alerts", () => {
  expect(buildEscalationScript({ ...camera, kind: "simulation" }, "Review the proposal", DEFAULT_THRESHOLDS)).toContain("Simulation outcome");
  const risk = buildEscalationScript({ ...camera, kind: "risk", loss: null, score: 56, baseline: 48 }, "Review the finding", DEFAULT_THRESHOLDS);
  expect(risk).toContain("Plant risk rose 8 points");
  expect(risk).not.toContain("Estimated loss");
});

it("keeps verbose source fields to a short read", () => {
  const long = "lengthy equipment description ".repeat(25);
  const script = buildEscalationScript({ ...camera, assetName: long, title: long, room: long }, long, DEFAULT_THRESHOLDS);
  expect(script.split(/\s+/).length).toBeLessThanOrEqual(42);
  expect(script.length).toBeLessThan(280);
});
