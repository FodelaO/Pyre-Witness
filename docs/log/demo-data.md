# Demo data

## Files and decisions

- `public/demo/` contains six Wikimedia Commons photographs selected from Run 3. The photos retain their framing and were re-encoded as JPEG at quality 80 with a 1600 px maximum edge. `credits.json` records the original titles, authors, licence terms and source pages. [Dataset sources](../../eval/dataset/SOURCES.md)
- `demo/kit/` contains three product URLs, three descriptions, a five-asset inventory, site-walk notes and a one-page installation datasheet. The inventory and installation details are assumed (simulated plant).
- `docs/DEMO_KIT.md` is the presenter’s run sheet. It records the placements, exclusions, findings, estimated loss changes, timing, story beats and pre-flight checks. [Presenter guide](../DEMO_KIT.md)

## Verification

- Checked all six JPEG dimensions and decoded files. Verified each credit against `SOURCES.md` and received HTTP 200 for the six JPEGs and credits on port 4119.
- Sent each of the six inputs through the running `POST /api/analyze`, one at a time, using the seed twin and its Filler 3 default pin. The first vibration and cloud requests received HTTP 500 before an analysis stream opened. They each started and completed one real run after the route recovered. The product links emitted `link.fetched`. All six completed runs emitted `run.completed` and `summary.done`.
- Seconds to checked answer use `run.completed.totalMs`. Wall time includes the remainder of the stream, including Chief briefing. The presenter guide uses the app’s loss model applied to the recorded checks. Historical photo observations use the saved Run 3 receipts. [Run 3 manifest](../../eval/runs/2026-11-21T18-15-30-504Z-5IOMF9/manifest.json)

| Input | Run ID | Answer s | Full stream s | Verdict |
| --- | --- | ---: | ---: | --- |
| VIGI camera | `1ec427b2-7b0c-4b5b-aa9b-d1607213256e` | 67.7 | 76.9 | Outside wall, L5 |
| TRB140 | `f6b84922-1e9b-4bc3-ba32-9f51fb6c8695` | 25.7 | 32.3 | Control room, OT DMZ |
| Cerabar PMP23 | `09290737-e1b8-4ea6-9e8a-7bd6183279a2` | 30.2 | 34.7 | Blending & carbonation, L0 |
| Contractor laptop | `8db38f1e-6475-4d41-9967-30a89ccc95ce` | 22.4 | 31.2 | Control room, OT DMZ. The default-credential finding remained. |
| Vibration sensor | `ce9aae24-1f6b-4976-a672-875cae26fc02` | 20.1 | 33.4 | Filler 3, L0. The washdown finding remained. |
| Cloud label printer | `319ed670-7322-4180-a7fd-b40d619ccb57` | 97.6 | 107.7 | Hold. The rules engine blocked Packaging and offered Control room for review after the revision stage timed out. |

- Sent `new-assets.csv` once as multipart `files` to `POST /api/model/ingest`. HTTP 200 and `complete` returned five proposed additions with citations to CSV lines 2–6 in 27.3 s (29.6 s wall). The verified tags were `LT-312`, `TT-217`, `VFD-PK3-07`, `RIO-F3-07` and `WS-OT-07`. All five remain proposals for human review.
- Rendered and visually inspected `datasheet.pdf` with Poppler and checked that its details extract as text on one page.
- Submitted the re-encoded mug JPEG through `POST /api/analyze` at the Filler 3 pin. Run `4e1c7d13-3f44-4b08-888f-3c706fe1c406` completed in 10.0 s (25.0 s wall). The rules engine flagged foreign material near open product and cleared Corporate office on the first recommendation. The older Run 3 mug receipt has a revision.
- Checked the seven dock controls, six decoded thumbnails and hover credits at 1440×900 and 360×800 using one Playwright browser. The installed Chrome launch aborted, so the check used the cached Chrome Headless Shell. One click on Phone sent one prepared JPEG and the explicit Filler 3 pin at approximately `(718, 630)`. Run `92d69d44-9c59-494f-b97e-ab8b29e5d075` completed in 18.6 s (30.5 s wall) and displayed the placement answer. The total was eight live captures.
- Reviewed the final desktop and mobile screenshots. Credits sit above the thumbnails and the sample pin control clears the mobile alert. The final browser check armed the mobile pin and reported no page errors.
- `npm test -- src/capture --maxWorkers=1` passed all 11 tests. Whole-workspace `npm run typecheck` passed before the tray mount. The post-mount check hit TS2307 and TS2344 in `.next/dev/types/validator.ts` for the missing `/call/[code]` route. After port 4119 returned, the regenerated validator no longer contained that reference. Both allowed type checks were used.

## Mounting

Mounted at 14:03 after `qa-dock` exited with code 0. `CaptureToolbar.tsx` adds the quiet Samples entry, `CaptureCard.tsx` shares the submission action and current pin with uploads, and `SamplePhotos.tsx` plus its CSS module render the menu and reuse upload image preparation. `capture.css` fits the seven controls within the existing rail.

## Gaps

- The phone pairing, venue Wi-Fi, Threat Watch completion and physical speaker check are presenter pre-flight items. The capture browser logged an aborted background Watch request.
- The CSV had a live ingest. The text notes and PDF are alternate inputs. The PDF was checked for rendering and text extraction.
- The browser showed **Gemini OK**, with 8/8 routine services checked and healthy. The image and managed-agent checks run on demand.
