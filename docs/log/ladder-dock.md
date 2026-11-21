# Ladder dock

The Agents dock header now contains the threshold chip and a three-icon alert row. Active tiers show their asset tag and open an in-dock disclosure. Test and simulation labels remain visible. The existing escalation component uses a portal into the dock, so the shell's error boundary and the single set of monitoring subscriptions remain in place. The former stage mount has no visible content.

Changed `src/escalation/AlertLadder.tsx`, `src/escalation/EscalationCall.tsx`, `src/escalation/escalation.css`, `src/crew/CrewDock.tsx` and `src/crew/crewDock.css`.

Run `npx vitest run src/escalation src/crew` and `npx tsc --noEmit`. Browser checks against port 4119 cover 1440×900 and 1280×800 in light and dark, including active tags, reduced motion, phone settings, Escape and popover bounds. The browser check blocks the external decision and Slack requests to exercise the honest unavailable state.

Live Gemini approval, Slack delivery and physical handset audio require the configured providers or a paired handset. The recording script in `demo/shots/alerts.mjs` uses the former text rows and needs its selectors updated before re-recording. No shared contract changes requested.
