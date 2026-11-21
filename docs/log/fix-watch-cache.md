# Watch cache

Automatic reviews reuse a report for 15 minutes in the current server process when the twin and normalized review feeds match. The review consumes the same feed snapshot used for admission. Run now bypasses a warm report and shares any review already running for that snapshot. The watch header shows the original check age, and restoring cached proposals respects saved decisions.

Verify with `npx vitest run src/watch` and `npx tsc --noEmit`. The cache is per process and clears on restart. No shared contract changes.
