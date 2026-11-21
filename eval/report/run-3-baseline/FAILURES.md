# Pyre Witness failure analysis

run-3 · 2026-11-21T18:24:42.304Z · 71 of 71 paired captures recorded.

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
| risk omission | 48 | 42 |
| perception miss | 47 | 39 |
| wrong zone | 7 | 8 |
| rule conflict | 4 | 9 |
| physical-safety omission | 2 | 8 |
| hallucinated technique | 0 | 7 |
| gate error | 0 | 0 |
| object classification | 0 | 0 |
| invented cyber claim | 0 | 0 |
| timeout | 0 | 1 |
| product link retrieval | 0 | 2 |
| execution error | 0 | 0 |

## Failed stages

| Stage at failure | Pyre Witness | Baseline |
| --- | ---: | ---: |
| link | 0 | 2 |
| baseline timeout | 0 | 1 |

## System cases and recommendations

### perception miss (47)

- **photo-002** (clean). Label mismatch in ports.
  - Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — Device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports ethernet\_lan, ethernet\_wan / visible defaults no · cloud no / risks wireless, washdown / ATT&CK T0886, T0822 / rule check passed / P(type match) 0.894
  - Pyre Witness — networked\_device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.911
- **photo-001** (messy). Label mismatch in radios, device type (P(match) 0.47).
  - Expected — Accept device · Ubiquiti UniFi AC Lite access point · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — Device · Continued / Wireless Access Point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, water\_treatment / radios wifi / ports Ethernet / visible defaults no · cloud unknown / risks wireless, default\_creds, washdown / rule check passed / P(type match) 0.489
  - Pyre Witness — networked\_device · Continued / Wi-Fi Access Point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios none / ports Ethernet / visible defaults no · cloud unknown / risks wireless, transient, washdown / rule check passed / P(type match) 0.469
- **photo-003** (edge). Label mismatch in ports, cloud flag.
  - Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
  - Baseline — Device · Continued / Network IP Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3, washdown, nh3\_hazard, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0886 / rule check passed / P(type match) 0.582
  - Pyre Witness — networked\_device · Continued / Network Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0882 / rule check passed / P(type match) 0.612

Give perception an evidence-backed category and physical-kind decision for each device. Separate supported radio capability from active radio use in the evidence, and use physical connector names when visible or documented.

### wrong zone (7)

- **link-indoor-camera** (links). Recommended control\_room at Purdue 3, outside the labeled placements.
  - Expected — Accept device · ip\_camera / areas corporate\_office, visitor\_corridor / risks camera\_view, physical\_port
  - Baseline — Device · Continued / IP Dome Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3, washdown, parking\_lot, nh3\_hazard / radios none / ports Ethernet (PoE Class 2) / visible defaults no · cloud unknown / risks washdown / ATT&CK T0886 / rule check passed
  - Pyre Witness — networked\_device · Continued / IP Dome Camera · camera · ip\_camera / control\_room / Purdue 3 / never filler3 / radios none / ports Ethernet (PoE), Memory card slot / visible defaults no · cloud unknown / risks washdown / ATT&CK T0882 / rule check passed
- **photo-018** (messy). Recommended utilities at Purdue 0, outside the labeled placements.
  - Expected — Accept device · vertical stainless steel fermentation tank · vessel · vertical\_tank / areas water\_treatment, syrup\_room, blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
  - Baseline — Device · Continued / Stainless steel jacketed vertical tank · vessel · vertical\_tank / blending / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 150 Hls (15,000 L) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.349
  - Pyre Witness — process\_equipment · Continued / Vertical process tank · vessel · vertical\_tank / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 150 Hls / risks washdown / rule check passed / P(type match) 0.277
- **photo-021** (clean). Recommended packaging at Purdue 1, outside the labeled placements.
  - Expected — Accept device · industrial pushbutton operator station · hmi · hmi / areas packaging, control\_room / Purdue 2 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown
  - Baseline — Device · Continued / Industrial control panel · controller · plc\_cabinet / utilities / Purdue 1 / never filler3, washdown, nh3\_hazard, corporate\_office / radios none / ports none / visible defaults no · cloud unknown / size 760 x 760 x 210 mm / risks washdown / ATT&CK T0859 / blocked (HAZ-01 Ammonia-area rating unverified) / P(type match) 0.461
  - Pyre Witness — electrical\_equipment · Continued / Electrical control cabinet · controller · plc\_cabinet / packaging / Purdue 1 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / size 760 x 760 x 210 mm / risks transient, washdown / rule check passed / P(type match) 0.220

