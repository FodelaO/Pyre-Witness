# Mount the optional 3D view

Everything lives in `src/view3d/**`. Nothing in the 2D product imports it until these lines are
added, and when 3D is off `View3DStage` renders `null` and the WebGL chunk is never downloaded.
Review it without the shell at `http://localhost:4119/3d`.

## 1. The switch (top bar)

`src/shell/TopBar.tsx`, next to the lens:

```tsx
import View3DToggle from "@/view3d/View3DToggle";
```

```tsx
<div className="pw-top-lens">
  <LensToggle />
  <View3DToggle />
  {/* existing Levels button */}
</div>
```

The toggle renders nothing when the browser has no WebGL2, so there is nothing to guard.

## 2. The view (inside the floor stage)

`src/shell/AppShell.tsx`:

```tsx
import View3DStage from "@/view3d/View3DStage";
import { useView3DStore } from "@/view3d/view3dStore";
```

```tsx
const view3d = useView3DStore((state) => state.enabled);
```

Replace the drawing cell of the floor view with:

```tsx
<div className="pw-crew-stage-drawing" data-view3d={view3d || undefined}>
  <Slot name="Plant floor"><PlantFloor previewModel={previewModel} /></Slot>
  <Slot name="3D view" quiet><View3DStage /></Slot>
</div>
```

That is all. `.pw-crew-stage-drawing` is already `position: relative`; `View3DStage` fills it
(`position: absolute; inset: 0; z-index: 5`). `View3DStage` has no props and brings its own CSS.

## 3. What to hide while 3D is on

- **Hidden: the 2D floor drawing only** (the `PlantFloor` subtree: SVG floor, pipes, crew layer,
  selection card, legend, floor camera controls). The `data-view3d` attribute above does it through
  a rule in `view3d.css`: `visibility: hidden; pointer-events: none`. Keep it **mounted** (do not
  unmount or `display: none` it): `CrewLayer` owns the idle patrol and the floor camera keeps its
  measurements, so switching back is instant and the crew never stops.
- **Keep: everything else.** Top bar, lens, crew dock, capture card, results panel, transcript,
  simulation controls, and the Purdue map in split view (linked selection works with 3D on).
- **Switch back to 2D for two 2D-only flows** (recommended, two lines in `AppShell`):

```tsx
useEffect(() => { if (pinning) useView3DStore.getState().setEnabled(false); }, [pinning]);
```

  `pinning` is the existing drop-pin mode: choosing a drop point needs the 2D floor. The same
  applies when a simulation scenario starts, because simulation overlays are drawn in 2D only
  (see `docs/log/view3d.md`).

## Behaviour you get

- Reads `useTwinStore` (`twin`, `risk`, `selectedId`, `hoveredId`, `highlightIds`), `useLensStore`,
  `useCrewStore`, `useRunStore`. Click = `select(id)`, hover = `hover(id)`; a selection made in the
  2D floor, the Purdue map or the side panel highlights and frames in 3D.
- Any failure (no WebGL2, shader error, render error) calls `useView3DStore.getState().fail()`:
  the store flips to 2D and a one-line notice shows for 7 s. A lost GPU context pauses the view
  and restores itself.
- Programmatic control, if needed: `useView3DStore.getState().setEnabled(true | false)`.
