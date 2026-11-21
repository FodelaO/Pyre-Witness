<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Pyre Witness — agent handbook

Read this fully, then your task brief. Several agents are building different features in this
same working tree at the same time. The rules below are what keep that from colliding.

## What we are building

**Pyre Witness: snap any device, see where it belongs in your plant and what risk it brings.**
An engineer takes 1-3 photos of a device (or pastes a product link, or describes it). Gemini 4
identifies it, then reasons over a **digital twin of an industrial plant** and answers: where it
should go, where it must never go, which physical / cyber / compliance risks it brings (MITRE
ATT&CK for ICS), and which new attack paths it opens. The twin updates live.

The twin is the product. It is a **visual plant**, not a dashboard:

- **Plant floor** (default, largest): top-down SVG schematic of "Bebidas del Norte, Line 3"
  (fictional cola bottling line) with real equipment shapes, animated pipes, and an **AI crew
  that walks the floor** as the real pipeline runs.
- **Purdue network map** (one click away / split view): the same assets by Purdue level 0-5 plus
  the IT/OT DMZ. Selecting an asset in one view highlights it in the other.
- **Capture card** floating over the floor, **results side panel** with the risk score.
- Later waves: catastrophic-event simulation with mitigations, a daily threat-watch agent with
  human approval, an evaluation harness against a single-call baseline.

Crew = visible face of real components: **Scout** = perception (`gemini-4-hydrogen`),
**Architect** = reasoning (`gemini-4-carbon`), **Inspector** = deterministic rules engine (NOT a
model), **Chief** = short briefing (`gemini-4-neon`). `gemini-decision-1` gates inputs.

## Hard rules

1. **No git writes.** Never run `git add / commit / push / checkout / switch / reset / stash /
   rebase / merge / branch`. A separate reviewer signs off and commits. Read-only git is fine.
2. **Stay in your lane.** Edit only the paths your brief says you own. Everything under
   "Shared contracts" below is read-only. If a contract blocks you, write the exact change you
   need to `.agents/requests/<your-task>.md` and work around it locally — do not edit it.
3. **Do not start or stop servers, and never run `next build`.** The orchestrator keeps a hot-
   reloading dev server at `http://localhost:4119`. Verify with `npm run typecheck` and
   `npm run test`; you may `curl -s http://localhost:4119/<route>` to confirm a route compiles.
4. **No new npm dependencies.** Installed: next 16.4, react 19.3, tailwindcss 4.3, zustand,
   motion, lucide-react, zod, clsx, @google/genai (3.6), fast-xml-parser, node-html-parser,
   qrcode, vitest, tsx, playwright. Need another? Ask in `.agents/requests/`.
5. **New work only** (hackathon rule). Write everything fresh. Do not copy code from other
   projects on this machine or from the web. No external images or icon packs beyond
   lucide-react; equipment is hand-drawn parametric SVG.
6. **Honesty** (hackathon disqualifiers). No mocked model responses, no hard-coded "AI" output,
   no fake findings. Anything simulated is labelled simulated. The Inspector is always called
   "rules engine". Idle crew patrol is labelled "idle patrol" and never shows findings. Crew
   movement and the activity feed are driven by real pipeline events, never by timers.
7. **Secrets.** `.env` holds `GEMINI_API_KEY`. Never print, log, commit, expose to the browser,
   or put it in a URL (use the `x-goog-api-key` header / the SDK). Scripts: `tsx --env-file=.env`.
8. **One file per feature or sub-feature**, each starting with a short comment that says what it
   does. Prefer several focused files over one large one.
9. **Document your work** in `docs/log/<your-task>.md`: what you built, key decisions, how to
   verify it, and honest known gaps.
