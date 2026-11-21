# Watch relevance mounting

The QA handoff completed. `src/watch/WatchPanel.tsx` now mounts the live desk before its recommendations and run notes. The Data lens still gets its Watch panel through the existing `SidePanel` mount.

```tsx
import { WatchSignalDesk } from "./WatchSignalDesk";

<WatchSignalDesk live={live} feed={feed} label={presentation.label} report={run.report}
  reviewing={run.status === "running"} onReview={() => void runNow()} />
<WatchRun run={run} />
```

`WatchPanel` calls `GET /api/watch/feeds` through `useWatchLive` and supplies the same status label to the pill and the desk. The local model review, approval queue and Antigravity comparison continue using their existing routes. The existing shell mount covers this change.
