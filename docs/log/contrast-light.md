# Light contrast

`src/theme/light.css` gives the plant drawing a warm paper canvas, graphite boundaries and darker steel equipment. Raised panels use a lighter surface, with stronger edges on the results rail and controls. Process media, data paths and operating states keep their existing color meanings. Isolated pipes use a dashed line so isolation is visible without relying on faint ink. The capture, escalation and transcript fields use distinct surfaces and visible keyboard focus.

## Contrast checks

Ratios use sRGB relative luminance. Translucent lines are composited over the adjacent canvas. Before values for isolated CIP, protocol text and capture focus were calculated from the original CSS. The sampled targets are 4.5:1 for text and 3:1 for essential graphics and controls. [WCAG text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) · [WCAG non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

| Element | Before | After |
| --- | ---: | ---: |
| Lens label on the control | 6.06:1 | 7.57:1 |
| Floor interior wall on the canvas | 3.42:1 | 5.47:1 |
| Room chip outline on its fill | 1.88:1 | 9.30:1 |
| Equipment outline on steel fill | 3.89:1 | 4.62:1 |
| Water pipe on the canvas | 3.37:1 | 5.90:1 |
| Isolated CIP pipe on the canvas | 1.68:1 | 4.08:1 |
| Data cable on the canvas | 3.41:1 | 5.45:1 |
| Protocol badge text on its fill | 8.63:1 | 10.16:1 |
| Results rail divider on the canvas | 1.56:1 | 5.47:1 |
| Loss formula and watch metadata on the panel | 6.76:1 | 9.30:1 |
| Escalation threshold field border on the field | 4.03:1 | 6.13:1 |
| Capture keyboard focus ring against the form | 5.57:1 | 7.20:1 |
| Transcript search placeholder on the field | 6.35:1 | 9.30:1 |

## Browser verification

Reviewed the hot-reloading app at 1440×900 and 1920×1080 with Playwright. Installed Chrome exited during launch in the sandbox, so the captures use the cached Chromium headless shell. A fresh browser confirmed light mode with the 3D canvas active. In 2D, use keys 1–3 for Material, Both and Data, choose **Levels** in Data for Purdue, select **PLC-F3** and open **Show more** for the loss calculation, and press **T** for the transcript.

| Surface | Before | After |
| --- | --- | --- |
| Material, 1440×900 | [Before](shots/contrast-light-before-material-1440x900.png) | [After](shots/contrast-light-after-material-1440x900.png) |
| Both, 1920×1080 | [Before](shots/contrast-light-before-both-1920x1080.png) | [After](shots/contrast-light-after-both-1920x1080.png) |
| Data, 1920×1080 | [Before](shots/contrast-light-before-data-1920x1080.png) | [After](shots/contrast-light-after-data-1920x1080.png) |
| Purdue, 1920×1080 | [Before](shots/contrast-light-before-purdue-1920x1080.png) | [After](shots/contrast-light-after-purdue-1920x1080.png) |
| PLC-F3 loss calculation | [Before](shots/contrast-light-before-loss-1440x900.png) | [After](shots/contrast-light-after-loss-1440x900.png) · [All asset rows expanded](shots/contrast-light-after-loss-full-1440x900.png) |
| Threat watch | [Before](shots/contrast-light-before-watch-1440x900.png) | [After](shots/contrast-light-after-watch-1440x900.png) |
| Escalation settings | [Before](shots/contrast-light-before-escalation-1440x900.png) | [After](shots/contrast-light-after-escalation-1440x900.png) · [Alert](shots/contrast-light-after-escalation-alert-1440x900.png) |
| Capture editor | [Before](shots/contrast-light-before-capture-1440x900.png) | [After](shots/contrast-light-after-capture-1440x900.png) |
| Transcript | [Before](shots/contrast-light-before-transcript-1440x900.png) | [After](shots/contrast-light-after-transcript-1440x900.png) |
| Proof | [Before](shots/contrast-light-before-proof-1440x900.png) | [After](shots/contrast-light-after-proof-1440x900.png) |
| Dark, 1440×900 | [Before](shots/contrast-light-before-dark-1440x900.png) | [After](shots/contrast-light-after-dark-1440x900.png) |

The browser also captured the [default light 3D view](shots/contrast-light-after-default-3d-1440x900.png) and the [paused simulation rail](shots/contrast-light-after-simulation-1440x900.png). The escalation alert came from a threshold change inside the isolated test browser. The transcript capture covers the empty state and filters. Run-specific transcript rows were reviewed in CSS.

Dark-theme computed colors, borders, strokes, shadows and opacity were identical across 5,229 elements with the light rules present and removed. The two live dark captures differed by 132 pixels inside the selected 2D switch border, which changed in the concurrent 3D stylesheet work.

`npm run typecheck` passed. `npm run test -- src/theme --maxWorkers=1` passed all four theme tests. No shared contract changes were needed.
