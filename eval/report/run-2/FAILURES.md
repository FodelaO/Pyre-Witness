# Pyre Witness failure analysis

run-2 · 2026-11-21T17:48:19.360Z · 71 of 71 paired captures recorded.

Counts are distinct captures within each category. A capture can contribute to several categories.

| Diagnosis | Pyre Witness | Baseline |
| --- | ---: | ---: |
| risk omission | 26 | 13 |
| perception miss | 24 | 9 |
| gate error | 17 | 0 |
| product link retrieval | 6 | 1 |
| execution error | 6 | 47 |
| physical-safety omission | 5 | 8 |
| timeout | 5 | 0 |
| wrong zone | 2 | 3 |
| rule conflict | 2 | 0 |
| hallucinated technique | 0 | 3 |
| object classification | 0 | 0 |
| invented cyber claim | 0 | 0 |

## Failed stages

| Stage at failure | Pyre Witness | Baseline |
| --- | ---: | ---: |
| gate | 17 | 0 |
| link | 6 | 1 |
| perception | 6 | 0 |
| gate timeout | 4 | 0 |
| reasoning timeout | 1 | 0 |
| baseline response | 0 | 46 |
| baseline | 0 | 1 |

## System cases and recommendations

### perception miss (24)

- **photo-002** (clean). Label mismatch in ports.
  - Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — Device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, control\_room, nh3\_hazard / radios wifi / ports Ethernet 1-4, Internet (WAN) / visible defaults no · cloud no / risks wireless, hazardous\_area, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.907
  - Pyre Witness — networked\_device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.911
- **photo-001** (messy). Label mismatch in device type (P(match) 0.47).
  - Expected — Accept device · Ubiquiti UniFi AC Lite access point · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — networked\_device · Continued / Wi-Fi Access Point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports Ethernet / visible defaults no · cloud unknown / risks wireless, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.469
- **photo-003** (edge). Label mismatch in ports, cloud flag.
  - Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — networked\_device · Continued / Network Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / ATT&CK T0882 / rule check passed / P(type match) 0.612

Give perception an evidence-backed category and physical-kind decision for each device. Separate supported radio capability from active radio use in the evidence, and use physical connector names when visible or documented.

### wrong zone (2)

- **photo-004** (messy). Recommended packaging at Purdue 2, outside the labeled placements.
  - Expected — Accept device · outdoor Axis network surveillance camera · camera · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / Purdue 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks camera\_view
  - Baseline — Device · Continued / Outdoor IP Security Camera · camera · ip\_camera / parking\_lot / Purdue 4 / never nh3\_hazard, filler3, control\_room / radios none / ports none / visible defaults no · cloud unknown / risks default\_creds, camera\_view / rule check passed / P(type match) 0.899
  - Pyre Witness — networked\_device · Continued / IP camera · camera · ip\_camera / packaging / Purdue 2 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0882 / rule check passed / P(type match) 0.532
- **text-05** (clean). Recommended utilities at Purdue 0, outside the labeled placements.
  - Expected — Accept device · vertical stainless steel carbonated beverage buffer tank · vessel · vertical\_tank / areas blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — process\_equipment · Continued / Vertical jacketed tank · vessel · vertical\_tank / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 2000 L / risks washdown / rule check passed / P(type match) 0.239

Shortlist rooms and Purdue levels by device function before ranking risk. Check the final room and level together against plant constraints and use an explicit hold when there is no compatible placement.

### rule conflict (2)

- **link-bright-tank** (links). No clear footprint or valid network location for the recommendation.
  - Expected — Accept device · vertical\_tank / areas blending / size 2000 L / risks washdown
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — process\_equipment · Continued / Cylindrical vertical insulated storage tank (BBT) · vessel · vertical\_tank / blending / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 2000 L usable / 2242 L total (2728 x 1404 x 1404 mm) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
- **text-07** (messy). RF-01 Wireless within untrusted reach · USB-01 Removable media in OT
  - Expected — Accept device · Bluetooth handheld barcode scanner · sensor · generic\_device / areas packaging / Purdue 1, 2 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless, transient, physical\_port
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — networked\_device · Continued / barcode scanner · other · generic\_device / packaging / Purdue 2 / never filler3, nh3\_hazard / radios bluetooth / ports usb / visible defaults no · cloud unknown / risks wireless, washdown / ATT&CK T0860 / blocked (RF-01 Wireless within untrusted reach, USB-01 Removable media in OT) / P(type match) 0.510

