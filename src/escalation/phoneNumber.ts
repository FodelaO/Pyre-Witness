/** Normalizes international numbers and renders a redacted receipt label. */
export function normalizePhoneNumber(value: string): string | null {
  const digits = value.trim().replace(/[\s-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function maskPhoneNumber(number: string): string {
  const normalized = normalizePhoneNumber(number);
  if (!normalized) return "··· ···";
  return (normalized.startsWith("+1") ? "+1" : "+") + " ··· ··· " + normalized.slice(-4);
}
