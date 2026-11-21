# Twin modeler

The modeler extends the Line 3 inventory from a video, photos, an engineering page, or a text inventory. It streams the evidence and placement proposal into a browser review. **Add accepted** applies selected rows through the twin store and records the completed review in Scout’s activity feed.

## Flow and schemas

1. `POST /api/model/ingest` accepts repeated multipart `files` fields or JSON `{ files: [{ name, mimeType, dataBase64 }], twin? }`. Multipart’s optional `twin` field is a JSON string. The browser sends `modelTwinContext(twin)`, limited to areas, asset labels, geometry, links and network coordinates. With no snapshot, the API uses the seed twin.
2. Gemini Decisions asks three separate questions over the same source. Two `noul` answers check industrial relevance and readability at a 0.5 threshold. The `choice` answer distinguishes a video, equipment photos, an engineering document, an inventory and unrelated input. It can route a single still image of a drawing to the document path. Rejections have a readable reason and end the stream before extraction.
3. Hydrogen sees the original media, numbered photos or numbered UTF-8 lines. Native structured output supplies `label`, `kind`, `object_class`, `evidence`, `tag`, `area_guess`, `connects_to` and `confidence`. The prompt asks for actual visible or written details, with an `mm:ss` frame, photo number, document tag or row, or exact inventory excerpt. The server checks citation bounds and the inventory excerpt, tag and target references. It merges repeat tags and untagged video sightings with matching label, kind, room hint and evidence.
4. Neon sees the checked observations and a compact table of existing asset IDs, equipment kinds, room IDs, coordinates, levels and zones. It returns one `match_existing`, `update_existing` or `new_asset` decision per item. Existing identities require an exact observed tag and kind, or a unique exact name and kind. Updates cover source-backed names and additive links. For additions, Neon picks a room, nearby anchor, Purdue level and zone. Shared footprint logic finds a clear position inside the room. The server verifies references, reserves IDs, and reports withheld placements or discarded links in `dropped`.
5. The SSE stream emits source receipt and readiness, gate, cited extraction and reconciliation events, followed by `complete` with `ModelProposal { source, items, additions, updates, dropped, timings, models }` or `error` with a readable message. The review rechecks live geometry and IDs before applying. A connection is applied only when its peer exists in the current or approved inventory. Rules re-score using the existing twin actions.

Both model stages use `v1beta` Interactions, `thinking_level: "low"`, native JSON `response_format` and `store: false`. Video goes through the Gemini Files API with a server-side key header and readiness polling. Extraction requests static processing below 30 seconds and agentic processing from 30 seconds for selective inspection of longer walkthroughs. Provider-file deletion is attempted after the run. PDFs use the first page image and native text. The picker shows up to six local video thumbnails where browser decoding supports the source.

## Mounting

In `src/panel/SidePanel.tsx`, import the two HTML components:

```tsx
import ModelerPanel from "@/modeler/ModelerPanel";
import SourcesStrip from "@/modeler/SourcesStrip";
```

Inside `<PanelWorkspace ...>`, put this block before the existing `{focused ? (...)` branch. The panel opens from **Model the twin** in the results rail.

```tsx
<PanelSection>
  <Slot name="Twin modeler">
    <ModelerPanel />
    <SourcesStrip />
  </Slot>
</PanelSection>
```

In `src/floor/PlantFloor.tsx`, import `GhostLayer` from `@/modeler/GhostLayer`. Insert `<GhostLayer />` directly after `<AssetLayer ... />` inside the fragment passed to `FloorStage`’s `schematic` prop. This keeps ghosts in the same SVG world and zoom transform as equipment. The preview is pointer-transparent. Hover or focus on an existing-asset row uses the store’s linked highlight. Each component has a default export. The panel and strip load their own styles.

## Live verification

Durations are seconds from source preparation through the proposal, excluding the initial browser request body transfer and post-proposal file cleanup. These are individual runs against the seed twin.

| Fixture | Prep / upload | Gate | Hydrogen | Neon | Validation | Total | Observed / placed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Synthetic Line 3 CSV | 0.002 | 0.694 | 5.202 | 11.803 | 0.002 | 17.704 | 4 / 3 |
| Three benchmark photos | 0.002 | 1.742 | 6.224 | 7.566 | 0.002 | 15.536 | 3 / 3 |
| Synthetic 35-second MP4, Files API and agentic request | 5.028 | 1.925 | 6.932 | 10.094 | 0.002 | 23.981 | 5 / 5 |
| Synthetic equipment schedule, one PDF page | 0.001 | 1.403 | 4.456 | 7.322 | 0.002 | 13.184 | 2 / 2 |

