<!-- App-shell integration for the fixed escalation instrument. -->
# Escalation call mount

In `src/shell/AppShell.tsx`, add this single line immediately before `<TranscriptDrawer />`, as a direct child of `.pw-shell`.

```tsx
<Slot name="Escalation call" quiet><EscalationCall /></Slot>
```

Add the component import with the other feature imports.

```tsx
import EscalationCall from "@/escalation/EscalationCall";
```

The mount takes no props. Its transcript adapter can read `useEscalationStore.getState().records` and subscribe to that selector later.
