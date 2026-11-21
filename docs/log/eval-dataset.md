# Pyre Witness evaluation dataset

The set contains 54 third-party Wikimedia Commons photos, nine project-authored text captures and eight live product links. Forty-six photos show devices. The eight negatives are a mug, potted plant, chair, landscape, defocused frame, photographed written document, cardboard box and traffic cone.

| Capture | Clean | Messy | Edge | Total |
| --- | ---: | ---: | ---: | ---: |
| Photo | 27 | 16 | 11 | 54 |
| Text | 3 | 4 | 2 | 9 |
| Product URL | — | — | — | 8 |

| Category | Photos | Text |
| --- | ---: | ---: |
| camera | 3 | 1 |
| computer | 4 | 1 |
| controller | 5 | 0 |
| gateway | 3 | 2 |
| hmi | 2 | 0 |
| instrument | 4 | 1 |
| machine | 1 | 0 |
| network | 5 | 0 |
| phone | 1 | 0 |
| removable_storage | 3 | 1 |
| rotating_equipment | 2 | 0 |
| sensor | 10 | 2 |
| valve | 2 | 0 |
| vessel | 1 | 1 |
| Negative | 8 | 0 |

Linked products cover two tanks, two field instruments, two network cameras and two gateways. The file pages, credits, licence terms and device references are recorded in [SOURCES.md](../../eval/dataset/SOURCES.md).

## Label decisions

- The curator inspected the photographs and compared them with Commons file descriptions. `clean` covers clearly presented equipment. `messy` includes installed hardware, cables, glare, low light and partial views. The eleven edge cases include three positive devices with atypical age or operating range.
- Model-specific documentation informed radio and port labels when the variant was identifiable. `unknown` means the evidence cannot establish a complete list or cloud capability. Among 55 positive image and text rows, 22 have unknown radio lists, 27 have unknown port lists and 29 have unknown cloud capability. A documented cloud feature can be available without being active on the pictured unit.
- Ground truth describes defensible roles in the fictional plant. Field probes and passive process equipment generally sit at Level 0, basic controls at Level 1, and HMIs at Level 2. Enterprise and brokered vendor roles use Levels 4 and 3.5. The notes describe conditional placement, including suitable process media, dry locked enclosures, segregation and hygiene or hazardous-area qualifications.
- The dimensions in the link manifest refer to the product body where the HTML gives a specific value. Tank capacities are usable volume. Where the visible page offers several sizes with no selected configuration, the size field is blank.

## Verification

- `npx tsx eval/validate.ts` printed `Validated 71 evaluation items.` It also passed the first 30-photo tranche with eight links before expansion.
- A separate audit decoded all 54 JPEGs and matched their source and licence to the attribution table. Each Commons source and image hash was unique. A perceptual-hash screen found no near matches. Long edges were 500–1600 px and the largest JPEG was 1,270,812 bytes.
- All eight product URLs returned HTTP 200 with product details in visible HTML before JavaScript execution. The app's link extractor returned useful text for each page, including dimensions when specified in the CSV. Moxa's full connector table is visible in the source HTML and absent from the extracted snapshot.
- `npm run typecheck` passed.
- `npm run test -- --maxWorkers=1` passed with 205 tests and three skipped. The default parallel run exceeded the Inspector's separate 15 ms performance budget, measuring about 50 ms on retry.

## Label limitations

- The Huawei modem and ThinkPad may have different interface options across variants. The PLC and camera examples with obstructed labels generally support family- or device-class identification. The wired control-cabinet row uses the cabinet as the unit of analysis because its controller is unclear.
- The LevelPro frame contains a radar transmitter and a high-level switch. The shared tank level-sensing label credits their common purpose. The 2500-bar manometer has a field-instrument level label and no scored area because the seed has no corresponding duty.
- Placement labels come from one curator interpreting the seed. Area and Purdue level are scored independently by the current format. Public Commons images may have prior team or model exposure.