- CSV lines 2–5 produced `TK-103` second treated-water tank, `AT-304` inline Brix sensor, `VS-105` Wi-Fi vibration sensor and `PRN-305` network label printer. The tank could not clear the existing Water treatment symbols. The Brix sensor retained its product line to `P-301`; the printer retained its network link to `SW-PK`.
- The site-photo test used `photo-024.jpg`, `photo-037.jpg` and `photo-051.jpg` from `eval/dataset/images/`. It identified a plate heat exchanger, an actuated butterfly valve and a centrifugal pump with a visible drive. These are independent benchmark photos.
- The video is a test montage generated with FFmpeg from benchmark photos 024, 037, 039, 046 and 051, seven seconds per still. It yielded a plate heat exchanger at `00:00`, butterfly valve at `00:07`, industrial Ethernet switch at `00:14`, temperature transmitter at `00:21` and centrifugal pump with drive at `00:28`. The montage depicts five independent benchmark images.
- The test PDF yielded pressure transmitter `PT-902` and water feed pump `P-904` with first-page tag citations.
- The localhost multipart route streamed through `complete` for the CSV in 17.950 s. A base64 JSON shopping list was rejected by Decisions in 0.399 s and produced a terminal reason.
- In an isolated localhost Chrome mount, the video picker streamed the live run and rendered all five cited thumbnails. Accepting the heat exchanger and rejecting the valve kept the inventory at 92 until **Add accepted**. The count then rose to 93 and Scout recorded one added asset. The video provenance chip showed five observed items. The mounted panel and source chips rendered with scoped styles after the dev CSS chunk showed mismatched stylesheets.
- Typecheck and scoped ESLint passed. The focused suite passed 13 tests. The full suite passed 347 tests, with 3 skipped.

### Reproduce

```sh
npm run typecheck
npx vitest run src/modeler --maxWorkers=1
npx tsx --env-file=.env scripts/smoke-modeler.ts /path/to/line-3-fixture.csv
npx tsx --env-file=.env scripts/smoke-modeler.ts eval/dataset/images/photo-{024,037,051}.jpg
npx tsx --env-file=.env scripts/smoke-modeler.ts /path/to/walkthrough-test.mp4
curl -N -F 'files=@/path/to/line-3-fixture.csv;type=text/csv' http://localhost:4119/api/model/ingest
```

The CSV fixture contains these four additions.

```csv
tag,label,room,connection_to,medium,notes
TK-103,Second vertical treated-water tank,water_treatment,UV-101,water,New buffer vessel beside TK-102
AT-304,Inline Brix sensor,blending,P-301,product,New Brix transmitter on the product line
VS-105,Wi-Fi vibration sensor,water_treatment,,,New wireless sensor mounted on pump P-102
PRN-305,Network label printer,packaging,SW-PK,network,New Ethernet printer for Line 3 case labels
```

The benchmark MP4 can be recreated with FFmpeg.

```sh
modeler_fixture=$(mktemp -d)
for photo in 024 037 039 046 051; do
  ffmpeg -nostdin -loglevel error -loop 1 -i "eval/dataset/images/photo-${photo}.jpg" \
    -t 7 -vf 'scale=960:540:force_original_aspect_ratio=decrease,pad=960:540:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=12' \
    -c:v libx264 -pix_fmt yuv420p "$modeler_fixture/$photo.mp4"
  printf "file '%s/%s.mp4'\n" "$modeler_fixture" "$photo" >> "$modeler_fixture/clips.txt"
done
ffmpeg -nostdin -loglevel error -f concat -safe 0 -i "$modeler_fixture/clips.txt" \
  -c copy -movflags +faststart "$modeler_fixture/walkthrough-test.mp4"
```

## Limits

- One seekable MP4, MOV or WebM up to 50 MB and about 60 seconds, up to six JPEG/PNG/WebP photos at 8 MB each and 30 MB total, one PDF up to 12 MB, or one UTF-8 CSV/TXT of up to 64 KB. Extraction caps at 32 items. WebM without duration metadata needs to be exported as a seekable clip. The HTTP upload budget is 45 seconds. Video preparation, gate, extraction and reconciliation budgets are 40, 20, 75 and 35 seconds. Transient HTTP 429 and 5xx use a single retry.
- An untagged asset can be hard to distinguish across separate views. Video and photo evidence and confidence are model observations for the engineer to check. Placement uses schematic symbol footprints. It lacks surveyed coordinates and equipment clearances.
- The import adds topology, labels and locations. Detailed device profiles, ratings and credentials are outside this import. Session counts track observed items per ingested source. Historian, CMMS and network scan chips show **Not connected**.
- Mounting is the integration step for the shell and floor owners. Existing placement, highlight and activity feed contracts are sufficient.
