# Watch relevance mounting

The QA handoff completed. `src/watch/WatchPanel.tsx` now mounts the live desk before its recommendations and run notes. The Data lens still gets its Watch panel through the existing `SidePanel` mount.

```tsx
import { WatchSignalDesk } from "./WatchSignalDesk";

<WatchSignalDesk report={run.report} reviewing={run.status === "running"} onReview={() => void runNow()} />
<WatchRun run={run} />
```

The desk uses `GET /api/watch/feeds`. The local model review, approval queue and Antigravity comparison continue using their existing routes. The existing shell mount covers this change.
