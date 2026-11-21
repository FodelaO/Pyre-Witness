# Panel regressions

- PANEL-1. The watch shortcut updates the hero and the responsive drawer on both clicks. [Shortcut state](../../src/panel/useWatchReview.ts#L12), [drawer](../../src/shell/AppShell.tsx#L151), [review tabs](../../src/panel/SidePanel.tsx#L130), [regression](../../src/panel/useWatchReview.test.ts#L30).
- PANEL-2. The shortcut and the watch disclosure share one open state across lens changes. The initial Data lens keeps its existing default. [State](../../src/panel/useWatchReview.ts#L8), [shell wiring](../../src/shell/AppShell.tsx#L165), [regression](../../src/panel/useWatchReview.test.ts#L39).
- PANEL-3. To-do rows use the shared signed risk formatter. A rounded zero has neutral styling. [To-do labels](../../src/panel/TodoSection.tsx#L52), [rendered-row regression](../../src/panel/TodoSection.test.ts#L8).
- PANEL-4. The arrow handler focuses the selected dimension after the store applies the request, including when simulation playback keeps 2D selected. [Handler](../../src/view3d/View3DToggle.tsx#L22), [focus regressions](../../src/panel/dimensionRadio.test.ts#L8).

All five new regression cases failed before the fixes. Whole-repo `npx tsc --noEmit` passed. `npx vitest run --maxWorkers=1 src/panel src/shell src/view3d` passed all 78 tests. The running app returned HTTP 200. The sandbox blocked Chrome startup, so interaction verification used the production hook, keyboard handler, and rendered row markup. No contract changes requested.
