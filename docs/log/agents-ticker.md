<!-- Records the ticker implementation and its verification. -->

# Agents ticker

The agents pane shows the 30 newest distinct watch matches, completed captures, simulation and escalation outcomes, pipeline steps, and mitigation approvals. Every row uses a title of at most three words. Red marks alerts, amber marks findings that need review, and green marks successful outcomes. Test alerts and simulated outcomes carry explicit labels.

The ticker shows five rows at a time and advances one row every four seconds when more are available. Hover and keyboard focus pause scrolling. Reduced motion leaves a manually scrollable list. Click or press Enter to select a linked asset or open the related panel.

Advisories and recalls reuse Threat Watch’s inventory matching and per-event loss figures, with the escalation loss threshold defining a high estimate. The ticker reads recall records from the cached public-feed route after Watch reports a completed check. News uses publication time when available. Simulation and approval rows use the time the ticker observes the store update. History is local to the browser session.

## Verification

- `npm run typecheck` passed for the full repository.
- `npm run test -- src/agents/ticker --maxWorkers=1` covers all four item sources, explicit holds, risk tones, deduplication, ordering, the 30-row cap, and the title limit.
- Playwright verified the mounted pane at `http://localhost:4119` using CIP and chiller replays, the escalation test alert and its resolution, and live public-feed matches. It checked click and Enter selection, panel navigation, automatic scrolling, hover pause, and reduced motion.
- Installed Chrome aborted on launch, so Playwright used the locally cached Chromium headless shell. The isolated session blocked model requests and outbound calls.
- The pane mount uses the default export documented in [MOUNTING.md](../../src/agents/ticker/MOUNTING.md).

[Light 3D screenshot](shots/agents-ticker-light.png) · [Dark 3D screenshot](shots/agents-ticker-dark.png)

## Economic-loss triage

The ticker now shows six 22 px rows with hairline separators. Each row puts the short title on the left and the equipment symbol, asset tag, and status on the right. Hover exposes the age and per-event estimate. `+N` opens the remaining ranked updates. Overflow scrolls one row at a time, pauses on hover or keyboard focus, and supports manual scrolling with reduced motion enabled.

Ranking uses the app’s displayed per-event loss. Watch matches carry the estimate for their highest-loss matched asset. Captures use the checked placement figure, replays use the starting twin, and escalations carry the original assessed loss. After 14 days an item’s ranking weight drops by 20%, with recency breaking ties. The alert band starts at $100k and includes blocked captures and crossed thresholds. Resolved items and passed checks are green. The newest update replaces earlier updates of the same asset and kind. Unpriced urgent items rank at the alert cutoff, with the tooltip showing that the estimate is unavailable.

### Triage verification

- `npm run typecheck` and ticker ESLint passed. `npm run test` passed 826 tests with three skipped, including 15 ticker tests covering ranking, tone bands, duplicate collapse, title length, and economic figures.
- Playwright used the running app with the cached Chromium headless shell, live public Watch results, and the CIP and chiller replays. The `Run test alert` row showed `TEST-901` and $290k per event, matching the escalation card. The isolated session blocked the background Watch model request. Checked the six-row cap, `+2` disclosure, hover pause, reduced motion, row selection, and replacement by the resolved row.
- Checked all four viewport and theme combinations with the existing crew dock mount. [1440×900 light](shots/ticker-triage-1440x900-light.png) · [1440×900 dark](shots/ticker-triage-1440x900-dark.png) · [1280×720 light](shots/ticker-triage-1280x720-light.png) · [1280×720 dark](shots/ticker-triage-1280x720-dark.png)
