/** Keeps capture errors brief and removes raw provider diagnostics from the UI. */
export function captureErrorMessage(message: string) {
  if (/GEMINI_API_KEY/i.test(message)) return "Gemini key missing.";
  if (message.startsWith("Gemini rejected the request.")) return "Gemini rejected the request.";
  const line = message.trim().split(/\r?\n/)[0];
  if (!line || line.length > 95 || /stack trace|^\s*at\s|\{.*\}/i.test(line)) return "Analysis interrupted. Try again.";
  return line;
}
