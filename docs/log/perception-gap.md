# Scout radio and cloud gap

## Run 4 diagnosis

I joined all 71 system receipts in `eval/runs/2026-11-21T18-59-48-460Z-Zrjfi4` to the reused Hydrogen receipts in `eval/runs/2026-11-21T18-30-07-972Z-wVengg`. The audit uses the report’s saved per-field mismatch verdicts, model answers, and aggregate counts. The expected-answer fields and dataset label files are outside the audit.

`eval/system.ts` takes the profile from `perception.done`. `eval/metrics.ts` compares `radios` as a set of lowercased, trimmed enum values, `cloud_connectivity` and `category` by exact match, and `device_type` through its saved Decisions judgment at P(match) ≥ 0.5. An unknown cloud prediction counts as a miss when the scorer has a boolean reference. The profile survives the raw Scout `transcript.entry` → Zod validation → `perception.done` → saved prediction with all four fields identical on 67/67 published profiles. Four receipts have no published profile, including two deliberate stops and two errors. Neither error adds a scored radio or cloud miss in the all-attempt totals.

| Shared-answer metric | Hydrogen | Pyre Witness |
| --- | ---: | ---: |
| Radio recall | 12/12 (100.0%) | 4/12 (33.3%) |
| Cloud accuracy | 23/26 (88.5%) | 6/26 (23.1%) |
| Category accuracy | 47/54 (87.0%) | 44/54 (81.5%) |
| Type match | 36/54 (66.7%) | 33/54 (61.1%) |

All 8 missing radio tokens occur in three captures. All 20 cloud misses are Scout `null` values. The table shows the fields flagged by the saved scorer and Hydrogen’s own output for those fields. The three `unknown` Hydrogen cloud results also missed. `∅` means Scout emitted an empty radio list and `?` means it emitted a null cloud flag. Both values reached scoring unchanged.

| Capture | Scout raw and published miss | Hydrogen output | What Scout recorded |
| --- | --- | --- | --- |
| photo-003 | Cloud `?` | Cloud unknown | Exact network-camera label. Rear interfaces, firmware and configuration were unknown. No cloud evidence. |
| photo-007 | Cloud `?` | Cloud unknown | HMI family and front controls. Variant and rear communications were unknown. |
| photo-009 | Radios `∅`, cloud `?` | Wi-Fi, Bluetooth, cellular, NFC; cloud yes | Smartphone shape and maker logo. The unknowns combined radio support and active configuration. No protocol-specific or cloud-service evidence. |
| photo-010 | Radios `∅` | Wi-Fi, Bluetooth | Tablet shape and blank screen. Supported radios and enablement were listed together as unknown. |
| photo-012 | Cloud `?` | Cloud no | Attached USB data cable and scanner shape. Evidence identifies a local interface. Onboard cloud capability was unresolved. |
| photo-014 | Cloud `?` | Cloud no | Float-switch marking, counterweight and tether. Local electrical function was visible. No network capability was documented. |
| photo-015 | Cloud `?` | Cloud no | Pt100 marking and three bare leads support a local sensing element. Scout left the cloud field unknown. |
| photo-018 | Cloud `?` | Cloud no | Vessel, manway and capacity marking. Internal instrumentation was unconfirmed. |
| photo-019 | Cloud `?` | Cloud no | Local storage marking and a retracted connector. No network interface was observed. |
| photo-020 | Cloud `?` | Cloud no | Drive label and USB connector. No onboard network interface or service was documented. |
| photo-023 | Cloud `?` | Cloud no | Exact switch label and local Ethernet/serial interfaces. Management configuration was unknown. |
| photo-024 | Cloud `?` | Cloud no | Plate stack and process connections. Evidence describes a mechanical assembly. No electronics or service were documented. |
| photo-025 | Cloud `?` | Cloud no | Pump casing, flanges and flow arrow. Drive motor was unknown. |
| photo-033 | Cloud `?` | Cloud no | PLC model, PROFINET and LAN. Scout explicitly listed active network setup and cloud as unknown. |
| photo-042 | Cloud `?` | Cloud no | Engraved probe model and cabled connector. The compatible readout unit was unknown. |
| photo-044 | Cloud `?` | Cloud unknown | Tablet form factor and dark screen. Model and wireless capabilities were unknown. |
| photo-045 | Radios `∅` | Wi-Fi, Bluetooth | Exact board model and RF certification identifiers. No named protocol in the evidence. Only enabled state was called out as unknown. |
| photo-047 | Cloud `?` | Cloud no | Valve markings and manual handle. Evidence describes a mechanical valve. No electronics were documented. |
| photo-050 | Cloud `?` | Cloud yes | Doorbell maker logo and camera. Exact model, radio capability and cloud service were unknown. |
| text-03 | Cloud `?` | Cloud no | Hard-wired 24 V level switch. The output interface was unknown. |
| text-05 | Cloud `?` | Cloud no | Jacketed tank with no mixer. Attached instrumentation was unknown. |
| text-06 | Cloud `?` | Cloud no | USB flash drive and local connector explicitly described. No onboard networking was documented. |