Pre-filter candidate placements using the same footprint resolution and blocking rules as the Inspector. When a final check blocks the placement, try another feasible candidate or surface a hold with the blocking rule.

### hallucinated technique (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### gate error (17)

- **photo-010** (clean). gate · This stage could not finish. Try the capture again.
  - Expected — Accept device · Apple iPad first-generation Wi-Fi tablet · computer · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi, bluetooth / ports 30-pin dock, 3.5 mm audio jack / visible defaults no / risks wireless, transient, physical\_port
  - Baseline — Device · Continued / tablet · computer · generic\_device / corporate\_office / Purdue 4 / never nh3\_hazard, filler3, control\_room / radios wifi, bluetooth / ports none / visible defaults no · cloud yes / risks wireless, cloud, washdown / rule check passed
  - Pyre Witness — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- **photo-018** (messy). gate · This stage could not finish. Try the capture again.
  - Expected — Accept device · vertical stainless steel fermentation tank · vessel · vertical\_tank / areas water\_treatment, syrup\_room, blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — No classification · No gate answer / gate · This stage could not finish. Try the capture again.
- **photo-012** (clean). gate · This stage could not finish. Try the capture again.
  - Expected — Accept device · Honeywell 4600g wired handheld barcode imager · sensor · generic\_device / areas packaging, corporate\_office / Purdue 1, 2, 4 / forbidden filler3, washdown, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks physical\_port, transient
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — No classification · No gate answer / gate · This stage could not finish. Try the capture again.

Separate gate transport failures from usability decisions. Measure retries and protect the gate deadline under concurrent photo uploads. Re-test the failed captures at the same concurrency and retain the original attempts.

### object classification (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### invented cyber claim (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### physical-safety omission (5)

- **photo-027** (edge). No as-dropped physical or food-safety concern for filler3. The usability gate stopped this capture.
  - Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable. Existing defocused photograph. No individual device is identifiable.
  - Baseline — Non-device · Stopped
  - Pyre Witness — Non-device · Stopped
- **photo-030** (edge). No as-dropped physical or food-safety concern for filler3. The usability gate stopped this capture.
  - Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable. Mountain landscape in winter.
  - Baseline — Non-device · Stopped
  - Pyre Witness — Non-device · Stopped
- **photo-052** (edge). No as-dropped physical or food-safety concern for filler3.
  - Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable. An old wooden chair indoors.
  - Baseline — Non-device · Stopped
  - Pyre Witness — No classification · No gate answer / gate · The gate stage timed out after 20 seconds. Try again.

For an identifiable passive object, surface the as-dropped food-contact finding before providing a recommended room. For genuinely unusable input, retain the request for a clearer capture and keep that case visible in coverage.

### timeout (5)

- **photo-009** (clean). gate · The gate stage timed out after 20 seconds. Try again.
  - Expected — Accept device · Apple iPhone 15 smartphone · phone · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi, bluetooth, cellular, nfc / ports USB-C / visible defaults no / cloud yes / risks wireless, cloud, transient, physical\_port, camera\_view
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — No classification · No gate answer / gate · The gate stage timed out after 20 seconds. Try again.
- **photo-052** (edge). gate · The gate stage timed out after 20 seconds. Try again.
  - Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable. An old wooden chair indoors.
  - Baseline — Non-device · Stopped
  - Pyre Witness — No classification · No gate answer / gate · The gate stage timed out after 20 seconds. Try again.
- **photo-053** (edge). gate · The gate stage timed out after 20 seconds. Try again.
  - Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable. Open cardboard shipping box.
  - Baseline — Non-device · Stopped
  - Pyre Witness — No classification · No gate answer / gate · The gate stage timed out after 20 seconds. Try again.

Measure Carbon's initial and revision stages separately. Reduce repeated context and set a revision budget that leaves time to deliver the existing placement with any unresolved Inspector blocker.

### risk omission (26)

