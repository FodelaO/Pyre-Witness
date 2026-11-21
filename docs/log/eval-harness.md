# Pyre Witness evaluation harness

The evaluator runs a single structured Hydrogen request and calls the production pipeline directly on each selected capture. Both see the same images, descriptions or product URLs for the same fictional seed plant. An independent Decisions request per eligible item scores the two free-text device types with anonymized questions. The evaluator runs `evaluatePlacement` on both outputs after prediction and retains the pipeline events for inspection.

- `eval/FORMAT.md` defines the labels and fixed risk vocabulary. `eval/validate.ts` checks CSVs, seed IDs, enums and image files. The dataset remains collector-owned.
- `eval/run.ts` runs up to three items at a time. `--limit` samples across negatives, difficulty groups and product links in a deterministic round robin. `--only baseline|system` runs one side. `--resume` starts a new run and reuses compatible successes and gate rejections from prior runs. Failed attempts remain in their original run directory and can be retried. The cache keys incorporate input content, relevant source files and the seed.
- `eval/report/REPORT.md` and `eval/report/latest.json` show measured denominators, Wilson 95% intervals, paired bootstrap intervals, latency, difficulty splits and concrete case evidence. `/proof` reads `latest.json` at request time and displays those measurements and up to six flagged cases.
- Missing predictions count against positive labels and gate accuracy. Metrics on returned recommendations or citations report their own denominators. F1 uses a Wilson interval transformed from Jaccard overlap. Risk recall uses the same lexical tag mapping on both sides. Citation validity measures final output and the report also lists unknown IDs the pipeline filtered out.

## Verification

```sh
npm run typecheck
npx vitest run eval
npx tsx eval/validate.ts
npx tsx eval/run.ts --limit 8
curl -fsS http://localhost:4119/proof
```

The running app returned HTTP 200 for `/proof` and showed the no-report state. The failure-image route returned HTTP 404 for an unknown case. Unit tests render the populated proof page from a synthetic case held in memory. The browser host was unavailable. Validation passed on all 38 collected items, including eight product links. The direct runner surfaced the missing `GEMINI_API_KEY` before model calls and left the measured report absent.

## Remaining live verification

Set `GEMINI_API_KEY` in the project's `.env` and run `npm run eval -- --limit 8` for measured numbers. Product links use the shared fetcher. Each side retrieves the URL independently, so dynamic pages can change between requests. Live model completions and product-link outcomes remain unmeasured.

The existing shared npm script uses `tsx --env-file=.env eval/run.ts`. Node exits before the harness can show its key-specific message when `.env` is absent. The runner can be invoked directly with `npx tsx eval/run.ts` and an exported key. The package owner can make `.env` optional by changing the script to `tsx --env-file-if-exists=.env eval/run.ts`.

The final whole-project typecheck passed, and all nine evaluation tests passed. The full suite passed with one worker, with 197 tests passing and three skipped. The latest default parallel run exceeded the rules engine's timing-test budget.