The omissions start in the model answer. The Scout schema has required slots for both fields and can already express every scored radio, plus cloud `true`, `false` and `null`. The prompt limits evidence to three claims, explicitly warns against inferring hardware from appearance and common defaults, and gives a broad instruction to return `null` for unconfirmed facts. It asks for supported radios without a separate check for cloud capability or criteria for a supported `false`. Some answers mention radio or cloud only as an unknown. The three radio misses illustrate the difference between naming the device, identifying likely or supported capabilities, and observing active use. The receipts establish where the omissions occur. Determining how much the wording changes behavior requires fresh Scout output.

## Changes after the demo build cut

The marker was written at 14:42:26 EST. `src/gemini/capture.ts` now asks Scout to check radio support and cloud capability explicitly, cite the underlying evidence, and distinguish capability from enabled state. It asks for a specific functional name and a category based on the device’s primary purpose. `src/gemini/schemas.ts` describes radio abstention and the three cloud states in the Scout response schema.

`src/gemini/connectivityEvidence.ts` evaluates Scout’s validated evidence before the pipeline publishes `perception.done`. It can add a named protocol from a supported hardware cue or a documented SIM slot. It resolves unknown cloud status from explicit cloud support, documented absence or a clearly local-only design. High-confidence evidence, polarity, and attribution to the captured device determine whether a clue can fill a field. A generic antenna, Ethernet, an app, configuration alone, and conflicting evidence can leave capabilities unresolved. The original transcript still records the provider’s answer. The post-step runs locally within the same Scout call.

## Offline Run 4 replay

I ran the new post-step on all 67 published profiles and independently on their validated raw Scout replies. Both paths agreed for 67/67. Zero profiles changed. The four captures without a published profile had no output to enrich. The scored fields and saved type judgments therefore yield these same shared-answer scores without any label lookup.

| Metric | Original Run 4 | Offline post-step replay |
| --- | ---: | ---: |
| Radio recall | 4/12 (33.3%) | 4/12 (33.3%) |
| Cloud accuracy | 6/26 (23.1%) | 6/26 (23.1%) |
| Category accuracy | 44/54 (81.5%) | 44/54 (81.5%) |
| Type match | 33/54 (61.1%) | 33/54 (61.1%) |

The replay measures only the post-step on the archived answers. The revised prompt’s effect on evaluation accuracy is unmeasured.

## Scout latency

I selected five photos at the midpoints of each quintile of the 51 published photo profiles, ordered by capture ID. The four-capture budget allows four fresh sequential Scout calls. The before measurements are the matching `perception.done.latencyMs` values from Run 4, collected with six capture workers. The after measurements time the production `perceive()` call, including transport, validation and enrichment, with the same image bytes, medium resolution and low thinking. All four calls completed on their first provider attempt.

| Photo | Run 4 Scout | Updated Scout | Difference |
| --- | ---: | ---: | ---: |
| photo-006 | 7,058 ms | 7,179 ms | +121 ms |
| photo-016 | 7,022 ms | 12,467 ms | +5,445 ms |
| photo-028 | 5,679 ms | 6,795 ms | +1,116 ms |
| photo-039 | 6,401 ms | 7,199 ms | +798 ms |
| Matched p50 (n=4) | 6,711.5 ms | 7,189 ms | +477.5 ms |
| photo-049 (offline only) | 6,624 ms | — | — |

The change in p50 was below +1 s in this smoke test. The median within-photo difference was +957 ms. The archived and fresh samples ran at different times and concurrency.

The five-photo offline microbenchmark measured parsing and validation at 3.60 µs p50 before and parsing, validation and evidence enrichment at 12.36 µs p50 after. Each photo used the median of seven alternating batches of 3,000 iterations per path after warm-up. This measures local CPU time.

## Verification

`npx vitest run src/pipeline src/gemini --maxWorkers=1` passed all 144 tests in 12 files. `src/gemini/connectivityEvidence.test.ts` covers each radio family, SIM slots, ambiguous and conflicting evidence, and cloud true/false/null. `src/gemini/capture.test.ts` checks the Scout schema and verifies that the live path returns the enriched profile while the transcript retains the provider response. The existing profile contract supports the new path.

TypeScript passed with the project configuration scoped to `src/pipeline` and `src/gemini`. Whole-repo `npx tsc --noEmit` failed on both post-change checks in the concurrent escalation work. `testScenario.test.ts`, `testScenarioEvidence.ts` and `useTelephoneCalls.ts` reference `EscalationCause.test` and `EscalationRecord.telephoneCalls`, which are missing from those types.
