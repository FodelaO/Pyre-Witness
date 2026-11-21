/** Formats plant readings consistently without rounding the underlying measurements. */
const formats = [0, 1, 2].map((maximumFractionDigits) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits }),
);

function precision(unit: string) {
  switch (unit) {
    case "state":
    case "bottles/h":
    case "trays/h":
      return 0;
    case "mS/cm":
    case "m³/h":
    case "bar(g)":
    case "bar(a)":
    case "pallets/h":
      return 2;
    default:
      return 1;
  }
}

export function telemetryNumber(value: number, unit: string): string {
  if (!Number.isFinite(value)) return "—";
  const digits = precision(unit);
  return formats[digits].format(Math.abs(value) < 0.5 / 10 ** digits ? 0 : value);
}

export function withTelemetryUnit(text: string, unit: string): string {
  return !unit || text === "—" ? text : text + (unit === "%" ? "%" : " " + unit);
}

export function formatTelemetry(value: number, unit: string): string {
  return withTelemetryUnit(telemetryNumber(value, unit), unit);
}
