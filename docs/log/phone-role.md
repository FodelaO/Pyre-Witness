# Phone role

After enabling the ringer, the paired handset asks whether to ring here or act as a helper phone. The tab saves only the role under a pairing-code-specific `sessionStorage` key. Change opens the picker and clears the dial link immediately. Native dialing requires a confirmed helper role.

The relay supplies the contact name only during an eligible active alert. The picker uses generic on-call labels until then. It takes the name from the existing relay label and leaves any dial destination out of storage. No shared contracts changed.

Run `npx tsc --noEmit` and `npx vitest run src/escalation`. A smoke check used the served `/call/<code>` markup and handset module with a synthetic relay and DOM. It exercised the prompt, ring-here ringer and Answer visibility, helper link visibility, Change, and a reload with the saved role. The workspace sandbox prevented a real browser launch, so iPhone Safari and the native Phone app were unverified.
