# Pyre Witness failure analysis

run-1 · 2026-11-21T17:41:58.735Z · 67 of 71 paired captures recorded.

Counts are distinct captures within each category. A capture can contribute to several categories.

| Diagnosis | Pyre Witness | Baseline |
| --- | ---: | ---: |
| timeout | 59 | 0 |
| perception miss | 44 | 8 |
| gate error | 9 | 0 |
| execution error | 7 | 46 |
| wrong zone | 0 | 3 |
| rule conflict | 0 | 0 |
| hallucinated technique | 0 | 2 |
| risk omission | 0 | 12 |

## Failed stages

| Stage at failure | Pyre Witness | Baseline |
| --- | ---: | ---: |
| reasoning timeout | 59 | 0 |
| reasoning | 7 | 0 |
| gate | 1 | 0 |
| baseline response | 0 | 44 |
| link | 0 | 1 |
| baseline | 0 | 1 |

## System cases and recommendations

### perception miss (44)

- **photo-002** (clean). Label mismatch in ports.
  - Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — Accepted / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, control\_room, nh3\_hazard / radios wifi / ports Ethernet 1-4, Internet (WAN) / visible defaults no · cloud no / risks wireless, hazardous\_area, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.907
  - Pyre Witness — Accepted / Wireless-G Broadband Router · network · wifi\_ap / radios wifi / ports none / visible defaults no · cloud unknown / P(type match) 0.911 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- **photo-001** (messy). Label mismatch in radios, device type (P(match) 0.47).
  - Expected — Accept device · Ubiquiti UniFi AC Lite access point · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — Accepted / Wi-Fi Access Point · network · wifi\_ap / radios none / ports ethernet / visible defaults no · cloud unknown / P(type match) 0.469 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- **photo-003** (edge). Label mismatch in ports, cloud flag.
  - Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
  - Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — Accepted / Network Camera · camera · ip\_camera / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.612 / reasoning · The reasoning stage timed out after 120 seconds. Try again.

Give perception an evidence-backed category and physical-kind decision for each device. Separate supported radio capability from active radio use in the evidence, and use physical connector names when visible or documented.

### wrong zone (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### rule conflict (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### hallucinated technique (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### gate error (9)

- **photo-026** (edge). Accepted a negative capture. P(device) 0.19, confidence 0.81, P(readable) 0.27, route other (0.96 confidence).
  - Expected — Reject non-device or unreadable capture. A potted houseplant on a windowsill.
  - Baseline — Rejected
  - Pyre Witness — Accepted / none (potted plant) · other · generic\_device / radios none / ports none / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- **photo-039** (clean). gate · This stage could not finish. Try the capture again.
  - Expected — Accept device · industrial Ethernet and fibre switch · network · network\_switch / areas water\_treatment, syrup\_room, blending, packaging, utilities, control\_room / Purdue 1, 2, 3, 3.5 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / risks physical\_port, washdown
  - Baseline — No gate answer / baseline · This stage could not finish. Try the capture again.
  - Pyre Witness — No gate answer / gate · This stage could not finish. Try the capture again.
- **photo-027** (edge). Accepted a negative capture. P(device) 0.31, confidence 0.69, P(readable) 0.29, route other (0.93 confidence).
  - Expected — Reject non-device or unreadable capture. Existing defocused photograph. No individual device is identifiable.
  - Baseline — Rejected
  - Pyre Witness — Accepted / generic\_device · other · generic\_device / radios none / ports none / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.

Test a hold or request for another photo when readability is low and Decisions confidently selects the other route. Measure false rejects on real devices and usable spec sheets before changing the gate threshold.

In a replay of these gate answers, holding low-readability accepts (P(readable) < 0.50) on an other route with confidence ≥ 0.80 would flag 6 labeled negatives and 0 labeled devices. Test this candidate rule on fresh inputs before adopting it.

### timeout (59)

