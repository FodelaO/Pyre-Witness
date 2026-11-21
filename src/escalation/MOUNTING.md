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

## Telephony

The current shell already renders `EscalationCall` in `.pw-stage-escalation`. The desktop card and paired handset use **TEST SCENARIO**. The changes below add that label beside the gateway tag on the drawings.

In `src/floor/assetLabel.ts`, add this line inside `assetLabel` above its return. Floor and Purdue share this label.

```tsx
if (id === "TEST-901") return `${id} · TEST SCENARIO`;
```

In `src/view3d/scene.ts`, replace the `label: asset.id,` line in the asset node with the following.

```tsx
label: asset.id === "TEST-901" ? "TEST-901 · TEST SCENARIO" : asset.id,
```
