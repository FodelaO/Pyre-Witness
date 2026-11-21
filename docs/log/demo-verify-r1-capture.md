# demo-verify-r1-capture

Requirement 1: a photo or a typed description of a device adds it to the 3D twin and shows the risks it brings.

## Verification

Tested 2026-11-21 against the live dev server at http://localhost:4119 (light theme, 3D default), using headless Chrome
through Playwright with a 1440x900 viewport. The app made two real `/api/analyze` runs, both returning 200, and the page logged no errors.
Screenshots are in `.agents/qa/demo-verify/r1-capture/`.

| Path | Clicks | Time to done | Result |
| --- | --- | --- | --- |
| (a) Photo | `+` -> Upload -> "S7-300 PLC" sample (starts the run right away; no separate Analyze click) | 21.8 s | Scout identified "Siemens SIMATIC S7-300 PLC (CPU 314C-2 DP)". `PLC-901 NEW` was placed at Filler 3 in 3D and in 2D. Risk went from 46 to 47 (+1). The rail showed Where it goes (Packaging, Cell Pack, "Here $34k · There $12k" est. per event), 3 risks (washdown ingress, unmanaged Purdue 1 controller, unmanaged asset in OT) and the attack-path rows. |
| (b) Text | `+` -> Describe -> "Siemens S7-1500 PLC with built-in Wi-Fi, for Filler 3" -> Enter | 28.7 s | Identified "Siemens S7-1500 PLC" (Wi-Fi). `PLC-901 NEW` was placed at Filler 3 with red attack arcs to the parking-lot RF source. Risk went from 46 to 50 (+4). "Never here: Filler 3", and the rules engine blocked the recommendation ("No compliant spot: hold"). 3 risks, including T0860 Wireless Compromise, and the as-dropped check found 14 attack paths. |

During both runs the crew (Scout, Architect, Inspector as the "rules engine", Chief) moved in 3D and the work plates followed real
pipeline events. These included the Decisions API gate card, `Architect · Revision` on the text run, and "Briefing ready" at the end.

No code changes were needed. `npx tsc --noEmit` passed, and `vitest src/capture src/view3d` passed 68/68.

Known gaps: after a run the asset is not auto-selected, so the Asset inspector still says "Select an asset". The risks sit below the
fold in the right rail, so the presenter has to scroll the rail or click the new `PLC-901` tag. The escalation Flag card overlaps the top-left
of the 2D floor, which is owned by Overlay, not this lane.
