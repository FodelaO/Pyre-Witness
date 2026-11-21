<!-- Implementation and verification record for the risk escalation calls. -->
# Escalation call

The fixed desktop card stays clear of the lens, crew dock, and capture bar. It raises one record for each sustained rules-engine finding, plant-risk episode, or completed simulation outcome. A cause must remain above threshold for 500 ms. Loss uses the existing mean cost per event from the economic model. The policy resolves a cause when it falls below threshold or disappears. The defaults are $100,000 and risk 60, with an additional eight-point baseline trigger.

The desktop and the paired phone exchange call events over short-lived LAN streams. The standalone phone page loads its own local assets. It rings through Web Audio after the operator enables the ringer and uses vibration where supported. Answer passes the deterministic read-back script verbatim to the existing Chief speech route. The on-call contact stays in the phone’s local storage. The dialer gets a `tel:` link and the desktop records the tap. An explicit phone approval rechecks the offered action on the desktop and applies an eligible move or mitigation through the twin store.

The exported transcript interface is `useEscalationStore.getState().records`. Records contain the trigger, thresholds, script, proposed action, resolution, and timestamped call events with their channels. [Shell mount](../../src/escalation/MOUNTING.md) · [Two-person rehearsal](../CALL_DEMO.md)

## Verification

- The first focused Vitest run passed all seven policy and script tests. The second passed those and both relay tests, and exposed a port lock that reduced exposure but left the media finding active. The recommendation now uses the existing service-media mitigation. Its regression assertions passed in TSX and the paired flow applied it through the twin store.
- Evaluated the seed and camera directly. PLC-F3 measured $94,492 per event before display rounding. The tested camera placement generated a finding of about $31k. A checked move applied through the twin and cleared the camera’s washdown finding. The completed chiller exercise measured about $78k.
- Playwright used one installed Chrome Headless Shell process and two pages at 1440×900 and 390×844. It lowered the threshold without a capture-model call, opened the phone using the QR’s LAN URL, checked the ringer control and masked roster, then verified incoming call, Answer, acknowledgment, and the dialer tap. The approval rehearsal applied **Disable HMI service media** and showed the responder, timestamp, and a nine-point drop on the desktop. The network payload check found neither roster field.
- The live speech route returned a real Gemini WAV from the exact PLC-F3 script. It measured **14.2 seconds**. The browser test exercised the read-aloud fallback deliberately and verified its outgoing speech text matched the displayed script.
- The first repository typecheck passed. The second encountered stale generated Next types after replacing the React phone page with the standalone route. The running server regenerated the handler types and served both screens. All 20 escalation TypeScript sources passed a scoped semantic and syntax check. All five handset modules passed Node syntax checks.

## Screenshots

- [Desktop threshold](shots/escalation-desktop-threshold.png) and [pairing](shots/escalation-desktop-pairing.png)
- [Phone incoming call](shots/escalation-phone-incoming.png) and [audio fallback](shots/escalation-phone-audio-fallback.png)
- [Desktop approval](shots/escalation-desktop-approved.png) and [phone approval](shots/escalation-phone-approved.png)

## Gaps

The live demo uses a foreground browser tab. Physical handset audio, vibration, and carrier connection remain unverified. The LAN page offers Chief audio and the read-aloud script. The Live microphone control remains hidden on the HTTP demo.
