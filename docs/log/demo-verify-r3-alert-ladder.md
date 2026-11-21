# Demo verify R3: alert ladder

## Verification

Run live against http://localhost:4119 with Playwright (desktop 1440x900, a second browser context as the phone, `tel:` links blocked). Screenshots and network log: `.agents/qa/demo-verify/r3/`.

- Paired the phone with Escalation chip → Pair phone. The pairing link opened in the phone context and showed "Ready for calls".
- Clicked Run test alert. About 4 s later, all three levels had fired from that one click:
  1. **Flag:** PT-401 shows an amber "!" in 3D (`.pw3d-escalation-flag`) and in 2D (`.pw-lens-escalation-flag`). Four real rules-engine level-1 flags also appear. They come from the live twin, not the test.
  2. **Message:** the phone shows a silent banner, "TEST SCENARIO · Pyre Witness · HMI-F3 · $130k est.", with no ring. The ladder says "Message sent · Slack not set". No webhook is configured, and the route answers `not-configured`.
  3. **Call:** the phone rang for TEST-901. `POST /api/escalation/decide` returned 200 with `{"model":"gemini-decision-1","choice":"move asset","confidence":0.48}`. The desktop and the phone both show "Decision · gemini-decision-1: move asset (48%)". After Answer, the phone shows Approve and Override. Approve gave "Approved · move asset" on the phone, and the desktop ladder changed to "Responded / Approved · move asset".
- Nothing applies itself: after approval, TEST-901 stays in the twin and the risk score stays at 51.
- "TEST SCENARIO" appears on the ladder, on the phone caller line and banner, and on the TEST-901 tag in 2D and 3D.
- No key or webhook leaks: request bodies and console logs had no API-key or `hooks.slack` strings.

### Fixes made
- `src/escalation/escalation.css`: widened the ladder label column from 62px to 76px. The word "Message" had run into the asset tag.
- `src/escalation/AlertLadder.tsx`: the Message row now shows the Slack status ("Slack not set", "Slack sent", "Slack failed") next to the phone delivery status.

### Checks
`npx tsc --noEmit` passes. `npx vitest run src/escalation src/app/api/escalation`: 55/55 tests pass.

### Gaps
- Real Slack delivery is not tested because no webhook is configured.
- Physical handset audio is not tested.
- After Answer, Chief audio generation starts, which is one more Gemini call.
- In 2D, the ladder card sits over the top-left of the floor.
