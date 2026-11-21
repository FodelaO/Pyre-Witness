# Security notes: Pyre Witness

Pyre Witness is a **single-user demo** that runs on one laptop (`localhost:4119`) and is reachable on
one LAN address so a phone can send photos. It has no login. This page states what the code
defends, where, and what it does not. Written after a review of every API route on 2026-11-21.

## Threat model

| Asset | Threat | Control in the code | Residual risk |
| --- | --- | --- | --- |
| Gemini API key | Reaches the browser, a URL, a log or a transcript | Read only from `process.env` in server code and sent through the SDK or the `x-goog-api-key` header (`src/gemini/transport.ts`, `src/modeler/filesApi.ts`, `src/health/mediaChecks.ts`, `src/app/api/voice/session/route.ts`). No `NEXT_PUBLIC_` variables. Transcript entries are scrubbed of the key and key-shaped strings (`src/gemini/transcript.ts`). Provider errors are mapped to fixed messages before they leave the server (`providerFailure` in `src/gemini/transport.ts`, `src/app/api/voice/response.ts`). | The server console logs the provider's error status, message and body. Health details show a provider message after pattern redaction (`src/health/probe.ts`), not a fixed string. |
| Gemini quota and spend | Another website the operator has open calls the API (CSRF), or a rebound DNS name points at the dev server | `crossOriginRejection` (`src/app/api/health/originGuard.ts`) rejects a foreign `Origin`, `Sec-Fetch-Site: cross-site`, and any `Host` that is not localhost, a literal IP, a `.local` name or listed in `PYRE_ALLOWED_HOSTS`. Applied to fit, voice, watch, model ingest, `POST /api/health` and hand-off. JSON routes also require `application/json` (`boundedJson.ts`). | **Not applied to `/api/analyze` and `/api/reassess`** (other owner; filed). A client that sends no `Origin` (curl, a script on the LAN) passes: this is not authentication. |
| Gemini quota and spend | A loop drains image generation, the managed agent or Live voice | Per-process sliding windows with a 429 and `Retry-After` (`src/app/api/health/rateLimit.ts`): fit 20 generations / 10 min, managed watch 3 / 10 min, watch 10 / 10 min, plant modeling 6 / 10 min and 2 at once, voice sessions 20 / 5 min, speech 30 / 5 min, health refresh 1 / 15 s. Cache hits are free. | Budgets are global, not per client: one caller can use them up and lock the operator out until the window passes. They reset on restart. No limit on analyze and reassess (filed). |
| Server memory | Oversized or endless upload | Streaming byte caps that do not trust `Content-Length`: fit 4 MB, speech 16 kB (`boundedJson.ts`), hand-off about 12 MB (`src/handoff/payload.ts`), watch twin 768 kB (`src/watch/snapshot.ts`), modeler 51 MB multipart / 68 MB JSON with per-type limits (`src/modeler/request.ts`, `limits.ts`). Photos are size- and dimension-checked (`src/pipeline/server/captureImages.ts`). No server-side decompression of uploads; video and PDF go to the Files API. | `/api/analyze` and `/api/reassess` check only the `Content-Length` header (filed). A modeler upload is buffered whole and held several times over while it is parsed (not measured); two run at once at most. |
| Internal network | Product link fetch reaches a private address (SSRF) | `src/link/safeFetch.ts`: http(s) only, blocked host names, private and reserved IPv4/IPv6 ranges, DNS answers checked, redirects followed manually and re-validated (3 hops), 3 MB HTML / 4 MB image caps, timeout. Feed readers use fixed publisher URLs with size and time limits (`src/watch/feeds/index.ts`). | **DNS rebinding gap:** the name is resolved for the check and resolved again by `fetch`, so a hostile DNS server can answer differently the second time (filed with a fix). Feed fetches follow redirects from their fixed hosts. |
| Twin integrity | Text in a photo, product page or advisory tells the model to change the plant | Prompts label captured and fetched text as evidence to ignore instructions in (`src/gemini/capture.ts`, `assess.ts`, `src/watch/reassess.ts`, `src/modeler/gemini.ts`). Model output is schema-validated structured data, then checked by the deterministic rules engine. The server holds no twin: proposals reach the browser store as `proposed`, and only `decideMitigation` in `src/twin/store.ts` applies them. It is called from two click handlers (`src/panel/MitigationQueue.tsx`, `src/watch/WatchResults.tsx`). | An injected instruction can still skew what the model *says* (a wrong identification, a missing finding, a misleading proposal for the human to approve). The Live voice tool `move_device_to_recommended` moves the just-captured device to its checked recommendation when the model calls it; "the engineer asked" is judged by the model, not by code (`src/voice/toolDispatch.ts`). |
| Operator's browser | Model or feed text rendered as markup, hostile links | No `innerHTML` anywhere in `src`, and one `dangerouslySetInnerHTML`: a constant theme script in `src/app/layout.tsx` with no data in it. Model and feed text is rendered as React text. Feed text is reduced to plain text and feed links must be `https` on the publisher's own origin (`src/watch/feeds/rss.ts`, `kev.ts`). External links open with `rel="noreferrer"` or `noopener noreferrer`. | No Content-Security-Policy or frame headers are set. Cached watch reports are read back from `localStorage` with a shape check only, so their link URLs are not re-validated (filed). |
| Phone hand-off | Guessing a pairing code, reading someone's photos, flooding the desktop | Code: 6 characters from 32, 30 bits, from `crypto.getRandomValues`. Session: 10 minutes, 12 at most, 20 uploads each (`src/handoff/store.ts`). Reading the stream needs a separate 128-bit key held only by the desktop, sent in a header and compared in constant time. Probes are capped at 20 per minute across both routes and the cap fails closed (`src/handoff/guessLimit.ts`). Uploads must be JSON, JPEG only, at most 3 photos and a 500-character note. | A code is reusable until it expires (the phone has "Send more"). Whoever has a live code can put photos and a note on the desktop's capture card; they cannot read anything back. Anyone on the LAN can fill the 12 sessions or the probe budget and block pairing. Traffic is plain HTTP on the LAN. |
| Live voice | The browser needs to talk to Gemini Live directly | The browser never gets the API key. `/api/voice/session` mints an ephemeral token: 1 use, must start within 60 s, expires after 8 min, created with the server's model, system instruction and five tool declarations (`src/app/api/voice/session/setup.ts`). | The token is a bearer credential for its lifetime and appears in the WebSocket URL, as the Live API requires. This review did not test whether Google rejects a client that tries to override the locked setup. |
| Server internals | Stack traces or file paths in responses | Routes catch errors and return fixed sentences. Verified by reading each route and by probing with malformed requests. | Next.js dev-mode error pages show stack traces if a route throws outside its own handler. |

