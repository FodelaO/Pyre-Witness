<!-- Delivery and verification notes for the global theme preference. -->
# Theme switch

`src/theme/themeStore.ts` stores the preference under `pw-theme` and applies it to the document. The inline script in `src/app/layout.tsx` selects the palette before the page renders. Dark is the default. `src/theme/ThemeToggle.tsx` uses the shared instrument button and gives the sun or moon an accessible action name.

`src/theme/light.css` uses warm paper, graphite linework and mid-steel equipment. It redefines all 32 drawing tokens imported by `src/app/globals.css`. Scoped rules cover hard-coded inks, fills and overlays in the schematic, data and Purdue lenses, crew, capture, transcript and proof surfaces.

## Verification

- `npx --no-install vitest run src/theme --maxWorkers=1` passed all four cases for defaulting, toggling, persistence and blocked storage.
- Both toggle states rendered as native buttons with the corresponding icon and accessible action name.
- Whole-repo typecheck passed with `npx --no-install tsc --noEmit --incremental false`. The first run hit a full disk while writing its cache and read stale generated route types.
- The CSS audit found that every new rule requires `data-theme="light"`. Across the four base surfaces, the lowest opaque text, state, crew and media contrast was 5.03:1. The strong border token reached at least 3.85:1, and equipment outlines reached 3.89:1 against mid-steel fills.
- The main route and `/proof` returned HTTP 200. The main route served the light stylesheet and head bootstrap. The rendered proof bootstrap selected the expected palette for light, dark, absent, invalid and blocked storage.
- `node src/theme/verify.mjs` checks the keyboard switch, reload, nine 1440×900 screenshots and exact equality of dark computed palette values with and without the theme attribute. Installed Chrome aborted before it could create a page in this session, so the interaction checks and screenshots remain pending.

## Integration

The orchestrator owns `src/shell/TopBar.tsx`. The two mount lines are in [MOUNTING.md](../../src/theme/MOUNTING.md).

## Shared follow-ups

The workspace permissions rejected the write to `.agents/requests/theme-switch.md`.

- [src/app/layout.tsx line 31](../../src/app/layout.tsx#L31) sets a fixed browser toolbar color. Switching that color requires coordination with the root metadata.
- [src/app/capture/route.ts line 10](../../src/app/capture/route.ts#L10) serves the phone sender as its own document. Its separate theme is in [src/app/capture/phone.css lines 3–15, 47, 83 and 99](../../src/app/capture/phone.css#L3). Propagating the laptop setting to that document requires a phone-handoff change.
- [src/view3d/Plant3D.tsx line 114](../../src/view3d/Plant3D.tsx#L114) reads CSS colors when initializing the WebGL view. A live theme change on a mounted canvas would require refreshing its renderer palette.
