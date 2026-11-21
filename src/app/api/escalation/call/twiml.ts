/** Escapes the alert as XML text before asking Twilio to read it twice. */
export function buildTwiml(script: string): string {
  const text = script
    .replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD\u{10000}-\u{10FFFF}]/gu, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
  return "<Response><Say>" + text + '</Say><Pause length="1"/><Say>' + text + "</Say></Response>";
}