## How secrets are handled

- One secret: `GEMINI_API_KEY` in `.env`, which `.gitignore` excludes along with `.agents/`.
- Server code only. The browser receives model output, fixed error sentences and, for voice, a
  short-lived token.
- Scripts load it with `tsx --env-file=.env`. A search of `src`, `eval` and `demo` found no log
  call that names the key.
- The 429 responses were verified by unit tests, not by exhausting a budget on the running server.

## Not protected (by design, for a demo)

- **No authentication or authorization.** Anyone who can reach port 4119 can call every route,
  spend quota within the budgets above, and open or fill hand-off sessions.
- **No multi-tenant isolation.** Caches (fit images, speech, feeds, health) and rate budgets are
  shared by every caller of the process.
- **In-memory state.** Hand-off photos, caches and budgets live in one Node process and vanish on
  restart. The twin lives in the browser. Nothing is encrypted at rest.
- **No TLS.** The phone hand-off sends photos over plain HTTP on the local network.
- **No audit trail** of who approved a twin change.
- The plant, its assets and the "simulated" attack paths are fictional. No real device is contacted.

## What a production deployment would add

- Sign-in, per-user sessions and server-side authorization for every route, with per-user and
  per-IP quotas in a shared store instead of process memory.
- TLS everywhere, and a hand-off code bound to an authenticated desktop session, single use.
- A Content-Security-Policy, `frame-ancestors`, and standard security headers.
- Link fetching through an egress proxy that pins the validated IP, on a network with no route to
  internal services.
- Server-side twin storage where an approval is an authenticated, logged action, and voice
  actions that change the twin require an on-screen confirmation.
- A secret manager with key rotation, and log scrubbing at the sink.
- Dependency and container scanning in CI.
