# Pyre Witness failure analysis

run-5 · 2026-11-21T20:32:44.066Z · 71 of 71 paired captures recorded.

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
| perception miss | 33 | 39 |
| risk omission | 33 | 42 |
| wrong zone | 9 | 8 |
| rule conflict | 2 | 9 |
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

### perception miss (33)

- **photo-003** (edge). Label mismatch in ports, cloud flag.
  - Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
  - Baseline — Device · Continued / Network IP Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3, washdown, nh3\_hazard, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0886 / rule check passed / P(type match) 0.582
  - Pyre Witness — networked\_device · Continued / Axis 2100 Network Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.978
- **link-bright-tank** (links). Label mismatch in capacity or size.
  - Expected — Accept device · vertical\_tank / areas blending / size 2000 L / risks washdown
  - Baseline — No classification · No gate answer / link · Could not read this product page.
  - Pyre Witness — process\_equipment · Continued / Vertical insulated bright beer tank (BBTVI-2000C) · vessel · vertical\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 2000 L usable / 2242 L total (2728 x 1404 x 1404 mm) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
- **photo-007** (clean). Label mismatch in ports, cloud flag, device type (P(match) 0.43).
  - Expected — Accept device · Siemens SIMATIC OP77B keypad operator panel · hmi · hmi / areas packaging, control\_room / Purdue 2 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RS-485, RS-232, USB-A, MMC / visible defaults no / cloud no / risks physical\_port, removable\_media, washdown
  - Baseline — Device · Continued / Operator Panel HMI · hmi · hmi / control\_room / Purdue 2 / never nh3\_hazard, washdown, visitor\_corridor, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0855 / rule check passed / P(type match) 0.446
  - Pyre Witness — electrical\_equipment · Continued / Siemens SIMATIC HMI operator panel · hmi · hmi / packaging / Purdue 2 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown / rule check passed / P(type match) 0.432

Give perception an evidence-backed category and physical-kind decision for each device. Separate supported radio capability from active radio use in the evidence, and use physical connector names when visible or documented.

### wrong zone (9)

- **link-bright-tank** (links). Recommended packaging at Purdue 0, outside the labeled placements.
  - Expected — Accept device · vertical\_tank / areas blending / size 2000 L / risks washdown
  - Baseline — No classification · No gate answer / link · Could not read this product page.
  - Pyre Witness — process\_equipment · Continued / Vertical insulated bright beer tank (BBTVI-2000C) · vessel · vertical\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 2000 L usable / 2242 L total (2728 x 1404 x 1404 mm) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
- **photo-004** (messy). Recommended parking\_lot at Purdue 5, outside the labeled placements.
  - Expected — Accept device · outdoor Axis network surveillance camera · camera · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / Purdue 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks camera\_view
  - Baseline — Device · Continued / IP Security Camera · camera · ip\_camera / parking\_lot / Purdue 4 / never nh3\_hazard, filler3 / radios none / ports none / visible defaults no · cloud unknown / ATT&CK T0886 / rule check passed / P(type match) 0.708
  - Pyre Witness — networked\_device · Continued / Outdoor IP surveillance camera · camera · ip\_camera / parking\_lot / Purdue 5 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks transient, washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.831
- **text-05** (clean). Recommended utilities at Purdue 0, outside the labeled placements.
  - Expected — Accept device · vertical stainless steel carbonated beverage buffer tank · vessel · vertical\_tank / areas blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
  - Baseline — Device · Continued / Vertical jacketed stainless steel buffer tank · vessel · vertical\_tank / blending / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports none / visible defaults no · cloud no / size 2000 L working volume, 3 bar rated / risks washdown / blocked (No clear footprint or valid network location for the recommendation.) / P(type match) 0.456
  - Pyre Witness — process\_equipment · Continued / Vertical jacketed stainless steel tank · vessel · vertical\_tank / utilities / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 2000 L working volume / risks washdown / rule check passed / P(type match) 0.237

Shortlist rooms and Purdue levels by device function before ranking risk. Check the final room and level together against plant constraints and use an explicit hold when there is no compatible placement.

### rule conflict (2)

