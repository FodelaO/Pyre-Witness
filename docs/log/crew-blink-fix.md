# Crew blink fix

Bug: "when the agents move, it blinks". The crew never remounted or hid. The blink came from layout
decisions made again from scratch on every frame.

## Changes
- `src/view3d/Overlay.tsx`
  - A walking crew plate is no longer a forced declutter box. Before, it evicted every plant tag it
    passed over, one frame at a time. Now it floats over the tags (z-index 2) and is added to `shown`
    after declutter. A resting plate still clears its spot.
  - Plate stacking uses the fixed `CREW_ORDER`, with no re-sorting by the active, emphasized or walking
    flags.
  - Lifts are sticky. A plate rises at once when it must. It drops to a lower slot only after that same
    slot (within 4 px) has stayed free for 1200 ms. This is a single step, so it does not sweep across
    the tags.
- `src/view3d/view3d.css`: `visibility` joins the 140 ms transition on `.pw3d-label` and `.pw3d-crew`,
  so a hidden tag fades out instead of popping. The existing reduced-motion rule still sets
  `transition: none`.
- `src/crew/CrewLayer.tsx` (2D): the avatars moved out of the label-clearance `<mask>`. Before, a
  walking badge was cut away whenever it crossed a room title band or an asset tag. The floor
  overlays and the desk ghosts stay masked.

## Verify (dev server on 4119; scripts in `.agents/qa/blink/`)
- `GPU=1 node 3d-dom/labels.mjs 30`: tag changes are now batched at walk start and end and at patrol
  stops. The shortest re-toggle of one tag went from 3 ms to at least 235 ms, and there are 0
  one-frame flickers.
- `GPU=1 node 3d-dom/sample2.mjs 30 && node 3d-dom/analyze.mjs ./frames-gpu.json`: 0 remounts,
  0 hides and 0 one-frame lift flips.
- 2D: the avatars are no longer under the mask, so effective coverage of a walking badge is 0.

## Known gaps
- A resting crew member at a patrol stop still hides the tags under its plate, which is the intended
  declutter. This happens once on arrival and once on departure, not as a flicker.
- A walking plate covers a tag while it passes over it, like any opaque object.
