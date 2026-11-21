# security-pass

Application security review of the API routes and server helpers, 2026-11-21.

## What changed

- **Origin and Host guard** (`src/app/api/health/originGuard.ts`): 403 for a foreign `Origin`,
  `Sec-Fetch-Site: cross-site`, or a `Host` that is not localhost, a literal IP, `.local`, or listed
  in `PYRE_ALLOWED_HOSTS`. Wired into fit, voice (replaces its narrower check), watch run and
  managed, model ingest, `POST /api/health`, and the three hand-off routes.
- **Per-process rate limits** (`src/app/api/health/rateLimit.ts`) with 429 and `Retry-After`:
  fit 20 / 10 min (cache hits free), managed watch 3 / 10 min, watch 10 / 10 min, model ingest
  6 / 10 min and 2 concurrent, voice sessions 20 / 5 min, speech 30 / 5 min (cache hits free),
  health refresh 1 / 15 s (joining a running pass is free).
- **Bounded JSON bodies** (`src/app/api/health/boundedJson.ts`): fit (4 MB) and speech (16 kB) used
  `request.json()` with no limit. Both now require `application/json`.
- **Hand-off**: probe budget of 20 per minute shared by upload and stream routes
  (`src/handoff/guessLimit.ts`); the stream route was an unlimited oracle for live codes (409 for a
  live code, 503 or a new session otherwise). 20 uploads per session, constant-time key compare,
  `owns()` and `created` on the store (`src/handoff/store.ts`). The store's `globalThis` key is
  now `pyreHandoffStoreV2`, so a hot reload starts a fresh store: a pairing open at that moment
  needs a new QR code.
- `docs/SECURITY.md`, and `.agents/requests/security-pass.md` for findings in other lanes.

The three shared helpers live under `src/app/api/health/` only because that is inside this task's
paths. A neutral home such as `src/server/` would be better.

## Decisions

- Budgets are global, not per client. Next route handlers give no trustworthy client address, and
  a spoofable header would make the limit bypassable. The cost: one caller can use up a budget.
- The hand-off probe limit fails closed for the upload route, because the code is its only
  credential. The desktop that owns a session can still reconnect during a lockout.
- A pairing code stays reusable for its 10 minutes because the phone page has "Send more".

## Verify

- `npx vitest run src/app src/handoff --maxWorkers=1`
- Rejections on the running server, none of which reach a model:
  `curl -s -X POST -H "Origin: https://evil.example" http://localhost:4119/api/health` gives 403;
  `curl -s -X POST -H "Content-Type: text/plain" -d "{}" http://localhost:4119/api/fit` gives 415;
  `curl -s -X POST -H "Host: attacker.example:4119" -H "Content-Type: application/json" -d "{}" http://localhost:4119/api/fit` gives 403.

## Known gaps

- The 429 paths are covered by unit tests of the limiter and of `admitWatch`. No budget was
  exhausted on the running server.
- Happy paths after the change: the phone hand-off was run end to end with curl (open stream,
  wrong key gives 409, upload gives 202, reconnect replays the photos), and a same-origin request
  passes the guard. No successful image generation, watch run, model ingest or voice session was
  run, to avoid spend: those were checked by reading the client calls, which all send a
  same-origin `Origin` and the content type the routes now require.
- No route-level tests for fit, voice, model ingest or the hand-off routes.
- `/api/analyze` and `/api/reassess` have none of these controls yet (filed as S1 to S3).
- Link fetch DNS rebinding is open (filed as S5).
- If the app is ever served under a DNS name, set `PYRE_ALLOWED_HOSTS` or the guarded routes
  return 403.
