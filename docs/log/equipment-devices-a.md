# Control and network equipment symbols (`equipment-devices-a`)

Implemented the 6 parametric SVG symbols for control and network equipment plus shared LED helpers. Every symbol renders as a front-elevation `<g>` centred on `(0,0)` strictly inside its `FOOTPRINT[kind]` box, wrapped in `<SymbolFrame>` for selection, linked highlight, placement outlines, abnormal-state rings, and ISA-5.1 tags.

## What was built

- **`src/equipment/control/control.css`** and **`src/equipment/control/led.tsx`**: Shared ISA-101 LED state resolver (`resolveLedState`), circular and rectangular LED primitives (`StatusLed`, `RectLed`), and subtle staggered LED blink/flicker CSS keyframes (automatically disabled under `prefers-reduced-motion` via `src/app/globals.css`). Colour is strictly reserved for operating/fault state (`--pw-ok` when `running` and not `offline`, `--pw-attention` / `--pw-alarm` for abnormal `status`, muted steel when stopped/offline).
- **`src/equipment/kinds/plc_cabinet.tsx`** (`34 × 44`): NEMA/IP65 steel enclosure with drip hood, hinged door and swing latch, inspection window revealing a horizontal DIN rail with power supply, accented CPU, and two I/O modules, softly blinking status LEDs when `running`, lower louver vents and nameplate, and three bottom cable glands.
- **`src/equipment/kinds/hmi.tsx`** (`34 × 30`): Panel-mounted operator touch screen with chamfered bezel, SCADA mimic graphic (mini tank outline with level line + 3 process bar columns), row of 5 soft keys (3 in `compact`), top status LEDs, and a clearly visible side-mounted bulkhead USB port on the right bezel edge.
- **`src/equipment/kinds/workstation.tsx`** (`40 × 34`): Engineering desk workstation pairing a widescreen monitor displaying a historian trend line and reference grid, an angled foreground keyboard, and a desk PC tower with optical bay, front I/O, power button, intake louvers, and activity LED.
- **`src/equipment/kinds/server_rack.tsx`** (`34 × 52`): 19-inch rack cabinet with airflow crown, vertical mounting rails, leveling feet, top 1U patch/management chassis, three stacked 2U servers with 4 hot-swap drive bays each and staggered flickering activity LEDs when `running`, and a bottom 1U UPS/PDU.
- **`src/equipment/kinds/firewall.tsx`** (`40 × 28`): 1U rackmount security appliance with a central shield crest containing a running-bond brick-wall pattern clipped via a React `useId()` `<clipPath>`, left status LED stack and vents, and right segmented security ports with link LEDs — visually distinct from `network_switch` at all scales.
- **`src/equipment/kinds/network_switch.tsx`** (`44 × 18`): Low-profile 1U managed Ethernet switch with rack-mount ears, left power/fault LEDs, a row of 6 RJ45 copper ports with latch notches and subtly blinking link LEDs when `running`, and 2 SFP fiber uplink cages.

All 6 symbols honour `compact` (simplified geometry, no inner text, fewer micro-details for Purdue map and list readability).

## Verification

- `npm run typecheck` passed cleanly on the initial full-repo check; on re-run after final visual polish, zero errors exist in `src/equipment/**` (five transient errors appeared in concurrent agents' in-progress files: `eval/baseline.ts`, `eval/dataset.ts`, and `src/app/api/watch/run/route.ts`).
- Focused ESLint on all 7 TypeScript/TSX files passed with zero warnings or errors.
- `npm run test` passed all 11 test files (61 tests) on the initial run; on re-run alongside concurrent agents' new tests, 14 of 15 test files (78/79 tests) passed, with a single CPU-timing variance failure in `src/rules/engine.test.ts` (outside this lane).
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:4119/gallery` returned `200`.
- Rendered all 6 symbols across 9 states (`running`, `stopped`, `selected`, `recommended`, `unsafe`, `attention`, `alarm`, `offline`, `compact`) plus a 2.3× detail row via `renderToStaticMarkup` and rasterized the contact sheet with `sharp` for visual inspection. Automated checks confirmed unique `useId()` clip-path IDs across multiple instances, zero `<text>` nodes in `compact` mode, LED animation classes present only when `running`, and `--pw-alarm` state rendering.

## Known gaps

- Visual verification was performed on static rasterized SVGs and compiled CSS/markup rather than a live interactive browser recording.
- No shared contract change requests.