- **link-bright-tank** (links). No clear footprint or valid network location for the recommendation.
  - Expected — Accept device · vertical\_tank / areas blending / size 2000 L / risks washdown
  - Baseline — No classification · No gate answer / link · Could not read this product page.
  - Pyre Witness — process\_equipment · Continued / Vertical insulated bright beer tank (BBTVI-2000C) · vessel · vertical\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 2000 L usable / 2242 L total (2728 x 1404 x 1404 mm) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)
- **link-mixing-tank** (links). No clear footprint or valid network location for the recommendation.
  - Expected — Accept device · agitated\_tank / areas syrup\_room, blending / size 2000 L / risks washdown
  - Baseline — No classification · No gate answer / baseline · The baseline stage timed out.
  - Pyre Witness — process\_equipment · Continued / Agitated mixing tank (MXTP-2000MG) · vessel · agitated\_tank / packaging / Purdue 0 / never filler3 / radios none / ports none / visible defaults no · cloud no / size 2000 L (1200 x 1200 x 2100 mm) / risks washdown / blocked (No clear footprint or valid network location for the recommendation.)

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

### risk omission (33)

- **photo-003** (edge). Missed physical\_port.
  - Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
  - Baseline — Device · Continued / Network IP Camera · camera · ip\_camera / visitor\_corridor / Purdue 4 / never filler3, washdown, nh3\_hazard, parking\_lot / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0886 / rule check passed / P(type match) 0.582
  - Pyre Witness — networked\_device · Continued / Axis 2100 Network Camera · camera · ip\_camera / corporate\_office / Purdue 4 / never filler3 / radios none / ports none / visible defaults no · cloud unknown / risks washdown, camera\_view / ATT&CK T0882 / rule check passed / P(type match) 0.978
- **link-hygienic-pressure** (links). Missed hazardous\_area.
  - Expected — Accept device · instrument / areas water\_treatment, syrup\_room, blending, utilities, filler3, washdown / risks washdown, hazardous\_area
  - Baseline — Device · Continued / Hygienic absolute and gauge pressure transmitter · instrument · instrument / blending / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports 4...20 mA, IO-Link / visible defaults no · cloud no / size 400 mbar...+40 bar / risks washdown / ATT&CK T0856 / rule check passed
  - Pyre Witness — electrical\_equipment · Continued / Endress+Hauser Cerabar PMP23 pressure transmitter · instrument · instrument / blending / Purdue 0 / never filler3 / radios none / ports 4-20 mA, IO-Link / visible defaults no · cloud no / size 400 mbar to +40 bar / risks transient, washdown / rule check passed
- **photo-008** (messy). Missed physical\_port, removable\_media.
  - Expected — Accept device · Lenovo ThinkPad T480 laptop · computer · laptop / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / visible defaults no / risks wireless, transient, physical\_port, removable\_media
  - Baseline — Device · Continued / Laptop computer · computer · laptop / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, visitor\_corridor / radios wifi, bluetooth / ports USB-C power / visible defaults no · cloud yes / risks wireless, transient, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.490
  - Pyre Witness — networked\_device · Continued / Lenovo ThinkPad T480 laptop · computer · laptop / corporate\_office / Purdue 4 / never filler3 / radios wifi, bluetooth / ports none / visible defaults no · cloud unknown / risks wireless, transient, washdown / ATT&CK T0886, T0860 / rule check passed / P(type match) 0.955

Require one evidence-backed tag per applicable risk and validate tags with the same vocabulary used by the labeled set. Review matched excerpts for cases where the lexical scorer missed equivalent wording.

### product link retrieval (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

### execution error (0)

Zero observed cases in this cohort. See placement coverage for how many runs reached a recommendation.

## Where the baseline does better

| Check | Eligible pairs | Baseline scored higher | Pyre Witness scored higher | Baseline examples |
| --- | ---: | ---: | ---: | --- |
| Device vs non-device | 71 | 0 | 3 | — |
| Equipment kind | 63 | 1 | 6 | photo-022 |
| Physical area | 62 | 4 | 8 | photo-018, text-07, text-05 |
| Purdue level | 55 | 3 | 3 | photo-004, photo-049, text-07 |
| Rule consistency | 60 | 0 | 9 | — |
| Expected risk tags | 59 | 4 | 24 | photo-014, photo-037, text-03 |

The counts compare each check separately. A single case can favor different sides on different checks. See the report for each side's full scored answer.

## Follow-up evaluation

Keep the baseline definition and scored labels fixed when comparing pipeline changes.
