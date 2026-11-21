# Line 3 simulation

The floor runs a deterministic model of Bebidas del Norte while the tab is visible. The launcher starts a tabletop incident on the current plant configuration. The calculation stops at the first safeguard that holds. The floor marks the current stage, alarmed or stopped equipment, and the safeguard. The replay supports pause, 1× and 4× speed, reset, and rerun. The existing floor mount provides the launcher when the shell has no launcher mount.

## Living process

- **Inventory.** Each step uses `ΔM = Σm_in − Σm_out` in kilograms. Draws are limited by available mass, transfers by destination capacity and active connections. Level is `100 × M / (capacity × density)`. Raw-water and concentrate top-ups use separate low and high thresholds.
- **Water and syrup.** RO permeate is `0.75 × feed` and the remainder is reject. Nominal feed is 24 m³/h. The batch combines treated water and sugar, then meters concentrate into finished syrup. The blender uses a syrup mass fraction of `3,688.8 / 18,792`, yielding 10.6 °Bx from 54 °Bx syrup and water. Rinse and RO reject leave the ledger as separate streams.
- **Filling and CO₂.** At 1,044 kg/m³ and 0.5 L per bottle, a nominal 18 m³/h is 18,792 kg/h and 36,000 bottles/h. CO₂ draw is proportional to beverage throughput and split between dissolved gas and purge. Nominal carbonation is 3.7 volumes.
- **Cooling.** Product duty is `mass flow × heat capacity × temperature drop`. Glycol return rise is `(product duty + heat pickup) / (glycol mass flow × heat capacity)`. Temperatures and modeled CO₂ pressure approach their targets by the factor `1 − exp(−Δt/τ)`. Glycol and NH₃ loop inventories are closed. Noise is a bounded interpolation of seeded samples by tag and time.
- **Detection.** Tag limits and process checks catch loss of the CIP closed indication, CIP crossover while filling, high NH₃ detector readings, and warm product. The `simulated plant` and `simulation` sources distinguish instrument detections from replay events. Telemetry and alerts update through `patchTwinQuiet`.

## Tabletop scenarios

| Exercise | Evidence and consequence | Safeguards credited |
| --- | --- | --- |
| CIP caustic | Modeled control exposure, a connected CIP branch, and active production. The exercise shows a conductivity excursion, held product and a filling stop. Potentially affected volume is filler flow × simulated exposure time. | Controller isolation, positive CIP branch segregation, or the existing `ZSC-311` hardwired permissive. |
| NH₃ release | A release challenge in the modeled machinery zone. Detector availability and independent protection affect the response. The exercise also checks equipment suitability in the zone. | Independent local detection and response, or an available local response without modeled network exposure. The replay uses the NIOSH 300 ppm IDLH reference. [NIOSH ammonia pocket guide](https://www.cdc.gov/niosh/npg/npgd0028.html) |
| Site ransomware | Endpoint availability loss and the cells reachable in the Inspector’s graph. Affected cells lose supervision or stop production in the exercise. | Managed maintenance admission, enforced DMZ boundaries, and cell segmentation. |
| Rogue wireless | Public parking-lot RF reach to a modeled OT radio, then to filler supervision and control. If filling is active, the exercise shows an out-of-band filling rate. | No in-range OT radio, separation from the filler cell or controller, or idle filling. |
| Chiller trip | Duty cooling interruption and a check of standby refrigeration availability. Affected product warms outside its band and filling stops. | Available standby equipment with its modeled connections and local control. |

The stock twin includes safeguards that contain all five exercises. Separate tests use changed copies of the seed to exercise each adverse outcome. For a stock-plant demo, run **CIP Crossover** at 4× and wait for containment at the existing permissive at `00:12`. In **Mitigations**, approve **Isolate CIP branch**, then rerun for containment at `00:06`. An in-range radio placed in the filler cell can also demonstrate an adverse replay followed by containment after radio disable is approved.

## Approval and reset

The engine resolves the stages from inventory, graph evidence, and plant flags at the start of each run. It applies each mitigation candidate to a copy and queues only changes that would stop the trial or contain it sooner. The queue shows the replay result and the projected plant risk change. Approvals use the existing panel and shared twin store. Rerun reads the approved configuration afresh.

Live process updates continue on a temporary copy during an exercise, including process trips. Reset restores the pre-run telemetry, levels and statuses while retaining edits and approvals made during the run. The replay uses fixed illustrative stage times and incident readings. Its overlay indicates modeled extent and a zone response, with no field calibration for dispersion, contamination chemistry, RF propagation, or equipment protection. The shared mitigation effect contract supports model changes such as branch segregation, segmentation, and disabling radios. Commissioning a new hardwired interlock or ventilation system would require a typed safety-control inventory and an applicable effect in that contract.

## Verification

Run `npx vitest run src/sim`, `npm test`, and `npm run typecheck`. The focused suite checks the five stock and vulnerable outcomes, counterfactual containment, the human-approval and rerun path, quiet updates, pause and speed, and exact reset. The 600-second nominal test yields 6,000 bottles, both refill cycles, zero alarms, and less than `1e-8 kg` absolute mass residual per tick.

The focused suite passed all 15 tests. Repository typecheck and simulation ESLint passed. Running the full suite with `npm test -- --maxWorkers=1` passed 197 tests with three skipped. The existing Inspector timing check exceeded its budget in parallel runs.

Chrome showed stock CIP containment at `00:12`, panel approval of branch isolation, and an updated replay timeline ending at `00:06`. The browser check did not capture the second terminal status during concurrent dev refreshes. The runtime clock test completed both replays and asserted the terminal times.
