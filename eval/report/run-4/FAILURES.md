# Pyre Witness failure analysis

run-4 · 2026-11-21T19:02:22.106Z · 71 of 71 paired captures recorded.

Counts are distinct captures within each category. A capture can contribute to several categories.

## Baseline from the overloaded run

The historical baseline had 48 errors across 71 captures. The receipt audit attributes nearly all of them to the evaluator’s local output validation.

| Error class | Count | Receipt evidence |
| --- | ---: | --- |
| Local output-length validation | 46 | Each was a completed Gemini interaction with parseable JSON, in 10.2–23.8 s. The most common overages were `never_place` (30), `physical_placement.physical_constraints` (22), `placement.why` (17). |
| Product-page retrieval | 1 | The serial gateway link failed before a Gemini request. |
| Unclassified provider or transport error | 1 | `photo-039` recorded one request and a generic error with no HTTP status or response body. |
| Recorded timeouts, HTTP 429s, confirmed safety blocks | 0, 0, 0 | The receipts contain no evidence of a safety block. |

All 46 length-only failures pass validation when the evaluator removes the length caps absent from the sent schema. The fresh baseline retains the original request and scores the returned values in full. The historical receipts remain in the Run 1 ledger and the original Run 3 archive.

## Fresh baseline and Run 3 failure categories

| Diagnosis | Pyre Witness | Baseline |
| --- | ---: | ---: |
| perception miss | 43 | 39 |
| risk omission | 36 | 42 |
| wrong zone | 11 | 8 |
| rule conflict | 3 | 9 |
| physical-safety omission | 2 | 8 |
| timeout | 1 | 1 |
| product link retrieval | 1 | 2 |
| hallucinated technique | 0 | 7 |
| gate error | 0 | 0 |
| object classification | 0 | 0 |
| invented cyber claim | 0 | 0 |
| execution error | 0 | 0 |

## Failed stages

| Stage at failure | Pyre Witness | Baseline |
| --- | ---: | ---: |
| link | 1 | 2 |
| perception timeout | 1 | 0 |
| baseline timeout | 0 | 1 |

## System cases and recommendations

### perception miss (43)

- **photo-002** (clean). Label mismatch in ports.
  - Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — Device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports ethernet\_lan, ethernet\_wan / visible defaults no · cloud no / risks wireless, washdown / ATT&CK T0886, T0822 / rule check passed / P(type match) 0.894
  - Pyre Witness — networked\_device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.894
- **photo-001** (messy). Label mismatch in device type (P(match) 0.45).
  - Expected — Accept device · Ubiquiti UniFi AC Lite access point · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — Device · Continued / Wireless Access Point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, water\_treatment / radios wifi / ports Ethernet / visible defaults no · cloud unknown / risks wireless, default\_creds, washdown / rule check passed / P(type match) 0.489
  - Pyre Witness — networked\_device · Continued / Wi-Fi access point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports Ethernet / visible defaults no · cloud unknown / risks wireless, washdown, physical\_port / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.454
- **photo-003** (edge). Label mismatch in ports, cloud flag.
  - Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
  - Baseline — Device · Continued / Network IP Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3, washdown, nh3\_hazard, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0886 / rule check passed / P(type match) 0.582
  - Pyre Witness — networked\_device · Continued / Network Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.612

Give perception an evidence-backed category and physical-kind decision for each device. Separate supported radio capability from active radio use in the evidence, and use physical connector names when visible or documented.

### wrong zone (11)

- **link-bright-tank** (links). Recommended packaging at Purdue 0, outside the labeled placements.
  - Expected — Accept device · vertical\_tank / areas blending / size 2000 L / risks washdown
  - Baseline — No classification · No gate answer / link · Could not read this product page.
  - Pyre Witness — process\_equipment · Continued / Vertical insulated cylindrical storage tank (Bright Beer Tank) · vessel · vertical\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 2000 L usable / 2242 L total; 2728 x 1404 x 1404 mm / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
