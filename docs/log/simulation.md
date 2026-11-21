# Line 3 simulation

The floor runs a deterministic model of North Beverage Facility while the tab is visible. Select the **Both** lens to see all six launchers. Each tabletop replay opens with a detection report and stops at the first safeguard that holds. The earliest containment is `00:04`, so the report remains visible for one real second at 4×. The replay supports pause, reset, and rerun.

The overlay resolves route endpoints against the current twin and uses documented pipe or cable geometry, plus modeled in-range radio links. Unknown, off-canvas and disconnected nodes break a segment. The shield is anchored to its safeguard independently of the trail. On the stock CIP replay the yellow trail follows the V-311 to FIL-3 pipe, and the shield stays at ZSC-311.

## Living process

- **Inventory.** Each step uses `ΔM = Σm_in − Σm_out` in kilograms. Draws are limited by available mass, transfers by destination capacity and active connections. Level is `100 × M / (capacity × density)`. Raw-water and concentrate top-ups use separate low and high thresholds.
- **Water and syrup.** RO permeate is `0.75 × feed` and the remainder is reject. Nominal feed is 24 m³/h. The batch combines treated water and sugar, then meters concentrate into finished syrup. The blender uses a syrup mass fraction of `3,688.8 / 18,792`, yielding 10.6 °Bx from 54 °Bx syrup and water. Rinse and RO reject leave the ledger as separate streams.
- **Filling and CO₂.** At 1,044 kg/m³ and 0.5 L per bottle, a nominal 18 m³/h is 18,792 kg/h and 36,000 bottles/h. CO₂ draw is proportional to beverage throughput and split between dissolved gas and purge. Nominal carbonation is 3.7 volumes.
- **Cooling.** Product duty is `mass flow × heat capacity × temperature drop`. Glycol return rise is `(product duty + heat pickup) / (glycol mass flow × heat capacity)`. Temperatures and modeled CO₂ pressure approach their targets by the factor `1 − exp(−Δt/τ)`. Glycol and NH₃ loop inventories are closed. Noise is a bounded interpolation of seeded samples by tag and time.
- **Detection.** Tag limits and process checks catch loss of the CIP closed indication, CIP crossover while filling, high NH₃ detector readings, and warm product. The `simulated plant` and `simulation` sources distinguish instrument detections from replay events. Telemetry and alerts update through `patchTwinQuiet`.

## Tabletop scenarios

| Exercise | Evidence and consequence | Safeguards credited |
| --- | --- | --- |
| CIP caustic | Modeled control exposure, a connected CIP branch, and active production. The exercise shows a conductivity excursion, held product and a filling stop. Potentially affected volume is filler flow × simulated exposure time. | Controller isolation, an HMI port lock or locked cabinet on the relevant physical path, branch segregation, an independent `V-311` interlock, and the existing `ZSC-311` permissive. |
| NH₃ release | A release challenge in the modeled machinery zone. Detector availability and independent protection affect the response. The exercise also checks equipment suitability in the zone. | Independent detection at `GT-401` and local emergency ventilation at `PLC-UT`, including documented seed controls. The replay uses the NIOSH 300 ppm IDLH reference. [NIOSH ammonia pocket guide](https://www.cdc.gov/niosh/npg/npgd0028.html) |
| Site ransomware | Endpoint availability loss and the cells reachable in the Inspector’s graph. Affected cells lose supervision or stop production in the exercise. | Managed maintenance admission, enforced DMZ boundaries, and cell segmentation. |
| Rogue wireless | Public parking-lot RF reach to a modeled OT radio, then to filler supervision and control. A captured Wi-Fi camera assigned to the filler cell can supply that route. The replay names the endpoint and reports the affected filling rate. | No in-range OT radio, approved radio disable, separation from the filler cell or controller, or idle filling. |
| Chiller trip | Duty cooling interruption and a check of standby refrigeration availability. Affected product warms outside its band and filling stops. | Available standby equipment with its modeled connections and local control. |
| CO₂ upset | A modeled pressure upset in the active carbonation train. The exercise derives pressure indications from the twin's operating band and held volume from filler flow and the simulated hold interval. | Blend-cell segmentation, an inactive gas/product train, or independent `CC-301` pressure protection. The adverse replay shows relief demand, foaming and a filling stop. |

The stock twin contains all six exercises. For a stock-plant demo, run **CIP Crossover** at 4×. The stock permissive holds at `00:12` with 0 m³ affected, compared with 0.15 m³ in the exercise without it. Approving the `V-311` hardwired interlock moves containment to `00:10`. An in-range camera placed in the filler cell can demonstrate an adverse wireless replay followed by containment after radio disable is approved.

## Approval and reset

The engine resolves stages from the current inventory, graph evidence and plant flags. It applies each mitigation candidate to a copy and queues changes that would stop the trial or contain it sooner. Physical safeguards use `add_protection`. The engine collapses equivalent modeled effects and preserves alternatives with distinct plant or risk effects. CIP's physical bundle locks the HMI port and removes the modeled bridge. Its software bundle enforces the cell boundary and disables HMI service media.

Pending simulation proposals belong to the completed replay. Starting another replay or resetting withdraws them. Decisions and proposals from other sources remain in the approval history. While the finished replay is open, a device move or mitigation approval recomputes the pending candidates, containment projections and risk deltas against the current configuration. Quiet telemetry ticks leave the queue intact. Approvals use the shared twin store, and rerun reads the approved configuration afresh.

At completion, **Simulation comparison** in the results panel shows the quantified outcome and a labelled counterfactual. The engine replays a copy with the credited safeguard removed. Other safeguards can still hold. A missing prerequisite or an uncontained run can leave no safeguard to subtract, which the comparison says explicitly. Radio disable uses the approved effect recorded in the session to restore only that radio on the comparison copy.

Live process updates continue on a temporary copy during an exercise, including process trips. Reset restores the pre-run telemetry, levels and statuses while retaining edits and approvals. New alert activations and escalations enter the Inspector crew feed as simulated events. The stage times, hazard readings and zone visuals are tabletop approximations. The CO₂ pressure values are relative to the exercise band and do not establish equipment relief settings.

## Verification

`npx vitest run src/sim --maxWorkers=1` passed all 43 tests. `npm run typecheck` passed. Tests cover six-scenario canvas bounds, missing links, detection before containment, exact counterfactual subtraction, live queue refresh after a device move and an approval, and exact reset. The 600-second nominal test yields 6,000 bottles, both refill cycles, zero alarms, and less than `1e-8 kg` absolute mass residual per tick.

A headless Chrome run on `localhost:4119` verified detection and the terminal overlay in the **Both** lens for CIP (`00:12`), ammonia (`00:16`), chiller (`00:12`), CO₂ (`00:04`), ransomware (`00:08`), and wireless (`00:04`). It checked the CIP route, nonzero containment projections, CO₂ counterfactual, proposal withdrawal on scenario change and reset. The live cold load omitted the global app stylesheet. The isolated test tab loaded the last compiled stylesheet from the same server so pointer actions and overlay screenshots could be checked.
