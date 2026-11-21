# Demo verify — requirement 2 (threat watch -> crew -> To-do -> risk drop)

## Verification

Driven with Playwright (Chrome, headless, 1440x900) against http://localhost:4119, light + 3D.
Scripts and screenshots: `.agents/qa/demo-verify/r2-watch-crew/` (`run.mjs`, `approve.mjs`, `source.mjs`, `titles.mjs`).

- Risk dial button "Plant risk, 46 out of 100" opens the pane; Threat watch tab shows Live feed,
  "Simulated plant inventory", rows labelled Advisory / Food safety recall / Drill, each "Detected → Proposed".
- Run now: the crew moves within ~3 s, driven by watch events: Scout "Reads advisory…", then
  "Simulated drill…" (drills labelled), Inspector "rules engine · Rules engine: no modeled path…",
  Architect "Proposes: Verify…", Chief "Briefing ready". The model review lands ~20 s after the
  click and adds 3 more To-dos (17 -> 20).
- To-dos: watch items rank first; "See more" reads "From threat watch · …". Top item
  "Lock exposed ports" (from the simulated HMI-F3 remote-support-tool drill) predicts −8.59 risk.
- Approve: dial 46 -> 38 ("Low"), header "Risk 38 −8", matching the −8.59 prediction (rounded).
- Idle patrol stays labelled ("idle patrol · LT-301 60% …") with no findings. No page errors.

Fix: model-written watch recommendations were cut to four words and showed as
"Verify FW-DMZ PAN-OS for". `todoTitle` (src/todo/todos.ts) now drops a dangling trailing
connector word; test added in src/todo/todos.test.ts. Rechecked in the app: "Verify FW-DMZ PAN-OS".

Gaps: on page load `runDaily` already posts `/api/watch/run`, so watch To-dos exist before Run
now; Run now refreshes them and replays the crew. Several watch To-dos are procedural (0 risk);
only the drill-backed port lock moves the dial.
