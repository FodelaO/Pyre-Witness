# Mount crew presence

In `src/shell/AppShell.tsx`, add the imports below. The dock is designed for a vertically centered rail at the left of the floor view, with the drawing in its own grid cell. The rail switches to a strip above the floor on narrow screens.

```tsx
import CrewDock from "@/crew/CrewDock";
import TranscriptDrawer from "@/transcript/TranscriptDrawer";
```

Inside the existing floor `<section className="pw-stage-view" aria-label="Floor view">`, replace the single floor slot with this wrapper.

```tsx
<div className="pw-crew-stage">
  <div className="pw-crew-stage-dock"><CrewDock /></div>
  <div className="pw-crew-stage-drawing">
    <Slot name="Plant floor"><PlantFloor previewModel={previewModel} /></Slot>
  </div>
</div>
```

Add the drawer once, immediately after `.pw-shell-body`, inside the root `.pw-shell`.

```tsx
<TranscriptDrawer />
```

Keep the shell's existing `useCrewConnection()` call. `FloorStage` and `SidePanel` already mount `CrewLayer` and `ActivityFeed`.

## Floor camera

Selecting a dock card dispatches `pw:focus-point` on `window` with `{ x, y, crewId }` in SVG floor units, then opens the transcript filtered to that member. To pan with the current floor camera, add the import and effect below to `src/floor/useFloorCamera.ts`. Place the effect after `setCamera`.

```tsx
import { CREW_FOCUS_EVENT, type CrewFocusPoint } from "@/crew/focusCrew";
```

```tsx
useLayoutEffect(() => {
  function focusCrew(event: Event) {
    const point = (event as CustomEvent<CrewFocusPoint>).detail;
    const view = viewport.current ?? measure();
    if (!view || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;

    const next = pose.current;
    const local = worldToLocal(point, next, view);
    setCamera({
      ...next,
      x: next.x + (view.width / 2 - local.x) / view.pixelsPerUnit,
      y: next.y + (view.height / 2 - local.y) / view.pixelsPerUnit,
    }, true);
  }

  window.addEventListener(CREW_FOCUS_EVENT, focusCrew);
  return () => window.removeEventListener(CREW_FOCUS_EVENT, focusCrew);
}, [measure, setCamera]);
```