- **photo-004** (messy). Recommended parking\_lot at Purdue 5, outside the labeled placements.
  - Expected — Accept device · outdoor Axis network surveillance camera · camera · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / Purdue 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks camera\_view
  - Baseline — Device · Continued / IP Security Camera · camera · ip\_camera / parking\_lot / Purdue 4 / never nh3\_hazard, filler3 / radios none / ports none / visible defaults no · cloud unknown / ATT&CK T0886 / rule check passed / P(type match) 0.708
  - Pyre Witness — networked\_device · Continued / Outdoor IP camera · camera · ip\_camera / parking\_lot / Purdue 5 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.733
- **text-05** (clean). Recommended packaging at Purdue 0, outside the labeled placements.
  - Expected — Accept device · vertical stainless steel carbonated beverage buffer tank · vessel · vertical\_tank / areas blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
  - Baseline — Device · Continued / Vertical jacketed stainless steel buffer tank · vessel · vertical\_tank / blending / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 2000 L working volume, 3 bar rated / risks washdown / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.456
  - Pyre Witness — process\_equipment · Continued / Vertical jacketed stainless tank · vessel · vertical\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 2000 L working volume / risks washdown / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.257

Shortlist rooms and Purdue levels by device function before ranking risk. Check the final room and level together against plant constraints and use an explicit hold when there is no compatible placement.

### rule conflict (3)

- **link-bright-tank** (links). No clear footprint or valid network location for the recommendation.
  - Expected — Accept device · vertical\_tank / areas blending / size 2000 L / risks washdown
  - Baseline — No classification · No gate answer / link · Could not read this product page.
  - Pyre Witness — process\_equipment · Continued / Vertical insulated cylindrical storage tank (Bright Beer Tank) · vessel · vertical\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 2000 L usable / 2242 L total; 2728 x 1404 x 1404 mm / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
- **text-05** (clean). No clear footprint or valid network location for the recommendation.
  - Expected — Accept device · vertical stainless steel carbonated beverage buffer tank · vessel · vertical\_tank / areas blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
  - Baseline — Device · Continued / Vertical jacketed stainless steel buffer tank · vessel · vertical\_tank / blending / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 2000 L working volume, 3 bar rated / risks washdown / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.456
  - Pyre Witness — process\_equipment · Continued / Vertical jacketed stainless tank · vessel · vertical\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 2000 L working volume / risks washdown / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.257
- **link-mixing-tank** (links). No clear footprint or valid network location for the recommendation.
  - Expected — Accept device · agitated\_tank / areas syrup\_room, blending / size 2000 L / risks washdown
  - Baseline — No classification · No gate answer / baseline · The baseline stage timed out.
  - Pyre Witness — process\_equipment · Continued / Mixing tank · vessel · agitated\_tank / packaging / Purdue 0 / never filler3, syrup\_room / radios none / ports none / visible defaults no · cloud unknown / size 2000 L (1200 x 1200 x 2100 mm, 300 kg) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)

Pre-filter candidate placements using the same footprint resolution and blocking rules as the Inspector. When a final check blocks the placement, try another feasible candidate or surface a hold with the blocking rule.

### hallucinated technique (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### gate error (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### object classification (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### invented cyber claim (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### physical-safety omission (2)

- **photo-027** (edge). No as-dropped physical or food-safety concern for filler3. The usability gate stopped this capture.
  - Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable. Existing defocused photograph. No individual device is identifiable.
  - Baseline — Non-device · Stopped
  - Pyre Witness — Non-device · Stopped
- **photo-030** (edge). No as-dropped physical or food-safety concern for filler3. The usability gate stopped this capture.
  - Expected — Non-device. Evaluate physical and food-safety concerns if the capture is usable. Mountain landscape in winter.
  - Baseline — Non-device · Stopped
  - Pyre Witness — Non-device · Stopped

For an identifiable passive object, surface the as-dropped food-contact finding before providing a recommended room. For genuinely unusable input, retain the request for a clearer capture and keep that case visible in coverage.

### timeout (1)

