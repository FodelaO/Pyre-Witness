<!-- Records live probe evidence and the health board’s operating limits. -->
# Gemini service health

The live CLI ran at **18:04:54 UTC on November 21, 2026**. After the feed probe changed to HEAD with a bounded GET fallback, the running app returned **10 / 10 healthy** from `POST /api/health?all=1` at **18:06:42 UTC**. A follow-up GET took **26 ms** and returned the same snapshot.

| Service | Model or API | CLI `--all` | App full refresh | Evidence |
| --- | --- | ---: | ---: | --- |
| Decisions API | `gemini-decision-1` | Pass · 1,914 ms | Pass · 1,033 ms | Calibrated yes/no answer for the capture gate |
| Scout | `gemini-4-hydrogen` | Pass · 2,885 ms | Pass · 3,774 ms | Identified a green square in a generated 64 × 64 PNG with two structured fields |
| Architect | `gemini-4-carbon` | Pass · 6,239 ms | Pass · 3,370 ms | Returned the correct structured sum at low thinking |
| Chief | `gemini-4-neon` | Pass · 3,793 ms | Pass · 7,106 ms | Returned a short sentence at low thinking |
| Text to speech | `gemini-3.8-flash-tts` | Pass · 2,365 ms | Pass · 1,519 ms | Returned streamed PCM audio for a two-word briefing |
| Live voice | `gemini-3.8-live` | Pass · 1,645 ms | Pass · 1,141 ms | Minted a one-use token, received `setupComplete`, and closed the socket without sending audio |
| Fit preview | `gemini-nano-banana-2.1` | Pass · 5,832 ms | Pass · 10,029 ms | Returned image bytes at the `512` size |
| Files API | Gemini Files API | Pass · 3,561 ms | Pass · 3,060 ms | Uploaded and deleted a generated 27-byte text file |
| Managed agents | `antigravity-preview-09-2026` | Pass · 1,045 ms | Pass · 336 ms | Listed one page of Agents API metadata without provisioning a sandbox |
| Threat feeds | CISA KEV, CISA ICS, NCSC | Fail · 1,873 ms | Pass · 1,316 ms | Initial CISA connection timeouts gave the CLI exit code 1. The revised probe passed all three publishers, including an isolated live retry in 1,419 ms. |

## Cadence and limits

- The Node route serves the most recent snapshot immediately and revalidates after 60 seconds. Concurrent refreshes share one run. The board polls every 30 seconds while visible and checks sooner while a refresh is pending.
- Standard checks run concurrently with an 8-second deadline. Image generation uses a 30-second deadline and a 15-minute minimum interval. Managed metadata is on demand with a 30-minute minimum interval. Explicit refreshes honor both limits.
- The API process and each CLI process maintain their own cooldowns, latest results and 20-run history. The board uses the API cache. The CLI watch loop appends each run to `.agents/health.log` and continues through provider failures.
- These are small service checks. Files health covers upload and cleanup. Managed health covers metadata access. Feed health covers reachability and media type. The board displays product-run latency and token counts when the session events provide them.

## Verification

```sh
npx tsx --env-file=.env scripts/health.ts --all
npx tsx --env-file=.env scripts/health.ts --watch 300
npm run typecheck
npx vitest run src/health --maxWorkers=1
npm run test -- --maxWorkers=1
```

The orchestrator mounted the chip in `TopBar.tsx`. Chromium verified the mounted popover at 320, 390 and 1,440 px, including all ten rows and Escape dismissal. The refresh button returned HTTP 200 with the image check on cooldown. The health suite passed all seven tests, and the full suite passed 434 with three skipped. The orchestrator owns the background watch process.
