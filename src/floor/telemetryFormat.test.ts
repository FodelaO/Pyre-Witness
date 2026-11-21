/** Keeps operational readings compact without losing fine flow and conductivity resolution. */
import { expect, it } from "vitest";
import { formatTelemetry } from "./telemetryFormat";

it("rounds to the instrument unit and handles missing readings", () => {
  expect(formatTelemetry(60.00026772523983, "%")).toBe("60%");
  expect(formatTelemetry(0.120267, "mS/cm")).toBe("0.12 mS/cm");
  expect(formatTelemetry(16.74999, "m³/h")).toBe("16.75 m³/h");
  expect(formatTelemetry(-0.002, "°C")).toBe("0 °C");
  expect(formatTelemetry(NaN, "ppm")).toBe("—");
});
