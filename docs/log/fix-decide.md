# Fix decide

The escalation decision waits up to 15 seconds in the browser and 14 seconds for the provider on the server. The Call popover shows “Deciding…” while waiting and keeps the human override on failure. The dock uses icons for message delivery and call progress.

Clear test removes TEST-901, recalculates risk from the current twin, and resolves rehearsal alerts even if the monitor is offline. Resolved alerts remain available to the paired phone for cleanup.

Verify with `npx vitest run src/escalation src/app/api/escalation` and `npx tsc --noEmit`. The rehearsal regression covers the risk score, flags, and rendered chips. The running route returned 400 for invalid JSON evidence. The workspace sandbox blocked Playwright from launching Chromium, so the browser flow and live provider latency are unverified.
