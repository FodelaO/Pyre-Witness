# Pipeline lens integration

The lens is a shared Zustand store. Material is the first-visit view. `mode` changes on release, click or keyboard input. `position` and `weights` update continuously during a drag. Mount the slider once and use the same store across the floor, results, simulation and capture.

## Shell and camera

1. Import `LensToggle` from `@/layers/LensToggle` in `src/shell/TopBar.tsx`. Mount it in the header beside the existing drawing controls, outside the SVG and outside the stage gesture handlers. Show it when `view !== "purdue"`, since the lens changes the floor in Floor and Split. Keep a single tab stop for the slider.
2. In `src/floor/FloorStage.tsx`, import `useLensVars` from `@/layers/useLensVars` and call it at the component top level. Set `style={lensVars}` on the `div.pw-plant-floor` that owns `camera.paneRef`. The global stylesheet loads the lens styles, and the hook restores the persisted mode after hydration. Keep the blueprint, camera transform, fitting and gesture handlers independent of the lens.
3. Pass camera zoom relative to fit into both `DataLayer` passes. For the existing imperative camera, expose a `lensDetail` boolean that changes only when `next.scale / fit.current.scale` crosses 1.5 in `paint()`. Pass `zoom={lensDetail ? 1.5 : 1}` to the layer. React does not need the zoom number on every frame.
4. Import `LensLegend` from `@/layers/LensLegend`. Place it next to the floor's existing media controls in the fixed `.pw-floor-legend` region so the fit calculation budgets its footprint. Wrap the existing pipe-media controls with `.lens-material-only` or render them only when Material or Both is committed.

## World layer order

Mount these in `g.pw-floor-world` where `camera.worldRef` is attached. Imports for `DataLayer` and `ConnectorLayer` are default exports from `@/layers/DataLayer` and `@/layers/ConnectorLayer`.

```tsx
<g ref={camera.worldRef} className="pw-floor-world">
  <Blueprint plant={plant} />
  <g className="lens-material-only"><ZoneLayer {...zoneProps} /></g>
  <g className="lens-material-only"><PipeLayer assets={assets} hidden={materialHidden} /></g>
  <DataLayer pass="underlay" zoom={lensZoom} />
  <ConnectorLayer />
  <g className="lens-material-only"><EntryPoints {...entryProps} points={physicalEntries} /></g>
  <AssetLayer {...assetProps} />
  <g className="lens-material-only"><ZoneLabels {...labelProps} /></g>
  <g className="lens-data-only"><AttackPathLayer twin={twin} focused={focused} /></g>
  <DataLayer pass="annotations" zoom={lensZoom} />
  <g className={simulationLensClass}><SimLayer /></g>
  <CrewLayer />
  <DropPin />
</g>
```

Adapt the props to the current floor composition. `materialHidden` is the current set of hidden media plus `"network"`, in every mode. `physicalEntries` filters `twin.entryPoints` with `!isDigitalEntry(entry)` from `@/layers/lensClassification`. `DataLayer` owns the digital entry markers, which use the existing `data-floor-target` event delegation. `ConnectorLayer` observes the shared `hoveredId` and publishes the chain into `highlightIds`. Keep the existing `hover`, `select` and focus projection wired to the SVG symbols.

| Floor element | Application |
| --- | --- |
| Building outline, grid, capture pin | Shared geometry |
| Physical rooms and zone labels, washdown, NH₃ hazard | `lens-material-only` |
| Material pipes, process utilities, electrical lines | `lens-material-only`. Hide the original network medium at the `PipeLayer` boundary |
| Process symbols, including valves and networked process machines | `lens-ghost-in-data` |
| Controllers, HMIs, switches, servers, firewalls, gateways and IT devices | `lens-ghost-in-material` |
| Instrument symbols | Shared between process telemetry and controls |
| Displayed process readings | `lens-material-only` |
| Visitor, insider and supplier delivery markers | `lens-material-only` |
| Internet, vendor remote and nearby RF | `DataLayer` annotations |
| Existing simulated paths from the risk report | `lens-data-only` |
| IEC 62443 zones, data packets, conduit gates, software and findings | `DataLayer` |
| Field signal taps and chain | `ConnectorLayer` |
| Crew and placement feedback | Shared. Keep idle patrol and pipeline statuses as currently labelled |
| Simulation overlay | `lens-material-only` for physical scenarios, `lens-data-only` for cyber scenarios. A cross-domain scenario can split its overlay by effect |

Use `lensAssetClass(asset)` from `@/layers/lensClassification` on each asset's symbol/hit group. If the floor supplies an explicit hit style below a hidden group, gate it too. For `pw-floor-pipe-hit` use `pointer-events: var(--lens-material-hit-stroke, stroke)` and for `pw-floor-zone-label-back` use `pointer-events: var(--lens-material-hit-all, all)`. Keyboard focus can temporarily reveal a ghost. Maintain the floor's existing asset focus and selection attributes.

## Results, simulation and capture

Read `useLensStore((state) => state.mode)` in each owner. Derive `showMaterial = mode !== "data"` and `showData = mode !== "material"` from the committed stop. Keep active runs, capture drafts, selections and operator decisions in the existing stores as modes change.

| Owner | Material | Both | Data |
| --- | --- | --- | --- |
| Results and asset inspector | Physical and food-safety risks, physical compliance, process telemetry, Fit Preview | All existing results and linked details | Cyber findings, digital compliance, simulated attack paths, software, matched Threat Watch reports pinned to the affected nodes |
| Simulation launcher | CIP, ammonia, chiller and carbonation | All scenarios | Ransomware and wireless. Preserve the controls for a replay already started in another lens |
| Capture dock | Existing photo, video and voice capture where available, placement and generated Fit Preview | All current inputs and outputs | Label the same capture entry point “Integrate a new technology”. Follow the existing photo/link/description pipeline, then surface network fit and findings |

Use existing finding metadata for filtering. For mixed compliance, use its existing source reference and keep the underlying result available. `DataLayer` reads the active in-memory or restored Threat Watch reports and labels assumed software for the simulated plant. The view never initiates a watch run. Follow `getDataModel(twin).vulnerabilityOf()` for exact node matching if the inspector displays the same evidence.

`/lens` shows the seed twin and demonstrates the layer order independently of the app shell.
