<!-- Records the agents pane implementation and live verification. -->

# Agents pane

The left rail uses Pyre Witness’s existing crew portraits, with state rings, activity glyphs, engine labels, and service health. At 1280 px the cards collapse to portraits and the updates strip expands on hover or focus. The transcript stays available through its header control and keyboard shortcut.

The two-line activity card uses the crew director’s current target and recorded event time. Scout and Chief point to the captured device, Architect points to the equipment in candidate or recommended areas, and Inspector follows the path currently displayed by the rules engine. Dock portraits and chat portraits share this behavior. The 3D billboards use the same emphasis state after the reviewer released the lock.

Direct, Group, and Chief of staff use separate histories and drafts. The chat shows attributed messages in SSE order, indents agent exchanges, and labels each response with its engine. Enter sends, and Escape closes the panel and restores focus. The ticker mounts beneath the crew controls. Both the ticker and chat context use guarded module discovery.

## Files

- `src/crew/CrewDock.tsx` and `src/crew/crewDock.css` contain the rail and its controls. The director, crew store, and 2D avatar files carry and display task targets.
- `src/agents/ui/` contains the hover readout, chat UI and stream reader, and optional ticker mount.
- `src/view3d/Overlay.tsx` and `src/view3d/view3d.css` contain the billboard emphasis.

## Verification

- `npm run typecheck` passed. `npm run test -- src/crew src/agents/ui src/view3d --maxWorkers=1` passed 102 tests.
- Playwright used one cached Chromium headless shell with software compositing after installed Chrome aborted on launch. The hover screenshots replay a recorded capture into an isolated page on `http://localhost:4119`. The live chat route uses the running backend.
- Keyboard focus previewed the crew portrait in the twin. Enter opened the direct chat and focused the composer. Hovering a chat portrait highlighted the same captured asset as its dock card. Escape returned focus to the opener. The dock’s hover card stayed 12 px clear of the open conversation at 1440×900.

### Hover screenshots

Both drawing modes showed the correct crew portrait and target highlights. Moving away cleared them.

| Agent | Viewport and theme | 2D | 3D |
| --- | --- | --- | --- |
| Scout | 1440×900 light | [Captured camera](shots/agents-pane-1440-light-2d-scout.png) | [Captured camera](shots/agents-pane-1440-light-3d-scout.png) |
| Inspector | 1280×720 light | [Rule-check path](shots/agents-pane-1280-light-2d-inspector.png) | [Rule-check path](shots/agents-pane-1280-light-3d-inspector.png) |
| Architect | 1440×900 dark | [Candidate areas](shots/agents-pane-1440-dark-2d-architect.png) | [Candidate areas](shots/agents-pane-1440-dark-3d-architect.png) |
| Chief | 1280×720 dark | [Briefing device](shots/agents-pane-1280-dark-2d-chief.png) | [Briefing device](shots/agents-pane-1280-dark-3d-chief.png) |

### Live chat

The browser posted each mode to the running chat route with PLC-F3 selected in the simulated plant. Each stream ended with `done` and the rendered rows matched its sender, recipient, kind, text, and engine in order. Switching back to Direct restored its history.

| Mode | Observed messages | Screenshot |
| --- | --- | --- |
| Direct | Chief replied to the operator via Neon with the plant risk and top finding. | [Direct reply](shots/agents-pane-chat-direct.png) |
| Group | Hydrogen identified the asset. Carbon asked Inspector to confirm the finding, and the rules engine replied to Architect and then the room. Neon closed with a two-line summary. | [Group handoff](shots/agents-pane-chat-group.png) |
| Chief of staff | Neon delegated to Inspector, the rules engine replied to Chief, and Neon credited Inspector in its operator-facing synthesis. | [Staff exchange](shots/agents-pane-chat-chief.png) |

The API worker recorded its curl transcripts and server tests separately. [Chat API log](agents-chat-api.md)

## Opus review corrections

- **Ticker isolation.** The dock sits outside any feature slot, so a render error in the ticker (rebuilt in parallel) could blank the whole shell. `OptionalUpdates` now mounts it inside a quiet `Slot`.
- **Raw markdown.** Gemini replies arrived with `**bold**`, `*italic*` and `` `code` `` markers shown literally. `ChatText.tsx` renders those three as text elements (no HTML injection; underscores stay literal). Tested in `ChatText.test.ts`.
- **Highlight ownership.** Leaving a portrait now restores the highlight another feature held (a modeler preview, a watch row) instead of clearing it to nothing.
- **Escape.** The chat no longer takes Escape from a text field outside the panel, such as the capture description. Escape in the composer or on the dock still closes the chat and returns focus.
- **Stalled turns.** The chat request now times out after 60 s (the server ends a turn in about 35 s), so a hung connection shows "Agents offline" instead of locking the composer.
- **Mode cue.** An empty room shows one quiet line: `Only <agent> answers`, `All four answer · @mentions hand off`, or `Chief delegates, then reports back`.

Verified with installed Chrome at 1440×900 and 1280×720, light and dark, in 3D and 2D, using a recorded pipeline replay (no capture call). Each hover emphasized only that agent and highlighted its targets, and moving away cleared both. A 503 from the chat route showed only "Agents offline", with no agent row. Two live turns ran: Chief of staff (delegation, rules engine reply, summary) and Group (handoff, reply, summary). Neither showed raw markers. No chat request contained the stored test phone or a key. Screenshots: `.agents/qa/opus-correct/agents-pane/`.

Known gaps: no leader line from card to avatar (optional in the brief). The dock's 760–1366 px rules for `.pw-crew-dock-updates` still target the previous ticker markup (`h3`, `[data-source]`). They do nothing against the new rows, and the ticker module now handles that width itself.
