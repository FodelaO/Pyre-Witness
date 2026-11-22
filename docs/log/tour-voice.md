# Tour guide and Chief voice

Play, the tour card and Chief share one controller. Presenter Next advances one checkpoint. Skip and the eight step dots navigate without invoking the target action. The non-modal ring stays on the current control, and the guide does not move keyboard focus. Stopping cancels pending tour work and cleans up a rehearsal started by the guide.

The guide checks capture completion against the pipeline run and the placed asset. It records actual placement review interactions, verifies asset changes after a Better option click, and checks for a fresh threat report, an applied To-do and a simulated alert receipt. Clearing requires a resolved receipt and removal of the rehearsal asset. Proof reads the checked-in held-out comparison used by the Proof page. Each replay establishes its own starting baseline.

Chief validates the six Live tools against the shared step IDs. Status reports the current step, checkpoint, observed completion and suggested next action. Accepting Next means it consumed the checkpoint. The action can still be in progress.

## Verification

- Run `npx tsc --noEmit` and `npx vitest run src/tour src/voice`.
- On the existing dev server at port 4119, Chrome showed Play, Skip and the step dots. Manually starting and clearing the simulated drill nudged the guide through Clear test and Proof. Next showed the held-out comparison, and Escape closed the card.
- The voice token endpoint returned HTTP 200. A real Gemini Live text turn requesting “Start the demo” selected `start_demo`. Physical push-to-talk and audio playback were not exercised.
- No shared contract changes requested.