- **photo-017** (messy). perception · The perception stage timed out after 45 seconds. Try again.
  - Expected — Accept device · Itron OpenWay digital smart electricity meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless
  - Baseline — Device · Continued / Smart electric utility meter · instrument · instrument / parking\_lot / Purdue 5 / never nh3\_hazard, filler3, washdown, control\_room / radios none / ports optical / visible defaults no · cloud unknown / size CL200 (200A) / risks transient / rule check passed / P(type match) 0.668
  - Pyre Witness — electrical\_equipment · Continued / perception · The perception stage timed out after 45 seconds. Try again.

Measure Carbon's initial and revision stages separately. Reduce repeated context and set a revision budget that leaves time to deliver the existing placement with any unresolved Inspector blocker.

### risk omission (36)

- **photo-002** (clean). Missed physical\_port.
  - Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — Device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports ethernet\_lan, ethernet\_wan / visible defaults no · cloud no / risks wireless, washdown / ATT&CK T0886, T0822 / rule check passed / P(type match) 0.894
  - Pyre Witness — networked\_device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios wifi / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.894
- **photo-003** (edge). Missed physical\_port.
  - Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
  - Baseline — Device · Continued / Network IP Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3, washdown, nh3\_hazard, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0886 / rule check passed / P(type match) 0.582
  - Pyre Witness — networked\_device · Continued / Network Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.612
- **link-hygienic-pressure** (links). Missed hazardous\_area.
  - Expected — Accept device · instrument / areas water\_treatment, syrup\_room, blending, utilities, filler3, washdown / risks washdown, hazardous\_area
  - Baseline — Device · Continued / Hygienic absolute and gauge pressure transmitter · instrument · instrument / blending / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports 4...20 mA, IO-Link / visible defaults no · cloud no / size 400 mbar...+40 bar / risks washdown / ATT&CK T0856 / rule check passed
  - Pyre Witness — electrical\_equipment · Continued / Pressure transmitter · instrument · instrument / blending / Purdue 0 / never filler3 / radios none / ports 4-20 mA, IO-Link / visible defaults no · cloud no / size 400 mbar to 40 bar / risks transient, washdown / rule check passed

Require one evidence-backed tag per applicable risk and validate tags with the same vocabulary used by the labeled set. Review matched excerpts for cases where the lexical scorer missed equivalent wording.

### product link retrieval (1)

- **link-point-level** (links). link · This page did not return readable product details; try a photo or paste the specs as text.
  - Expected — Accept device · instrument / areas water\_treatment, syrup\_room, blending, utilities, filler3, washdown / risks washdown
  - Baseline — Device · Continued / Vibronic point level switch · sensor · instrument / syrup\_room / Purdue 0 / never nh3\_hazard, corporate\_office, visitor\_corridor, parking\_lot / radios none / ports IO-Link, 2-wire AC/DC or 3-wire DC-PNP / visible defaults no · cloud no / risks washdown / ATT&CK T0836 / rule check passed
  - Pyre Witness — No classification · No gate answer / link · This page did not return readable product details; try a photo or paste the specs as text.

Log whether DNS, connection, download deadline or text extraction prevented assessment. Validate the capture budget against the named vendor pages and keep the pasted-specification fallback.

### execution error (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

## Where the baseline does better

| Check | Eligible pairs | Baseline scored higher | Pyre Witness scored higher | Baseline examples |
| --- | ---: | ---: | ---: | --- |
| Device vs non-device | 71 | 1 | 3 | link-point-level |
| Equipment kind | 63 | 3 | 6 | photo-017, link-point-level, photo-022 |
| Physical area | 62 | 6 | 6 | link-indoor-camera, photo-018, link-point-level |
| Purdue level | 55 | 3 | 2 | photo-004, photo-008, text-07 |
| Rule consistency | 58 | 0 | 8 | — |
| Expected risk tags | 59 | 9 | 17 | photo-008, photo-009, text-08 |

The counts compare each check separately. A single case can favor different sides on different checks. See the report for each side's full scored answer.

## Follow-up evaluation

Keep the baseline definition and scored labels fixed when comparing pipeline changes.
