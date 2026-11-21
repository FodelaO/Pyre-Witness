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
