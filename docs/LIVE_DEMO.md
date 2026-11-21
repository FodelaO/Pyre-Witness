<!-- Three-minute live demo script for judging, mapped to the rubric. -->
# Live demo: 3 minutes

**Problem statement: 5 Sigma.** A real task agents struggle with: deciding where a new device can safely go in an industrial plant, and what risk it brings, before anyone plugs it in.

## Before you go on (2 minutes, off stage)

1. Open **http://localhost:4120** in Chrome at full screen. Reload once so the risk dial starts at **46**.
2. In the left **Agents** pane, click the **Escalation** chip → **Pair phone**. Scan the QR code with the iPhone, open it in Safari and tap **Enable ringer**. Wait until the phone says **Ready for calls**. Keep the phone unlocked, sound on.
3. Keep this page open for the Q&A numbers: `docs/JUDGES.md`.

## On stage

| Time | Say | Do |
| --- | --- | --- |
| 0:00 | "Plants plug in new devices every week. Agents guess the risk. We built a system that checks it, live, on a 3D twin of a bottling plant." | Point at the 3D plant. |
| 0:15 | "**New equipment.** One real photo." | **+** (bottom left) → **Upload** → **S7-300 PLC** sample. (Or **Describe**: type `Siemens S7-1500 PLC with built-in Wi-Fi, for Filler 3`, Enter: shows more risk.) |
| 0:20 | "Hydrogen reads the photo, Carbon reasons over the twin, a deterministic rules engine checks every attack path, and Neon briefs the operator. The Decisions API gates the input." | Point at the crew walking (Scout, Architect, Inspector = rules engine, Chief). About 25 s. |
| 0:50 | "It lands where it was dropped, the rules engine finds the paths, prices the loss per event, and recommends a safer place." | The asset is auto-selected. Show **Risks** and **Where it goes** in the right pane. Risk 46 → 47. |
| 1:05 | "It also looks for a better option: Carbon proposes alternatives, and the rules engine and loss model price them. It only shows one if it wins on both net value and compliance." | Under the device drawing: **Better options** row (for example +$715/yr, −1 gap) → **Use**. Point at the est. annual loss dropping. |
| 1:15 | "**New information**, at the same time. The Decisions API triages live CISA advisories and FDA recalls against our assets." | Click the big **risk dial** → **Threat watch** → **Run now**. Point at the crew. |
| 1:35 | "The crew proposes fixes, ranked by computed risk drop. A human approves." | **To-dos** → top item (**Lock exposed ports**, about −8) → **Approve**. The dial drops to **38**. |
| 1:55 | "**Escalation**, three levels at once." | **Escalation** chip → **Run test alert**. |
| 2:00 | "Low risk: a flag on the asset. Medium: a message to the phone. High: a call. The Decisions API recommends the action, and the human decides." | Point at the amber **!** in 3D, the chips in the dock, the phone banner, then the phone ringing. Answer → **Approve** on the phone. |
| 2:30 | "**Proof.** On 71 real-world inputs against a single Gemini call, key-risk recall went from 52% to 70%, statistically significant. It is slower: 23 s versus 13 s median. It still misses some risks; we fixed radio and cloud gaps run by run." | Click the small **proof** check icon in the top bar. |
| 2:55 | "Pyre Witness: know the risk before you plug it in." | |

## If something goes wrong

- **Capture slow (> 40 s):** keep narrating the crew; the run is real. Fall back to **Describe**.
- **Phone does not ring:** click the **TEST-901** chip in the dock: the decision and **Approve / Override** are on the desktop too.
- **Decision unavailable:** say "the network timed out; the human still chooses", and approve on the desktop.
- **State looks used:** **Escalation** chip → **Clear test**, then reload.

## Q&A facts

- Models: Hydrogen = perception, Carbon = reasoning and placement, Neon = briefing, `gemini-decision-1` = input gate, threat triage, escalation decision, Gemini TTS = Chief's voice, Antigravity = Google-hosted Managed Agent cross-check of the threat watch.
- The Inspector is a deterministic rules engine, not a model.
- Evaluation: 71 items (54 public Wikimedia Commons photos, 9 descriptions, 8 product links), fair single-call Hydrogen baseline, McNemar and paired bootstrap. Run 5 key-risk recall 70.0% vs 51.7% (+18.3 pp, 95% CI +9.3 to +26.9). Full report: `eval/report/REPORT.md`.
- Everything simulated is labelled: the plant is fictional, drills carry a **Drill** badge, test alerts say **TEST SCENARIO**.
