# Crew presence and session transcript

## Design references

**Staff AI.** The office keeps names and speech above the room drawing, which informed the permanent floor nameplates and shared callout layout. Its walking and working poses carry different meanings, which informed the directional footsteps and distinct state rings. Its deterministic room layout informed how the Pyre Witness crew moves between named plant destinations.

**NUDG AI.** The execution rail emphasizes the current stored run step. Its agent console keeps events in order and opens evidence in context. The crew dock adopts the live emphasis, and each activity line opens its exact recorded event.

**Heard.** The submissions inbox orders turns by role and time. Its fallback marker and evaluation notes attribute scripted, provider, and graded steps to their sources. The crew uses the same principle by labelling model output, rules-engine checks, and simulation records in the timeline.

**Codex CLI.** Compact tool previews reserve a small space while the expanded transcript keeps their full payloads. The expanded transcript also retains completed reasoning summaries, which informed the split between floor status and transcript detail. Invocation and result rows retain their source associations, which informed stable event links and copyable raw records. [MCP cells](https://github.com/openai/codex/blob/main/codex-rs/tui/src/history_cell/mcp.rs) · [Message cells](https://github.com/openai/codex/blob/main/codex-rs/tui/src/history_cell/messages.rs)

**Gemini CLI.** Its transcript renderer distinguishes message kinds, which informed the different model, rules, and error cards. Tool groups keep status scannable while allowing the operator to expand the detail. Its session records preserve timestamps and usage, which informed the run filter and export metadata. [History](https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/ui/components/HistoryItemDisplay.tsx) · [Tool groups](https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/ui/components/messages/ToolGroupMessage.tsx) · [Session recording](https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/services/chatRecordingService.ts)

## Visual cues and data

| Cue | Source |
| --- | --- |
| Crew floor portraits and dock | Shared director and crew store. The dock updates on the received pipeline event. Floor routes use the twin layout and browser transform animation. |
| Scout capture and identification | `captureThumbnail` during `perception.started`. `perception.done` supplies the evidence, ports, radios, and new device that lands at the drop location. |
| Architect candidate areas and route | Local deterministic `rankPlacements` results labelled **rules engine ranking**. The latest `reasoning.thought` updates the callout. `reasoning.done` and `revision.done` supply the recommendation arrow. |
| Inspector route and rules stamps | `selfcheck.path` supplies route nodes for the walkthrough. `selfcheck.done` supplies findings and the phase, or the clear-pass mark. Inspector is labelled **rules engine**. |
| Chief briefing | `summary.started` starts the writing state. `summary.done` supplies the briefing, which stays pinned until dismissal or a new run. |
| Handoffs and elapsed time | Real stage transitions connect consecutive crew owners. Elapsed time starts at the step event. Ambient visits remain labelled **idle patrol**. |
| Transcript | Original pipeline events in arrival order, full-fidelity entries when emitted, and feature-store observations from simulation, Threat Watch, and Twin Modeler. The drawer retains the last 20 runs in memory, and download includes the complete recorded session. |

The review route uses the production floor and browser pipeline. The dock sits in a narrow grid column left of the drawing, so it stays visible without covering equipment. Callouts avoid the other callouts, crew portraits, and the selected equipment card. Reduced motion snaps walks to their destinations and removes decorative animation.

## Mounting

Use [MOUNTING.md](../../src/crew/MOUNTING.md) for the exact dock and drawer imports, the floor wrapper, and the optional camera listener for `pw:focus-point`. The review route is [http://localhost:4119/crew-review](http://localhost:4119/crew-review).

## Verification

- Two browser photo captures completed through the real provider pipeline. The pressure transmitter completed in 25.2 s with 14 events. The Linksys router completed in 29.8 s with 23 events, including nine as-dropped path reports from the rules engine. Both tested viewports were used during the runs.
- Opened the live timeline with `T`, filtered it from the Scout card, expanded the original profile event, followed a feed row to its exact step, and downloaded the session as JSON and Markdown. Independent browser QA checked that one `Esc` closes the drawer from a populated search field.
- A final live description capture for a mechanical pressure gauge verified the Chief card stays pinned and dismisses by click, the activity feed stays on one line, and its step link focuses the recorded row. That check reported zero browser exceptions.
- Verified all four floor nameplates fit at 1920×1080 and 1440×900 and have positive separation from adjacent plates. Checked the real Scout thumbnail, evidence, placement ranking, recommendation arrow, rules verdict, and pinned briefing in the browser captures.
- `npm run typecheck` passed. `npx vitest run src/crew src/transcript --maxWorkers=1` passed 23 tests, including event-driven intents, reduced motion, history and export, and rendering with zero `transcript.entry` events.

| View | Browser capture |
| --- | --- |
| 1920×1080 | [Parked crew](shots/crew-presence-idle-1920x1080.png) · [Scout reading the photo](shots/crew-presence-scout-1920x1080.png) · [Live transcript](shots/crew-presence-transcript-1920x1080.png) |
| 1440×900 | [Parked crew](shots/crew-presence-idle-1440x900.png) · [Evidence and ranked placement areas](shots/crew-presence-architect-1440x900.png) · [Inspector tracing a reported route](shots/crew-presence-inspector-1440x900.png) · [Chief briefing and rules verdict](shots/crew-presence-complete-1440x900.png) · [Live transcript](shots/crew-presence-transcript-1440x900.png) |

## Remaining integration

1. The orchestrator owns the production dock and drawer mounts and camera listener. The coordination bridge could not write its audit log, so a cross-thread handoff remains unverified. Concurrent development intermittently served stale styles. The review route uses the production floor and capture client and renders their source styles as a development-only fallback.
2. The live stream still emits zero `transcript.entry` records. Both downloads contain all received events. Full provider requests, ungrounded responses, thinking levels, usage, and provider retry notes depend on the pipeline emitting those fields. The captures did not exercise revision or reassessment.
3. The voice feature currently exposes the conversation inside its session and component. The optional adapter needs a subscribable voice transcript store to record it. Simulation, watch, and modeler adapters are wired to the available store contracts.

No edits to shared contracts were required. The remaining provider emission and camera hookup are documented above.
