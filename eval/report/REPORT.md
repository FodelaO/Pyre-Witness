# Pyre Witness evaluation

No measured evaluation report has been generated yet. This file and `latest.json` will be written after an evaluation runs on the labeled dataset.

```sh
npx tsx eval/validate.ts
npm run eval -- --limit 8
```

The dataset validator passed on 38 items, including eight product links. The measured run requires `GEMINI_API_KEY` in `.env`.
