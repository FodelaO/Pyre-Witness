# equipment-devices-b

## What was built

Implemented the 7 parametric SVG floor/network symbols for user-introduced plant devices in `src/equipment/kinds/`:

- `src/equipment/kinds/wifi_ap.tsx` — Ceiling-mount circular Wi-Fi access point (`round` frame) with flange vent ticks, raised radome, status LED ring, subtle Wi-Fi emitter mark, and staggered `.pw-wave` concentric RF rings when `running`.
- `src/equipment/kinds/ip_camera.tsx` — Wall-mounted bullet IP security camera with mounting plate, articulated pivot bracket, overhanging weather hood, curved glass optic with specular highlight, pulsing recording LED (`var(--pw-alarm)` when active), and a faint linear-gradient field-of-view wedge.
- `src/equipment/kinds/gateway.tsx` — Industrial DIN-rail IoT/cellular gateway with horizontal DIN rail backing, twin SMA whip antennas (primary + diversity), recessed RJ45 port, 3-LED status bank (power, RF link, status/fault), 4-pin bottom screw terminal block, and faint `.pw-wave` radio arcs on the primary antenna when `running`.
- `src/equipment/kinds/laptop.tsx` — Open engineering laptop with backlit gradient screen, subtle telemetry traces, hinge barrel, angled trapezoidal keyboard deck, keywell, touchpad, front lip, and corner status LED.
- `src/equipment/kinds/phone.tsx` — Smartphone elevation with side hardware keys, backlit display, front punch-hole camera dot, top earpiece slit, subtle UI lines, status indicator dot, and bottom gesture bar.
- `src/equipment/kinds/usb_drive.tsx` — Horizontal USB flash drive with exposed metallic Type-A connector plug (metallic sheen gradient + signature dual square retention cutouts), chamfered body, grip ribs, rear lanyard eyelet, and activity LED.
- `src/equipment/kinds/generic_device.tsx` — Neutral, question-mark-free unidentified electronics module: chamfered square enclosure with corner screw bosses, bottom shielded I/O connector stub, central IC/microchip outline with radiating pins, and status LED.

## Key decisions

- **ISA-101 visual restraint:** All bodies use `EQ.stroke`, `EQ.fill`, `EQ.fill2`, `EQ.accent`, and `EQ.sw` (with `0.6x–0.9x` sub-weights for micro-details). Saturated colour is strictly limited to radio emissions / screen backlight (`var(--pw-info)`) and status/recording LEDs (`var(--pw-ok)`, `var(--pw-attention)`, `var(--pw-alarm)`).
- **Centered `.pw-wave` bounding boxes:** For `gateway`, radio wave arcs around the offset antenna tip include a transparent concentric `<circle>` inside each animated `<g className="pw-wave">` so CSS `transform-box: fill-box; transform-origin: center` expands radially from the antenna tip without drift. For `wifi_ap`, 3 staggered `.pw-wave` rings (`0s`, `-0.73s`, `-1.46s`) expand to `r=16.4` outside the `r=9.6` disc while staying well inside the `r=21` selection halo.
- **Unique SVG IDs:** All `<linearGradient>` definitions (`ip_camera`, `laptop`, `phone`, `usb_drive`) use React `useId()` so multiple instances on the floor and Purdue map never collide.
- **`compact` and `status` compliance:** Every symbol strips internal micro-details (vents, traces, screw bosses, ribs) when `compact` is true, suppresses active animations/glows when `status === "offline"`, reflects `alarm`/`attention` on status LEDs, and delegates halos/placement outlines/labels entirely to `<SymbolFrame>`.

## How to verify

1. `npm run typecheck` — verifies all 7 components against `EquipmentComponent` and `FOOTPRINT[kind]`.
2. Open `http://localhost:4119/gallery` and toggle **Animate equipment** to inspect all 7 symbols across `Running`, `Stopped`, `Selected`, `Recommended`, `Unsafe`, `Alarm`, and `Compact` states.

## Known gaps

- None for the 7 symbols (`npm run typecheck` passes cleanly across the entire repository). No standalone unit tests were added for pure SVG presentation components; visual and runtime verification was performed directly against the live `/gallery` route via headless Chrome screenshots.