10. **Finish clean.** `npm run typecheck` must pass for the whole repo before you stop (other
    agents' in-progress files may fail transiently — re-run once; report anything not yours).

## Stack facts

- Next.js 16.4 App Router, React 19.3, TypeScript strict, Tailwind 4 (tokens in
  `src/app/globals.css`, classes like `bg-pw-panel text-pw-dim border-pw-line`). Path alias
  `@/*` -> `src/*`. `cacheComponents` is off.
- The whole UI is client-rendered: `src/app/page.tsx` -> `src/shell/ClientRoot.tsx`
  (`dynamic(..., { ssr: false })`) -> `src/shell/AppShell.tsx`, which lazy-loads each feature's
  entry component into an error-isolated slot. Feature components start with `"use client"`.
- State: zustand. Animation: CSS keyframes (`src/equipment/equipment.css`) and `motion`.
- Server code (API routes under `src/app/api/**/route.ts`) is the only place the Gemini API is called.
- Tests: vitest, files named `*.test.ts` next to the code.

## Shared contracts (read-only; import from these)

| File | What it defines |
| --- | --- |
| `src/twin/types.ts` | `Twin`, `Area`, `Asset` (`physical` + `network`), `Connection`, `Medium`, `EQUIPMENT_KINDS`, `PurdueLevel`, `Conduit`, `EntryPoint`, `AttackPath`, `RuleFinding`, `RiskReport`, `Mitigation` |
| `src/twin/store.ts` | `useTwinStore`: `twin`, `risk`, `selectedId`, `hoveredId`, `view`, `select()`, `hover()`, `addAsset()`, `updateAsset()`, `removeAsset()`, `setTwin()`, `patchTwinQuiet()`, `proposeMitigations()`, `decideMitigation()` |
| `src/twin/geometry.ts` | `areaAt`, `areasAt`, `areaById`, `assetById`, `nodePosition`, `distance`, `clampToArea` |
| `src/twin/effects.ts` | `applyEffects(twin, effects)` |
| `src/pipeline/types.ts` | `CaptureInput`, `DeviceProfile`, `Assessment`, `SelfCheckResult`, `GateResult`, `PipelineEvent`, `AnalyzeRequest`, `ReassessRequest` |
| `src/pipeline/bus.ts`, `src/pipeline/runStore.ts` | `pipelineBus.on(fn)`, `useRunStore` (`ingest(event)`, `profile`, `assessment`, `summary`, ...) |
| `src/crew/types.ts` | `CREW`, `CrewId`, `ActivityEntry` |
| `src/equipment/types.ts`, `index.tsx`, `primitives.tsx`, `equipment.css` | `EquipmentProps`, `FOOTPRINT`, `<Equipment kind=... />`, `SymbolFrame`, `EQ`, animation classes |
| `src/gemini/models.ts` | `MODEL_IDS`, `THINKING` |
| `src/data/attack-ics.ts` | Official MITRE ATT&CK for ICS techniques (`techniqueById`, `isKnownTechnique`) |
| `src/shell/*`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `package.json`, config files | App shell and tokens |

Key shapes in one breath: floor coordinates are SVG user units on a 1600 x 1000 canvas,
10 units = 1 m. An `Asset` has `physical { area, x, y, rotation, kind, connections[{to, medium}] }`
and `network { level, area, conduit }`, optional `cyber`, `process`, `specs`. Linked selection =
`useTwinStore().selectedId` / `hoveredId`, read and written by both views. Every twin mutation
re-runs `evaluateTwin` (rules engine), so `risk` is always current.

## Ownership map

| Path | Task |
| --- | --- |
| `src/equipment/kinds/*` (process kinds), `src/app/gallery/*` | `equipment-process` |
| `src/equipment/kinds/*` (control / IT / device kinds) | `equipment-devices-a`, `equipment-devices-b` |
| `src/twin/seed.ts`, `src/twin/seed/*` | `plant-design` |
| `src/floor/**` | `floor-view` |
| `src/purdue/**` | `purdue-view` |
| `src/rules/**` | `rules-engine` |
| `src/crew/**` (except `types.ts`) | `crew` |
| `src/gemini/**` (except `models.ts`), `src/pipeline/server/**`, `src/pipeline/client.ts`, `src/app/api/analyze/**`, `src/app/api/reassess/**` | `pipeline-server` |
| `src/capture/**`, `src/panel/**` | `capture-panel` |
| `src/link/**` | `link-fetch` |
| `src/watch/**`, `src/app/api/watch/**` | `threat-watch` |
| `src/data/compliance.ts` | `compliance-data` |
| `src/sim/**` | `simulation` |
| `eval/**` | `eval-harness` |

## Design language

- **Engineering drawing at night.** Graphite-navy surfaces, thin precise linework, monospace tags.
- **ISA-101 principle:** equipment is muted steel (`--pw-eq-*`); saturated colour means something:
  process media on pipes (`--pw-m-*`), and abnormal states (`--pw-attention`, `--pw-alarm`,
  recommended placement `--pw-ok`). Do not decorate with colour.
- **Few words.** Icons, tags and numbers over sentences. No paragraphs in the UI, no walls of
  buttons, no multi-page flows. One screen.
- **Motion with meaning:** flow moves along pipes, machines that run rotate, crew walks because a
  real step started. Respect `prefers-reduced-motion`.
- Instrument tags follow ISA-5.1 (`LT-301`, `TT-204`, `CT-210`); equipment tags like `TK-301`,
  `P-101`, `V-311`, `PLC-F3`, `HMI-F3`.
- Professional and calm. It must read as a tool a plant engineer would trust.

## Gemini API (server only)

- Read the local official docs before writing API code: `.agents/ref/gemini-docs/` (start with
  `_SKILL_gemini-api-dev.md`, then `interactions-overview.md`, `structured-output.md`,
  `image-understanding.md`, `decisions-api.md`, `thinking.md`, `url-context.md`, `streaming.md`).
  Your training data about Gemini is outdated; these files are the source of truth.
- SDK: `@google/genai` (>= 3.2). Interactions API: `ai.interactions.create({ model, input, ... })`.
  Decisions API needs `new GoogleGenAI({ apiVersion: "v1beta" })` and `ai.decisions.create(...)`.
- Model ids only from `src/gemini/models.ts`. Never send temperature / top_p / top_k or thinking
  budgets to Gemini 4. Neon and Hydrogen reject the "minimal" thinking level.
- Use native structured output / Decisions questions, never "please reply in JSON" prompting.

## Definition of done (every task)

- The feature works in the running app at `http://localhost:4119`, or has passing vitest tests when
  it has no UI.
- `npm run typecheck` passes.
- `docs/log/<task>.md` written.
- Your final message lists: files created/changed, how you verified, known gaps, and any contract
  change requests.
