# Demo rehearsal

`rehearse.mjs` performs every click of `docs/DEMO_SCRIPT.md` against the running app through the
installed Chrome, times the app's reaction to each click and saves one screenshot per step in
`shots/`. `explore.mjs` only loads the app and lists its controls.

```
node demo/rehearsal/rehearse.mjs --run=r2 --size=1920x1080 --photo=eval/dataset/images/photo-009.jpg
node demo/rehearsal/rehearse.mjs --run=dry --size=1280x720          # no capture, no model spend
node demo/rehearsal/rehearse.mjs --run=s1 --base=http://localhost:4120 --photo=...
```

A run with `--photo` makes one real capture: the photo is sent from a second, phone-sized browser
context through the app's own `Phone QR` link. Run one at a time.

## Runs so far

| Run | Size | Capture | Result | Files |
| --- | --- | --- | --- | --- |
| `dry` | 1280 x 720 | none | 12 of 15 steps; approve, proof and back failed (see `.agents/requests/demo-runbook.md` items 4 and 5) | `timings-dry.json` |
| `dry1920` | 1920 x 1080 | none | killed at the 5-minute limit while waiting for `/proof`; screenshots for steps 01 to 12 only, no timings file | `shots/dry1920-*` |
| `r1` | 1920 x 1080 | 1 real (`photo-009.jpg`, an iPhone) | 22 of 22 steps; capture 24.4 s; 100.7 s of app time after the first load | `timings-r1.json`, `r1.log`, `crew-r1.txt`, `answer-r1.txt` |

Captures used: 1 of the 3 allowed.

## Limits

- Step times are the app's reaction to a click. Presenter speech and a human using a real phone
  are not timed.
- `r1` ran the steps in an earlier order (transcript and chip before proof, proof by clicking the
  link). The order now in `docs/DEMO_SCRIPT.md` has not been re-run with a capture, and the script
  still approves the first `Approve` it finds rather than `Isolate CIP branch`.
