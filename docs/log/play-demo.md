# Play demo

The top-bar Play button runs six live steps and ends at the held-out Proof icon. The spotlight follows the actual controls, 3D or 2D asset, crew, and results. It uses the plant theme and removes transitions when reduced motion is enabled.

- Capture uses the existing S7-300 thumbnail. The tour reads the current run’s pipeline events for Scout, Architect, the rules engine, and Chief. Placement and the briefing have separate completion events.
- Better options and To-dos use the existing Use and Approve buttons. The tour reads the proposed risk change from the selected To-do and the resulting score from the twin.
- Threat watch uses Run now and waits for the review store. If a fresh model review is unavailable, the caption shows the skip reason.
- Escalation uses the built-in simulated drill and opens the test Call chip to display its Decisions API choice. Clear test removes the drill from the twin. Stop and timeouts also clear a drill started by the tour.
- Proof reads the two percentages for each comparison directly from `eval/heldout/results.json`.

The sequencing, timeouts and skip handling live in `src/tour/tourMachine.ts`. Read pauses give each observed event time on screen. Stop and Escape end the tour and cancel any photo analysis it still owns. An already-started threat review can finish in the background. Replay uses the current simulated twin, including captured assets and approved changes.

## Verification

Run `npx tsc --noEmit` and `npx vitest run src/tour`. The tests cover completion ordering, skipped steps, stale callbacks after timeout, and cancellation.

On the existing server at `http://localhost:4119`, click Play demo and follow the six captions through Done · Replay. Live browser runs in 1440px light-mode 3D and 430px dark-mode 2D placed PLC-901, applied a better option, completed the threat review, and reduced the dial from 47 to 38 after approving a To-do. The test Call showed a Decisions API choice. The drill cleared before Proof, which showed 61% vs 41% key-risk recall and 93% vs 57% device naming. Replay restarted the capture flow. Stop and Escape restored Play, including at 390px with reduced motion. The browser checks used fresh sessions and blocked outbound Slack test delivery. The model calls went through the normal app routes.

Aborting the analysis request in the browser produced a visible failure message and advanced to the next step, which skipped because there was no completed placement. Escape restored Play from that state. Timeouts, missing options or proposals, and unavailable services can also produce a visible skip. The test Call chip requires the built-in Filler 3 inventory and space in the active alert ladder. No shared contract changes were required.
