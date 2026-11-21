# AI crew

`src/crew/director.ts` maps the real pipeline bus to the four crew members. Each event produces one activity entry and any associated avatar cue. The feed retains the newest 200 entries and preserves the reader’s scroll position. Model steps show their actual model ID and available latency. Inspector entries use “rules engine.”

`crewStore.ts` plays the routes and handles interruptions, briefings and returns to the four desks in `crew_office`. It shows Chief’s briefing on arrival at the east edge of the building. The floor bubble previews up to three lines. The activity feed and results panel retain the full briefing. Reduced motion places each avatar directly in its assigned slot.

`walk.ts` uses room-side midpoints as entrances because the twin provides room bounds. Exterior nodes are approached from inside the nearest outer wall. Inspector visits the reported path nodes and any enforcing assets identified from the twin’s conduits. Paths without a physical enforcer still visit their mapped endpoints. Standing slots and timed collision checks keep the badges apart.

`patrol.ts` takes one observation at a time from the current twin while the plant floor and tab are visible. Every observation is marked “idle patrol.” The Inspector reports a clean placement when the rules engine returns zero findings and otherwise records that the placement was checked. A run start cancels the patrol immediately.

## Verification

- `npx vitest run src/crew` passed 13 tests. `npm run test` passed 67. The crew-scoped TypeScript and ESLint checks passed.
- The 11:53 ET `npm run typecheck` reported errors in the concurrent evaluation dataset and threat-watch route. It reported zero crew errors.
- Open `http://localhost:4119/` on Plant floor and expand **Crew activity** in the results panel. In Chromium, Scout’s idle bubble and newest feed row both showed `LT-301 60 % · in band`. All four desks showed their names and engines. A second check with reduced motion confirmed direct placement and disabled bobbing.
- A real text capture through the local UI produced `run.started` and a gate-stage `run.error`. The feed showed one row per event. The server reported a missing `GEMINI_API_KEY`, so the successful provider path remains unverified. Vitest covers successful and failed event sequences using test-only events.

## Files

- Floor and feed UI in `CrewLayer.tsx`, `Avatar.tsx`, `Bubble.tsx`, `CrewOffice.tsx`, `ActivityFeed.tsx` and `crew.css`.
- Event handling and movement in `director.ts`, `crewStore.ts`, `feedStore.ts`, `officeLayout.ts`, `patrol.ts`, `walk.ts` and `walkTiming.ts`.
- Coverage in `director.test.ts`, `crewStore.test.ts` and `walk.test.ts`.

No shared contract change requests.