- **photo-002** (clean). Missed physical\_port.
  - Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — Device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, control\_room, nh3\_hazard / radios wifi / ports Ethernet 1-4, Internet (WAN) / visible defaults no · cloud no / risks wireless, hazardous\_area, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.907
  - Pyre Witness — networked\_device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.911
- **photo-001** (messy). Missed physical\_port.
  - Expected — Accept device · Ubiquiti UniFi AC Lite access point · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — networked\_device · Continued / Wi-Fi Access Point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports Ethernet / visible defaults no · cloud unknown / risks wireless, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.469
- **photo-003** (edge). Missed camera\_view, physical\_port.
  - Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — networked\_device · Continued / Network Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / ATT&CK T0882 / rule check passed / P(type match) 0.612

Require one evidence-backed tag per applicable risk and validate tags with the same vocabulary used by the labeled set. Review matched excerpts for cases where the lexical scorer missed equivalent wording.

### product link retrieval (6)

- **link-hygienic-pressure** (links). link · This page did not return readable product details; try a photo or paste the specs as text.
  - Expected — Accept device · instrument / areas water\_treatment, syrup\_room, blending, utilities, filler3, washdown / risks washdown, hazardous\_area
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — No classification · No gate answer / link · This page did not return readable product details; try a photo or paste the specs as text.
- **link-lte-gateway** (links). link · This page did not return readable product details; try a photo or paste the specs as text.
  - Expected — Accept device · gateway / areas control\_room / size 74.5 x 25 x 64.4 mm / risks wireless, remote\_access, cloud, physical\_port
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — No classification · No gate answer / link · This page did not return readable product details; try a photo or paste the specs as text.
- **link-mixing-tank** (links). link · This page did not return readable product details; try a photo or paste the specs as text.
  - Expected — Accept device · agitated\_tank / areas syrup\_room, blending / size 2000 L / risks washdown
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — No classification · No gate answer / link · This page did not return readable product details; try a photo or paste the specs as text.

Log whether DNS, connection, download deadline or text extraction prevented assessment. Validate the capture budget against the named vendor pages and keep the pasted-specification fallback.

### execution error (6)

- **photo-017** (messy). perception · This stage could not finish. Try the capture again.
  - Expected — Accept device · Itron OpenWay digital smart electricity meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — electrical\_equipment · Continued / perception · This stage could not finish. Try the capture again.
- **text-08** (edge). perception · This stage could not finish. Try the capture again.
  - Expected — Accept device · Teltonika TRB140 industrial LTE gateway · gateway · gateway / areas control\_room / Purdue 3.5 / forbidden packaging, water\_treatment, syrup\_room, blending, utilities, filler3, washdown, nh3\_hazard / radios cellular / visible defaults no / risks wireless, remote\_access, physical\_port
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — networked\_device · Continued / perception · This stage could not finish. Try the capture again.
- **photo-033** (clean). perception · This stage could not finish. Try the capture again.
  - Expected — Accept device · Siemens SIMATIC ET 200S PROFINET remote I/O station · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / cloud no / risks physical\_port, washdown
  - Baseline — No classification · No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
  - Pyre Witness — networked\_device · Continued / perception · This stage could not finish. Try the capture again.

Record structured-response error paths and provider status by stage. Keep the completed device profile and placement available when only the final briefing fails.

## Where the baseline does better

| Check | Eligible pairs | Baseline scored higher | Pyre Witness scored higher | Baseline examples |
| --- | ---: | ---: | ---: | --- |
| Device vs non-device | 71 | 8 | 29 | photo-052, photo-010, photo-053 |
| Equipment kind | 63 | 4 | 21 | photo-015, photo-019, photo-036 |
| Physical area | 62 | 6 | 23 | photo-004, photo-010, photo-019 |
| Purdue level | 55 | 7 | 21 | photo-004, photo-010, photo-015 |
| Rule consistency | 9 | 0 | 0 | — |
| Expected risk tags | 59 | 5 | 16 | photo-004, photo-010, photo-015 |

The counts compare each check separately. A single case can favor different sides on different checks. See the report for each side's full scored answer.

## Follow-up evaluation

The one-call baseline uses the original run-1 receipts, including the validation errors. Compare the system on the shared captures to measure the pipeline change.