Shortlist rooms and Purdue levels by device function before ranking risk. Check the final room and level together against plant constraints and use an explicit hold when there is no compatible placement.

### rule conflict (4)

- **link-bright-tank** (links). No clear footprint or valid network location for the recommendation.
  - Expected — Accept device · vertical\_tank / areas blending / size 2000 L / risks washdown
  - Baseline — No classification · No gate answer / link · Could not read this product page.
  - Pyre Witness — process\_equipment · Continued / Bright Beer Tank (Vertical Insulated Cylindrical Storage Tank) · vessel · vertical\_tank / blending / Purdue 0 / never washdown / radios none / ports none / visible defaults no · cloud unknown / size 2000 L usable / 2242 L total (2728 x 1404 x 1404 mm, 355 kg) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
- **photo-024** (clean). HAZ-01 Ammonia-area rating unverified
  - Expected — Accept device · plate-and-frame heat exchanger · machine · heat\_exchanger / areas water\_treatment, blending, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
  - Baseline — Device · Continued / Plate Heat Exchanger · other · heat\_exchanger / utilities / Purdue 0 / never corporate\_office, control\_room, visitor\_corridor / radios none / ports none / visible defaults no · cloud no / risks washdown / rule check passed / P(type match) 0.669
  - Pyre Witness — process\_equipment · Continued / Plate heat exchanger · machine · heat\_exchanger / utilities / Purdue 0 / never filler3, nh3\_hazard / radios none / ports 4x threaded pipe connections / visible defaults no · cloud unknown / risks transient, washdown / blocked (HAZ-01 Ammonia-area rating unverified) / P(type match) 0.703
- **link-mixing-tank** (links). No clear footprint or valid network location for the recommendation.
  - Expected — Accept device · agitated\_tank / areas syrup\_room, blending / size 2000 L / risks washdown
  - Baseline — No classification · No gate answer / baseline · The baseline stage timed out.
  - Pyre Witness — process\_equipment · Continued / Agitated mixing tank · vessel · agitated\_tank / water\_treatment / Purdue 0 / never filler3, nh3\_hazard / radios none / ports none / visible defaults no · cloud unknown / size 2000 L (1200 x 1200 x 2100 mm) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)

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

### timeout (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### risk omission (48)

- **photo-002** (clean). Missed physical\_port.
  - Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — Device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports ethernet\_lan, ethernet\_wan / visible defaults no · cloud no / risks wireless, washdown / ATT&CK T0886, T0822 / rule check passed / P(type match) 0.894
  - Pyre Witness — networked\_device · Continued / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0860, T0886 / rule check passed / P(type match) 0.911
- **photo-001** (messy). Missed physical\_port.
  - Expected — Accept device · Ubiquiti UniFi AC Lite access point · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
  - Baseline — Device · Continued / Wireless Access Point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, water\_treatment / radios wifi / ports Ethernet / visible defaults no · cloud unknown / risks wireless, default\_creds, washdown / rule check passed / P(type match) 0.489
  - Pyre Witness — networked\_device · Continued / Wi-Fi Access Point · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3 / radios none / ports Ethernet / visible defaults no · cloud unknown / risks wireless, transient, washdown / rule check passed / P(type match) 0.469
- **photo-003** (edge). Missed camera\_view, physical\_port.
  - Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
  - Baseline — Device · Continued / Network IP Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3, washdown, nh3\_hazard, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0886 / rule check passed / P(type match) 0.582
  - Pyre Witness — networked\_device · Continued / Network Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0882 / rule check passed / P(type match) 0.612

Require one evidence-backed tag per applicable risk and validate tags with the same vocabulary used by the labeled set. Review matched excerpts for cases where the lexical scorer missed equivalent wording.

### product link retrieval (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### execution error (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

## Where the baseline does better

| Check | Eligible pairs | Baseline scored higher | Pyre Witness scored higher | Baseline examples |
| --- | ---: | ---: | ---: | --- |
| Device vs non-device | 71 | 0 | 3 | — |
| Equipment kind | 63 | 5 | 3 | photo-006, photo-035, photo-049 |
| Physical area | 62 | 3 | 9 | link-indoor-camera, photo-018, text-07 |
| Purdue level | 55 | 2 | 2 | photo-049, text-07 |
| Rule consistency | 60 | 1 | 8 | photo-024 |
| Expected risk tags | 59 | 15 | 10 | photo-008, photo-011, link-lte-gateway |

The counts compare each check separately. A single case can favor different sides on different checks. See the report for each side's full scored answer.

## Follow-up evaluation

Keep the baseline definition and scored labels fixed when comparing pipeline changes.
