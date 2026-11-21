// Storyboard order for the current cut, plus the shots that are waiting on features or data.
// To add a shot: drop a module in this folder and list it here in order.
export const SHOT_FILES = [
  "01-hook.mjs",
  "02-linked.mjs",
  "03-scenario.mjs",
  "04-mitigate.mjs",
  "05-risk.mjs",
];

export const PENDING = [
  { id: "capture", slot: "after hook", needs: "GEMINI_API_KEY in .env (Scout/Architect/Chief pipeline) and a real openly licensed device photo in eval/dataset/images/ (folder does not exist yet). Upload via the capture card's Upload control, Analyze, crew walks on real pipeline events." },
  { id: "landing", slot: "after capture", needs: "Same as capture: the analyzed device landing on the floor with red outline, new attack path and the risk score jump all come from the real /api/analyze result." },
  { id: "recommended-move", slot: "after landing", needs: "Same as capture: needs a real assessment with a recommended placement to drag/move the device to and show the risk drop." },
  { id: "threat-watch", slot: "before end card", needs: "GEMINI_API_KEY: the daily threat-watch run (src/watch, /api/watch) calls Gemini; record a real run and its human-approval step." },
  { id: "proof", slot: "before end card", needs: "A real evaluation report: /proof currently shows 'No evaluation report yet' (needs GEMINI_API_KEY + labeled dataset, `npm run eval -- --limit 8`)." },
];