- **photo-026** (edge). reasoning · The reasoning stage timed out after 120 seconds. Try again.
  - Expected — Reject non-device or unreadable capture. A potted houseplant on a windowsill.
  - Baseline — Rejected
  - Pyre Witness — Accepted / none (potted plant) · other · generic\_device / radios none / ports none / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- **photo-002** (clean). reasoning · The reasoning stage timed out after 120 seconds. Try again.
  - Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — Accepted / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, control\_room, nh3\_hazard / radios wifi / ports Ethernet 1-4, Internet (WAN) / visible defaults no · cloud no / risks wireless, hazardous\_area, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.907
  - Pyre Witness — Accepted / Wireless-G Broadband Router · network · wifi\_ap / radios wifi / ports none / visible defaults no · cloud unknown / P(type match) 0.911 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- **photo-001** (messy). reasoning · The reasoning stage timed out after 120 seconds. Try again.
  - Expected — Accept device · Ubiquiti UniFi AC Lite access point · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — Accepted / Wi-Fi Access Point · network · wifi\_ap / radios none / ports ethernet / visible defaults no · cloud unknown / P(type match) 0.469 / reasoning · The reasoning stage timed out after 120 seconds. Try again.

Measure Carbon's initial and revision stages separately. Reduce repeated context and set a revision budget that leaves time to deliver the existing placement with any unresolved Inspector blocker.

The frozen Carbon prompt permitted six risks, three paths, five hops and four mitigation proposals. The validator allowed three risks, two paths, four hops and three proposals. Align these limits, record validation retries and measure how much of the stage budget they consume.

### risk omission (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### execution error (7)

- **text-01** (edge). reasoning · Gemini returned an invalid response twice. Try the capture again.
  - Expected — Accept device · contractor service laptop · computer · laptop / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, nh3\_hazard / visible defaults no / risks transient, remote\_access
  - Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — Accepted / laptop · computer · laptop / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.679 / reasoning · Gemini returned an invalid response twice. Try the capture again.
- **photo-017** (messy). reasoning · Gemini returned an invalid response twice. Try the capture again.
  - Expected — Accept device · Itron OpenWay digital smart electricity meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless
  - Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — Accepted / electric\_meter · instrument · instrument / radios none / ports optical\_port / visible defaults no · cloud unknown / P(type match) 0.677 / reasoning · Gemini returned an invalid response twice. Try the capture again.
- **photo-015** (clean). reasoning · Gemini returned an invalid response twice. Try the capture again.
  - Expected — Accept device · three-wire Pt100 RTD temperature probe · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown, hazardous\_area
  - Baseline — Accepted / Pt100 RTD temperature sensor · sensor · instrument / blending / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports 3-wire RTD leads / visible defaults no · cloud no / size ~30 mm probe length / risks washdown / rule check passed / P(type match) 0.759
  - Pyre Witness — Accepted / Pt100 RTD temperature sensor · sensor · instrument / radios none / ports none / visible defaults no · cloud no / size approx. 3 cm probe length / P(type match) 0.744 / reasoning · Gemini returned an invalid response twice. Try the capture again.

Record structured-response error paths and provider status by stage. Keep the completed device profile and placement available when only the final briefing fails.

## Where the baseline does better

| Check | Eligible pairs | Baseline scored higher | Pyre Witness scored higher | Baseline examples |
| --- | ---: | ---: | ---: | --- |
| Device admission | 67 | 8 | 45 | photo-026, photo-027, photo-028 |
| Equipment kind | 59 | 0 | 41 | — |
| Physical area | 58 | 10 | 0 | photo-002, photo-004, photo-007 |
| Purdue level | 51 | 13 | 0 | photo-002, photo-004, photo-007 |
| Rule consistency | 0 | 0 | 0 | — |
| Expected risk tags | 56 | 10 | 0 | photo-002, photo-004, photo-007 |

The counts compare each check separately. A single case can favor different sides on different checks. See the report for each side's full scored answer.

## Follow-up evaluation

The bounded one-call baseline prompt adds explicit list and prose limits for the next run. Run 1 retains all original validation errors. The Run 1 vs Run 2 table flags this baseline change.
