# Alert ladder

The existing escalation monitor debounces tier changes. Positive asset exposure below the configured threshold flags the asset. Crossing the configured threshold sends a silent paired-phone banner and uses the existing Slack webhook client when configured. At twice the loss threshold, a plant risk score 20 points above the configured threshold (capped at 100), or a plant risk increase of 20 points, the paired browser rings after the advisory request settles.

The test scenario raises PT-401, HMI-F3 and the labeled TEST-901 gateway in one batch. The first two loss figures are simulated fixture values. TEST-901 uses the existing rules-engine path and event loss estimate. Clear test resolves all three.

The Decisions route asks one choice question. The desktop and handset show the returned choice and confidence, or Decision unavailable. A responder can approve the suggested action or override with any listed action. The relay records the response without changing the twin. The paired browser must stay open with its ringer enabled for audible ringing.

Verify with `npx vitest run src/escalation`, `npx tsc --noEmit` and Escalation thresholds → Pair phone → Run test alert on port 4119. SDK tests stub the provider. Physical handset audio, real Slack delivery and the live provider response require a configured demo environment. No shared contract changes requested.
