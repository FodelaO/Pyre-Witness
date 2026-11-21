# Process equipment symbols

Implemented the 16 process equipment symbols and the `/gallery` review page. Each symbol draws around the origin in its registered footprint and uses `SymbolFrame` for selection, linked highlight, placement, status, and labels.

- The vessel elevations show dished heads, supports, nozzles, and clipped liquid levels. The vertical and agitated tanks display a percentage. The agitator has a side-on impeller, and the carbonator combines a contact vessel with a plate pack.
- The pump has a tangential discharge, rotating impeller, and finned drive. The pneumatic valve has distinct open and closed trim. The instrument renders the supplied function letters and uses an alarm-colored bubble when applicable.
- The RO skid, UV chamber, plate exchanger, and screw compressor use individually drawn housings, drives, flanges, and fittings. The condenser has three axial fans and a visible serpentine coil.
- The packaging equipment is drawn in plan. The filler has 24 heads and paired transfer stars. Bottles advance on the conveyor when running. The labeler shows reel paths, and the palletizer shows a robot, case infeed, and loaded pallet.

`src/equipment/process/` contains the shared vessel and packaging geometry, the process motion CSS, and the gallery styles. SVG definitions use React instance IDs. Animations follow the running prop and the existing reduced-motion rules. Compact mode removes inner text and secondary detail.

`src/equipment/Gallery.tsx` and `src/app/gallery/page.tsx` provide a responsive review of every registry entry. Running, stopped, selected, recommended, unsafe, alarm, and compact previews appear on each card. The liquid-level examples apply to the four level-bearing symbols. The gallery opens paused. Its animation switch starts the operating previews and cycles the main vessel previews through 55%, 90%, and 20%.

## Verification

- `npm run typecheck` and focused ESLint passed.
- `curl -s -o /dev/null -w '%{http_code}' http://localhost:4119/gallery` returned `200`.
- Inspected a raster contact sheet made from the live gallery SVGs. Checked 29 cards, all 16 process silhouettes, the tank label margins, state variants, vessel level geometry, 24 filler heads, three condenser fans, and unique SVG definition IDs. Verified the running and stopped markup and the compiled motion CSS.
- `npm run test` passed all six tests in the available suite.

## Known gaps

macOS sandbox permissions blocked browser playback. The visual check covered static SVGs and the motion check covered markup and CSS. The 13 separate control and device kinds used their registry placeholders at verification time. The current floor call site supplies the kind, tag, and selection. Wiring live running and level values at that call site belongs to the floor lane.

No shared contract change requests.
