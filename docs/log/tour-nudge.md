# Presenter-paced demo tour

The caption button, ArrowRight, and top-bar Next all consume the same pending presenter checkpoint. Early presses are discarded while an action is running. Presenter pauses suspend the step deadline. Real capture, threat review, and Decisions updates still drive live captions and completion. Skip notices stay up until Next. Play displays the first cue. The first Next opens Capture → Upload together because a click outside the capture toolbar closes its fan.

The overlay has a pulsing ring and a non-modal caption with click-through surfaces outside its buttons. Placement clears the target and top bar. If the viewport leaves no room, the top-bar controls are still available. The tour never calls focus. Escape and both Stop buttons cancel the active checkpoint or wait, and the existing run-owned cleanup still clears a drill started by the tour.

## Verification

- `npx tsc --noEmit` and `npx vitest run src/tour`.
- The existing route at `http://localhost:4119/` returned HTTP 200. Browser interaction verification was blocked by the local Chromium sandbox and the unavailable browser access host. The real-provider sequence was not rehearsed.

## Shared UI contract request

The existing Capture toolbar and progress views, escalation settings, and mobile results drawer manage focus inside their own real action handlers. The existing mobile drawer also makes the stage inert. To apply the presenter requirements inside those controls, their owners should expose a supported mode for programmatic actions that preserves focus in Capture, escalation, and the drawer, and makes the mobile results drawer non-modal while the tour is active. Those handlers are outside this task's allowed paths. `.agents/requests/` is read-only in this workspace, so the request is recorded here.
