# Pyre Witness evaluation

2026-11-21T17:41:58.735Z · Run `run-1` · 67 / 71 paired captures · 71 available

Completed attempts · Baseline 71 · System 67. Elapsed since launch 24.4 min at 6 capture workers. 0 reused artifacts.

Partial cohort. Faster cases may finish first. Metrics use completed pairs and include attempts that returned errors.

Baseline uses one gemini-4-hydrogen interaction at low thinking and a prose plant description (original-output-v1). The system uses gemini-decision-1 for its gate, gemini-4-hydrogen for perception, gemini-4-carbon for reasoning and any revision, the rules engine, and gemini-4-neon for briefing. The type judge uses a separate gemini-decision-1 request with anonymized answers. A match requires P(yes) ≥ 0.5. Mean P(match) uses only returned judgments. Type-match accuracy counts missing predictions as incorrect and excludes missing judgments for returned predictions.

System thinking levels · perception low, reasoning medium, briefing low. Offline judge made 50 HTTP attempts across 50 measured captures.

Source and dataset fingerprint `55ecc71f5497c6691da072668fe1b6250938013f838ae5a97315e8bf01ebed10`.

## Headline results

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device gate accuracy | 31.3% [21.5%–43.2%] (n=67) | 86.6% [76.4%–92.8%] (n=67) | +55.2 pp [+38.8 pp, +70.1 pp] (pairs=67) |
| Physical-kind accuracy | 18.6% [10.7%–30.4%] (n=59) | 88.1% [77.5%–94.1%] (n=59) | +69.5 pp [+57.6 pp, +81.4 pp] (pairs=59) |
| Physical-area accuracy | 17.2% [9.6%–28.9%] (n=58) | 0.0% [0.0%–6.2%] (n=58) | -17.2 pp [-27.6 pp, -6.9 pp] (pairs=58) |
| Rule consistency | 100.0% [77.2%–100.0%] (n=13) | — (n=0) | — (pairs=0) |
| Expected risk-tag recall | 10.9% [6.5%–17.8%] (n=119) | 0.0% [0.0%–3.1%] (n=119) | -10.9 pp [-17.8 pp, -4.8 pp] (pairs=56) |

| System | Scored | Device / non-device | False accept / reject | No gate answer | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 67 | 59 / 8 | 0 / 0 | 46 | 46 / 0 | 0 / 0 | 0 |
| System | 67 | 59 / 8 | 8 / 0 | 1 | 67 / 59 | 2 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 13087 ms (n=67) | 129180 ms (n=67) | +116093 ms [+115027 ms, +117121 ms] (pairs=67) |
| End-to-end latency p95 | 20441 ms (n=67) | 161684 ms (n=67) | +141244 ms [+118080 ms, +158005 ms] (pairs=67) |
| Gemini HTTP attempts, total / mean per capture | 66 / 0.99 (n=67) | 246 / 3.67 (n=67) | — |
| Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=67) | 4 / 4 (n=67) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.726 (n=13) | 0.572 (n=48) | -0.070 [-0.195, +0.038] (pairs=13) |

## Run 1 vs run 2

Run 2 measurements pending.

## All metrics

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device gate accuracy | 31.3% [21.5%–43.2%] (n=67) | 86.6% [76.4%–92.8%] (n=67) | +55.2 pp [+38.8 pp, +70.1 pp] (pairs=67) |
| False accept rate | 0.0% [0.0%–32.4%] (n=8) | 100.0% [67.6%–100.0%] (n=8) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=8) |
| False reject rate | 0.0% [0.0%–22.8%] (n=13) | 0.0% [0.0%–6.2%] (n=58) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=13) |
| Device category accuracy | 21.6% [12.5%–34.6%] (n=51) | 80.4% [67.5%–89.0%] (n=51) | +58.8 pp [+45.1 pp, +72.5 pp] (pairs=51) |
| Physical-kind accuracy | 18.6% [10.7%–30.4%] (n=59) | 88.1% [77.5%–94.1%] (n=59) | +69.5 pp [+57.6 pp, +81.4 pp] (pairs=59) |
| Device type match (Decisions) | 23.5% [14.0%–36.8%] (n=51) | 67.3% [53.4%–78.8%] (n=49) | +42.9 pp [+26.5 pp, +59.2 pp] (pairs=49) |
| Radio precision | 100.0% [43.9%–100.0%] (n=3) | 100.0% [34.2%–100.0%] (n=2) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=3) |
| Radio recall | 25.0% [8.9%–53.2%] (n=12) | 16.7% [4.7%–44.8%] (n=12) | -8.3 pp [-46.2 pp, +28.6 pp] (pairs=7) |
| Radio F1 | 40.0% [16.3%–69.5%] (n=12) | 28.6% [9.0%–61.9%] (n=12) | -11.4 pp [-55.7 pp, +37.5 pp] (pairs=7) |
| Port F1 | 14.3% [5.2%–33.8%] (n=39) | 16.1% [7.3%–31.9%] (n=57) | +1.8 pp [-13.1 pp, +15.6 pp] (pairs=21) |
| Visible default credentials accuracy | 25.5% [15.5%–38.9%] (n=51) | 98.0% [89.7%–99.7%] (n=51) | +72.5 pp [+60.7 pp, +84.3 pp] (pairs=51) |
| Cloud flag accuracy | 34.8% [18.8%–55.1%] (n=23) | 17.4% [7.0%–37.1%] (n=23) | -17.4 pp [-39.1 pp, +4.3 pp] (pairs=23) |
| Physical-area accuracy | 17.2% [9.6%–28.9%] (n=58) | 0.0% [0.0%–6.2%] (n=58) | -17.2 pp [-27.6 pp, -6.9 pp] (pairs=58) |
| Purdue-level accuracy | 25.5% [15.5%–38.9%] (n=51) | 0.0% [0.0%–7.0%] (n=51) | -25.5 pp [-37.3 pp, -13.7 pp] (pairs=51) |
| Never-place violation rate | 7.7% [1.4%–33.3%] (n=13) | — (n=0) | — (pairs=0) |
| Expected risk-tag recall | 10.9% [6.5%–17.8%] (n=119) | 0.0% [0.0%–3.1%] (n=119) | -10.9 pp [-17.8 pp, -4.8 pp] (pairs=56) |
| Valid ATT&CK citations | 80.0% [49.0%–94.3%] (n=10) | — (n=0) | — (pairs=0) |
| Invalid ATT&CK citations | 20.0% [5.7%–51.0%] (n=10) | — (n=0) | — (pairs=0) |
| Rule consistency | 100.0% [77.2%–100.0%] (n=13) | — (n=0) | — (pairs=0) |
| Placement coverage | 22.0% [13.4%–34.1%] (n=59) | 0.0% [0.0%–6.1%] (n=59) | -22.0 pp [-32.2 pp, -11.9 pp] (pairs=59) |
| Product capacity or size match | 0.0% [0.0%–43.4%] (n=5) | 40.0% [11.8%–76.9%] (n=5) | +40.0 pp [0.0 pp, +80.0 pp] (pairs=5) |
| Execution failure rate | 68.7% [56.8%–78.5%] (n=67) | 100.0% [94.6%–100.0%] (n=67) | +31.3 pp [+20.9 pp, +41.8 pp] (pairs=67) |

## Breakdown by difficulty

### clean (n=26)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device gate accuracy | 34.6% [19.4%–53.8%] (n=26) | 96.2% [81.1%–99.3%] (n=26) | +61.5 pp [+42.3 pp, +76.9 pp] (pairs=26) |
| False accept rate | — (n=0) | — (n=0) | — (pairs=0) |
| False reject rate | 0.0% [0.0%–29.9%] (n=9) | 0.0% [0.0%–13.3%] (n=25) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=9) |
| Device category accuracy | 30.8% [16.5%–50.0%] (n=26) | 76.9% [57.9%–89.0%] (n=26) | +46.2 pp [+26.9 pp, +65.4 pp] (pairs=26) |
| Physical-kind accuracy | 26.9% [13.7%–46.1%] (n=26) | 73.1% [53.9%–86.3%] (n=26) | +46.2 pp [+26.9 pp, +65.4 pp] (pairs=26) |
| Device type match (Decisions) | 30.8% [16.5%–50.0%] (n=26) | 60.0% [40.7%–76.6%] (n=25) | +28.0 pp [+8.0 pp, +48.0 pp] (pairs=25) |
| Radio precision | 100.0% [43.9%–100.0%] (n=3) | 100.0% [20.7%–100.0%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=2) |
| Radio recall | 30.0% [10.8%–60.3%] (n=10) | 10.0% [1.8%–40.4%] (n=10) | -20.0 pp [-66.7 pp, 0.0 pp] (pairs=5) |
| Radio F1 | 46.2% [19.5%–75.3%] (n=10) | 18.2% [3.5%–57.6%] (n=10) | -28.0 pp [-71.1 pp, 0.0 pp] (pairs=5) |
| Port F1 | 12.5% [3.6%–35.2%] (n=30) | 14.3% [5.2%–33.8%] (n=39) | +1.8 pp [-18.1 pp, +18.9 pp] (pairs=14) |
| Visible default credentials accuracy | 34.6% [19.4%–53.8%] (n=26) | 96.2% [81.1%–99.3%] (n=26) | +61.5 pp [+42.3 pp, +76.9 pp] (pairs=26) |
| Cloud flag accuracy | 50.0% [25.4%–74.6%] (n=12) | 16.7% [4.7%–44.8%] (n=12) | -33.3 pp [-66.7 pp, +8.3 pp] (pairs=12) |
| Physical-area accuracy | 26.9% [13.7%–46.1%] (n=26) | 0.0% [0.0%–12.9%] (n=26) | -26.9 pp [-42.4 pp, -11.5 pp] (pairs=26) |
| Purdue-level accuracy | 34.6% [19.4%–53.8%] (n=26) | 0.0% [0.0%–12.9%] (n=26) | -34.6 pp [-53.8 pp, -19.2 pp] (pairs=26) |
| Never-place violation rate | 0.0% [0.0%–29.9%] (n=9) | — (n=0) | — (pairs=0) |
| Expected risk-tag recall | 14.0% [7.3%–25.3%] (n=57) | 0.0% [0.0%–6.3%] (n=57) | -14.0 pp [-22.4 pp, -6.0 pp] (pairs=25) |
| Valid ATT&CK citations | 83.3% [43.6%–97.0%] (n=6) | — (n=0) | — (pairs=0) |
| Invalid ATT&CK citations | 16.7% [3.0%–56.4%] (n=6) | — (n=0) | — (pairs=0) |
| Rule consistency | 100.0% [70.1%–100.0%] (n=9) | — (n=0) | — (pairs=0) |
| Placement coverage | 34.6% [19.4%–53.8%] (n=26) | 0.0% [0.0%–12.9%] (n=26) | -34.6 pp [-53.8 pp, -19.2 pp] (pairs=26) |
| Product capacity or size match | — (n=0) | — (n=0) | — (pairs=0) |
| Execution failure rate | 65.4% [46.2%–80.6%] (n=26) | 100.0% [87.1%–100.0%] (n=26) | +34.6 pp [+19.2 pp, +53.8 pp] (pairs=26) |

| System | Scored | Device / non-device | False accept / reject | No gate answer | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 26 | 26 / 0 | 0 / 0 | 17 | 17 / 0 | 0 / 0 | 0 |
| System | 26 | 26 / 0 | 0 / 0 | 1 | 26 / 22 | 1 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 13654 ms (n=26) | 128863 ms (n=26) | +115209 ms [+113697 ms, +116541 ms] (pairs=26) |
| End-to-end latency p95 | 15987 ms (n=26) | 138253 ms (n=26) | +122266 ms [+115320 ms, +124123 ms] (pairs=26) |
| Gemini HTTP attempts, total / mean per capture | 26 / 1.00 (n=26) | 96 / 3.69 (n=26) | — |
| Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=26) | 4 / 4 (n=26) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.730 (n=9) | 0.567 (n=24) | -0.035 [-0.204, +0.090] (pairs=9) |

### messy (n=20)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device gate accuracy | 20.0% [8.1%–41.6%] (n=20) | 100.0% [83.9%–100.0%] (n=20) | +80.0 pp [+60.0 pp, +95.0 pp] (pairs=20) |
| False accept rate | — (n=0) | — (n=0) | — (pairs=0) |
| False reject rate | 0.0% [0.0%–49.0%] (n=4) | 0.0% [0.0%–16.1%] (n=20) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=4) |
| Device category accuracy | 15.0% [5.2%–36.0%] (n=20) | 80.0% [58.4%–91.9%] (n=20) | +65.0 pp [+45.0 pp, +85.0 pp] (pairs=20) |
| Physical-kind accuracy | 20.0% [8.1%–41.6%] (n=20) | 100.0% [83.9%–100.0%] (n=20) | +80.0 pp [+60.0 pp, +95.0 pp] (pairs=20) |
| Device type match (Decisions) | 20.0% [8.1%–41.6%] (n=20) | 68.4% [46.0%–84.6%] (n=19) | +47.4 pp [+21.1 pp, +73.7 pp] (pairs=19) |
| Radio precision | — (n=0) | — (n=0) | — (pairs=0) |
| Radio recall | 0.0% [0.0%–79.3%] (n=1) | 0.0% [0.0%–79.3%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Radio F1 | 0.0% [0.0%–88.5%] (n=1) | 0.0% [0.0%–88.5%] (n=1) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=1) |
| Port F1 | 25.0% [5.0%–67.8%] (n=7) | 23.5% [7.2%–54.9%] (n=15) | -1.5 pp [-22.2 pp, +46.2 pp] (pairs=5) |
| Visible default credentials accuracy | 20.0% [8.1%–41.6%] (n=20) | 100.0% [83.9%–100.0%] (n=20) | +80.0 pp [+60.0 pp, +95.0 pp] (pairs=20) |
| Cloud flag accuracy | 25.0% [7.1%–59.1%] (n=8) | 12.5% [2.2%–47.1%] (n=8) | -12.5 pp [-37.5 pp, 0.0 pp] (pairs=8) |
| Physical-area accuracy | 15.0% [5.2%–36.0%] (n=20) | 0.0% [0.0%–16.1%] (n=20) | -15.0 pp [-30.0 pp, 0.0 pp] (pairs=20) |
| Purdue-level accuracy | 20.0% [8.1%–41.6%] (n=20) | 0.0% [0.0%–16.1%] (n=20) | -20.0 pp [-40.0 pp, -5.0 pp] (pairs=20) |
| Never-place violation rate | 25.0% [4.6%–69.9%] (n=4) | — (n=0) | — (pairs=0) |
| Expected risk-tag recall | 12.8% [5.6%–26.7%] (n=39) | 0.0% [0.0%–9.0%] (n=39) | -12.8 pp [-28.2 pp, 0.0 pp] (pairs=19) |
| Valid ATT&CK citations | 75.0% [30.1%–95.4%] (n=4) | — (n=0) | — (pairs=0) |
| Invalid ATT&CK citations | 25.0% [4.6%–69.9%] (n=4) | — (n=0) | — (pairs=0) |
| Rule consistency | 100.0% [51.0%–100.0%] (n=4) | — (n=0) | — (pairs=0) |
| Placement coverage | 20.0% [8.1%–41.6%] (n=20) | 0.0% [0.0%–16.1%] (n=20) | -20.0 pp [-40.0 pp, -5.0 pp] (pairs=20) |
| Product capacity or size match | — (n=0) | — (n=0) | — (pairs=0) |
| Execution failure rate | 80.0% [58.4%–91.9%] (n=20) | 100.0% [83.9%–100.0%] (n=20) | +20.0 pp [+5.0 pp, +40.0 pp] (pairs=20) |

| System | Scored | Device / non-device | False accept / reject | No gate answer | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 20 | 20 / 0 | 0 / 0 | 16 | 16 / 0 | 0 / 0 | 0 |
| System | 20 | 20 / 0 | 0 / 0 | 0 | 20 / 18 | 1 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 13193 ms (n=20) | 129711 ms (n=20) | +116518 ms [+114015 ms, +118350 ms] (pairs=20) |
| End-to-end latency p95 | 20687 ms (n=20) | 163787 ms (n=20) | +143100 ms [+111226 ms, +153054 ms] (pairs=20) |
| Gemini HTTP attempts, total / mean per capture | 20 / 1.00 (n=20) | 72 / 3.60 (n=20) | — |
| Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=20) | 4 / 4 (n=20) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | 0.717 (n=4) | 0.568 (n=19) | -0.148 [-0.306, +0.011] (pairs=4) |

### edge (n=13)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device gate accuracy | 61.5% [35.5%–82.3%] (n=13) | 38.5% [17.7%–64.5%] (n=13) | -23.1 pp [-69.2 pp, +23.1 pp] (pairs=13) |
| False accept rate | 0.0% [0.0%–32.4%] (n=8) | 100.0% [67.6%–100.0%] (n=8) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=8) |
| False reject rate | — (n=0) | 0.0% [0.0%–43.4%] (n=5) | — (pairs=0) |
| Device category accuracy | 0.0% [0.0%–43.4%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=5) |
| Physical-kind accuracy | 0.0% [0.0%–43.4%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=5) |
| Device type match (Decisions) | 0.0% [0.0%–43.4%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=5) |
| Radio precision | — (n=0) | 100.0% [20.7%–100.0%] (n=1) | — (pairs=1) |
| Radio recall | 0.0% [0.0%–79.3%] (n=1) | 100.0% [20.7%–100.0%] (n=1) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=1) |
| Radio F1 | 0.0% [0.0%–88.5%] (n=1) | 100.0% [34.2%–100.0%] (n=1) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=1) |
| Port F1 | 0.0% [0.0%–79.3%] (n=2) | 0.0% [0.0%–71.9%] (n=3) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=2) |
| Visible default credentials accuracy | 0.0% [0.0%–43.4%] (n=5) | 100.0% [56.6%–100.0%] (n=5) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=5) |
| Cloud flag accuracy | 0.0% [0.0%–56.1%] (n=3) | 33.3% [6.1%–79.2%] (n=3) | +33.3 pp [0.0 pp, +100.0 pp] (pairs=3) |
| Physical-area accuracy | 0.0% [0.0%–49.0%] (n=4) | 0.0% [0.0%–49.0%] (n=4) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=4) |
| Purdue-level accuracy | 0.0% [0.0%–43.4%] (n=5) | 0.0% [0.0%–43.4%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Never-place violation rate | — (n=0) | — (n=0) | — (pairs=0) |
| Expected risk-tag recall | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=4) |
| Valid ATT&CK citations | — (n=0) | — (n=0) | — (pairs=0) |
| Invalid ATT&CK citations | — (n=0) | — (n=0) | — (pairs=0) |
| Rule consistency | — (n=0) | — (n=0) | — (pairs=0) |
| Placement coverage | 0.0% [0.0%–43.4%] (n=5) | 0.0% [0.0%–43.4%] (n=5) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=5) |
| Product capacity or size match | — (n=0) | — (n=0) | — (pairs=0) |
| Execution failure rate | 38.5% [17.7%–64.5%] (n=13) | 100.0% [77.2%–100.0%] (n=13) | +61.5 pp [+38.5 pp, +84.6 pp] (pairs=13) |

| System | Scored | Device / non-device | False accept / reject | No gate answer | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 13 | 5 / 8 | 0 / 0 | 5 | 5 / 0 | 0 / 0 | 0 |
| System | 13 | 5 / 8 | 8 / 0 | 0 | 13 / 11 | 0 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 6632 ms (n=13) | 129738 ms (n=13) | +123106 ms [+116689 ms, +125167 ms] (pairs=13) |
| End-to-end latency p95 | 13849 ms (n=13) | 208762 ms (n=13) | +194913 ms [+116433 ms, +245568 ms] (pairs=13) |
| Gemini HTTP attempts, total / mean per capture | 13 / 1.00 (n=13) | 50 / 3.85 (n=13) | — |
| Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=13) | 4 / 4 (n=13) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | — (n=0) | 0.609 (n=5) | — (pairs=0) |

### Product links (n=8)

| Metric | Baseline [95% CI] | System [95% CI] | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| Device gate accuracy | 0.0% [0.0%–32.4%] (n=8) | 100.0% [67.6%–100.0%] (n=8) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=8) |
| False accept rate | — (n=0) | — (n=0) | — (pairs=0) |
| False reject rate | — (n=0) | 0.0% [0.0%–32.4%] (n=8) | — (pairs=0) |
| Device category accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Physical-kind accuracy | 0.0% [0.0%–32.4%] (n=8) | 100.0% [67.6%–100.0%] (n=8) | +100.0 pp [+100.0 pp, +100.0 pp] (pairs=8) |
| Device type match (Decisions) | — (n=0) | — (n=0) | — (pairs=0) |
| Radio precision | — (n=0) | — (n=0) | — (pairs=0) |
| Radio recall | — (n=0) | — (n=0) | — (pairs=0) |
| Radio F1 | — (n=0) | — (n=0) | — (pairs=0) |
| Port F1 | — (n=0) | — (n=0) | — (pairs=0) |
| Visible default credentials accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Cloud flag accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Physical-area accuracy | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Purdue-level accuracy | — (n=0) | — (n=0) | — (pairs=0) |
| Never-place violation rate | — (n=0) | — (n=0) | — (pairs=0) |
| Expected risk-tag recall | 0.0% [0.0%–20.4%] (n=15) | 0.0% [0.0%–20.4%] (n=15) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Valid ATT&CK citations | — (n=0) | — (n=0) | — (pairs=0) |
| Invalid ATT&CK citations | — (n=0) | — (n=0) | — (pairs=0) |
| Rule consistency | — (n=0) | — (n=0) | — (pairs=0) |
| Placement coverage | 0.0% [0.0%–32.4%] (n=8) | 0.0% [0.0%–32.4%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |
| Product capacity or size match | 0.0% [0.0%–43.4%] (n=5) | 40.0% [11.8%–76.9%] (n=5) | +40.0 pp [0.0 pp, +80.0 pp] (pairs=5) |
| Execution failure rate | 100.0% [67.6%–100.0%] (n=8) | 100.0% [67.6%–100.0%] (n=8) | 0.0 pp [0.0 pp, 0.0 pp] (pairs=8) |

| System | Scored | Device / non-device | False accept / reject | No gate answer | Run errors / timeouts | Judge errors / pending | Filtered IDs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 8 | 8 / 0 | 0 / 0 | 8 | 8 / 0 | 0 / 0 | 0 |
| System | 8 | 8 / 0 | 0 / 0 | 0 | 8 / 8 | 0 / 0 | 0 |

| Measure | Baseline | System | Paired difference [95% CI] |
| --- | ---: | ---: | ---: |
| End-to-end latency p50 | 15634 ms (n=8) | 130725 ms (n=8) | +115091 ms [+113197 ms, +125677 ms] (pairs=8) |
| End-to-end latency p95 | 20716 ms (n=8) | 153443 ms (n=8) | +132727 ms [+115660 ms, +137241 ms] (pairs=8) |
| Gemini HTTP attempts, total / mean per capture | 7 / 0.88 (n=8) | 28 / 3.50 (n=8) | — |
| Gemini HTTP attempts per capture, p50 / p95 | 1 / 1 (n=8) | 3.5 / 4 (n=8) | — |
| HTTP 429 responses | 0 | 0 | — |
| Mean device-type P(match) | — (n=0) | — (n=0) | — (pairs=0) |

## Where it still fails

### photo-026 · images/photo-026.jpg · edge

- Expected — Reject non-device or unreadable capture.
- Baseline — Rejected
- System — Accepted / none (potted plant) · other · generic\_device / radios none / ports none / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System gate error — Accepted a negative capture. P(device) 0.19, confidence 0.81, P(readable) 0.27, route other (0.96 confidence).

### photo-002 · images/photo-002.jpg · clean

- Expected — Accept device · Linksys Wireless-G broadband router · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
- Baseline — Accepted / Wireless-G Broadband Router · network · wifi\_ap / corporate\_office / Purdue 4 / never filler3, control\_room, nh3\_hazard / radios wifi / ports Ethernet 1-4, Internet (WAN) / visible defaults no · cloud no / risks wireless, hazardous\_area, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.907
- System — Accepted / Wireless-G Broadband Router · network · wifi\_ap / radios wifi / ports none / visible defaults no · cloud unknown / P(type match) 0.911 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline perception miss — Label mismatch in ports.
- Baseline risk omission — Missed physical\_port.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in ports.

### photo-001 · images/photo-001.jpg · messy

- Expected — Accept device · Ubiquiti UniFi AC Lite access point · network · wifi\_ap / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi / ports RJ45 / visible defaults no / risks wireless, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Wi-Fi Access Point · network · wifi\_ap / radios none / ports ethernet / visible defaults no · cloud unknown / P(type match) 0.469 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in radios, device type (P(match) 0.47).

### photo-003 · images/photo-003.jpg · edge

- Expected — Accept device · AXIS 2100 network webcam · camera · ip\_camera / areas corporate\_office, visitor\_corridor / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios none / ports RJ45, RS-232 / visible defaults no / cloud no / risks camera\_view, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Network Camera · camera · ip\_camera / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.612 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in ports, cloud flag.

### link-bright-tank · eshop.czechminibreweries.com · links

- Expected — Accept device · vertical\_tank / areas blending / size 2000 L / risks washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Cylindrical vertical insulated storage tank (Bright Beer Tank) · vessel · vertical\_tank / radios none / ports none / visible defaults no · cloud unknown / size 2000 L usable / 2242 L total; 2728 x 1404 x 1404 mm / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in capacity or size.

### photo-027 · images/photo-027.jpg · edge

- Expected — Reject non-device or unreadable capture.
- Baseline — Rejected
- System — Accepted / generic\_device · other · generic\_device / radios none / ports none / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System gate error — Accepted a negative capture. P(device) 0.31, confidence 0.69, P(readable) 0.29, route other (0.93 confidence).

### photo-005 · images/photo-005.jpg · clean

- Expected — Accept device · Huawei 4G+ desktop cellular modem router · gateway · gateway / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / visible defaults no / risks wireless
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / wireless\_router · network · gateway / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.496 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in category, device type (P(match) 0.50).

### photo-004 · images/photo-004.jpg · messy

- Expected — Accept device · outdoor Axis network surveillance camera · camera · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / Purdue 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks camera\_view
- Baseline — Accepted / Outdoor IP Security Camera · camera · ip\_camera / parking\_lot / Purdue 4 / never nh3\_hazard, filler3, control\_room / radios none / ports none / visible defaults no · cloud unknown / risks default\_creds, camera\_view / rule check passed / P(type match) 0.884
- System — Accepted / IP Camera · camera · ip\_camera / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.524 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.

### photo-025 · images/photo-025.jpg · edge

- Expected — Accept device · historic Gwynnes centrifugal waterworks pump · rotating\_equipment · pump / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / centrifugal pump · rotating\_equipment · pump / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.570 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in cloud flag.

### link-hygienic-pressure · www.us.endress.com · links

- Expected — Accept device · instrument / areas water\_treatment, syrup\_room, blending, utilities, filler3, washdown / risks washdown, hazardous\_area
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Pressure transmitter · instrument · instrument / radios none / ports M12 connector (4-20 mA / IO-Link), Hygienic clamp process connection / visible defaults no · cloud no / size 400 mbar to +40 bar / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.

### photo-028 · images/photo-028.jpg · edge

- Expected — Reject non-device or unreadable capture.
- Baseline — Rejected
- System — Accepted / coffee mug · other · generic\_device / radios none / ports none / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System gate error — Accepted a negative capture. P(device) 0.24, confidence 0.76, P(readable) 0.39, route other (0.95 confidence).

### photo-006 · images/photo-006.jpg · clean

- Expected — Accept device · Siemens SIMATIC S7-1200 modular PLC assembly · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / risks washdown, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / plc · controller · generic\_device / radios none / ports terminal\_blocks, expansion\_bus / visible defaults no · cloud unknown / P(type match) 0.362 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in physical kind, device type (P(match) 0.36).

### photo-008 · images/photo-008.jpg · messy

- Expected — Accept device · Lenovo ThinkPad T480 laptop · computer · laptop / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / visible defaults no / risks wireless, transient, physical\_port, removable\_media
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / laptop · computer · laptop / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.302 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in device type (P(match) 0.30).

### photo-048 · images/photo-048.jpg · edge

- Expected — Accept device · MAXIMATOR 2500 bar mechanical pressure gauge · instrument · instrument / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks hazardous\_area
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / analog pressure gauge · instrument · instrument / radios none / ports bottom process connection / visible defaults no · cloud no / size 0-2500 bar / 0-35000 psi / P(type match) 0.596 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in ports.

### link-indoor-camera · www.axis.com · links

- Expected — Accept device · ip\_camera / areas corporate\_office, visitor\_corridor / risks camera\_view, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / IP Dome Camera · camera · ip\_camera / radios none / ports PoE / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.

### photo-029 · images/photo-029.jpg · edge

- Expected — Reject non-device or unreadable capture.
- Baseline — Rejected
- System — Accepted / unknown\_non\_device\_object · other · generic\_device / radios none / ports none / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System gate error — Accepted a negative capture. P(device) 0.18, confidence 0.82, P(readable) 0.24, route other (0.82 confidence).

### photo-007 · images/photo-007.jpg · clean

- Expected — Accept device · Siemens SIMATIC OP77B keypad operator panel · hmi · hmi / areas packaging, control\_room / Purdue 2 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RS-485, RS-232, USB-A, MMC / visible defaults no / cloud no / risks physical\_port, removable\_media, washdown
- Baseline — Accepted / Operator Panel HMI · hmi · hmi / control\_room / Purdue 2 / never washdown, nh3\_hazard, visitor\_corridor / radios none / ports none / visible defaults no · cloud unknown / risks washdown / ATT&CK T0836 / rule check passed / P(type match) 0.446
- System — Accepted / HMI Operator Panel · hmi · hmi / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.619 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline perception miss — Label mismatch in ports, cloud flag, device type (P(match) 0.45).
- Baseline risk omission — Missed physical\_port, removable\_media.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in ports, cloud flag.

### photo-011 · images/photo-011.jpg · messy

- Expected — Accept device · Cisco Catalyst 4006 rack-mount Ethernet switch · network · network\_switch / areas corporate\_office, control\_room / Purdue 2, 3, 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / risks physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / network\_switch · network · network\_switch / radios none / ports RJ45 Ethernet (48-port 10/100 BASE-T) / visible defaults no · cloud unknown / P(type match) 0.685 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.

### text-01 · Text capture · edge

- Expected — Accept device · contractor service laptop · computer · laptop / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, nh3\_hazard / visible defaults no / risks transient, remote\_access
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / laptop · computer · laptop / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.679 / reasoning · Gemini returned an invalid response twice. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System execution error — reasoning · Gemini returned an invalid response twice. Try the capture again.

### link-lte-gateway · teltonika.gnshk.com · links

- Expected — Accept device · gateway / areas control\_room / size 74.5 x 25 x 64.4 mm / risks wireless, remote\_access, cloud, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Cellular Gateway · gateway · gateway / radios cellular / ports 1 x Gigabit Ethernet, 1 x 4-pin DC power, 1 x Digital Input, 1 x Digital Output, 1 x Micro USB, 1 x SMA (LTE), 1 x Mini SIM slot / visible defaults yes · cloud unknown / size 74.5 x 25 x 64.4 mm / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.

### photo-030 · images/photo-030.jpg · edge

- Expected — Reject non-device or unreadable capture.
- Baseline — Rejected
- System — Accepted / unknown · other · generic\_device / radios none / ports none / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System gate error — Accepted a negative capture. P(device) 0.25, confidence 0.75, P(readable) 0.26, route other (0.95 confidence).

### photo-009 · images/photo-009.jpg · clean

- Expected — Accept device · Apple iPhone 15 smartphone · phone · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi, bluetooth, cellular, nfc / ports USB-C / visible defaults no / cloud yes / risks wireless, cloud, transient, physical\_port, camera\_view
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / smartphone · phone · phone / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.223 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in radios, ports, cloud flag, device type (P(match) 0.22).

### photo-017 · images/photo-017.jpg · messy

- Expected — Accept device · Itron OpenWay digital smart electricity meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / electric\_meter · instrument · instrument / radios none / ports optical\_port / visible defaults no · cloud unknown / P(type match) 0.677 / reasoning · Gemini returned an invalid response twice. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System execution error — reasoning · Gemini returned an invalid response twice. Try the capture again.

### text-08 · Text capture · edge

- Expected — Accept device · Teltonika TRB140 industrial LTE gateway · gateway · gateway / areas control\_room / Purdue 3.5 / forbidden packaging, water\_treatment, syrup\_room, blending, utilities, filler3, washdown, nh3\_hazard / radios cellular / visible defaults no / risks wireless, remote\_access, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / LTE cellular gateway · gateway · gateway / radios cellular / ports none / visible defaults no · cloud unknown / P(type match) 0.590 / reasoning · Gemini returned an invalid response twice. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System execution error — reasoning · Gemini returned an invalid response twice. Try the capture again.

### link-mixing-tank · eshop.czechminibreweries.com · links

- Expected — Accept device · agitated\_tank / areas syrup\_room, blending / size 2000 L / risks washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Agitated mixing tank · vessel · agitated\_tank / radios none / ports none / visible defaults no · cloud unknown / size 2000 L (1200 x 1200 x 2100 mm) / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in capacity or size.

### photo-052 · images/photo-052.jpg · edge

- Expected — Reject non-device or unreadable capture.
- Baseline — Rejected
- System — Accepted / wooden\_armchair · other · generic\_device / radios none / ports none / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System gate error — Accepted a negative capture. P(device) 0.29, confidence 0.71, P(readable) 0.79, route other (0.93 confidence).

### photo-010 · images/photo-010.jpg · clean

- Expected — Accept device · Apple iPad first-generation Wi-Fi tablet · computer · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / radios wifi, bluetooth / ports 30-pin dock, 3.5 mm audio jack / visible defaults no / risks wireless, transient, physical\_port
- Baseline — Accepted / tablet · computer · generic\_device / corporate\_office / Purdue 4 / never nh3\_hazard, filler3, control\_room / radios wifi, bluetooth / ports none / visible defaults no · cloud yes / risks wireless, cloud, washdown / rule check passed / P(type match) 0.614
- System — Accepted / tablet computer · computer · generic\_device / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.881 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline perception miss — Label mismatch in physical kind, ports.
- Baseline risk omission — Missed transient, physical\_port.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in physical kind, radios, ports.

### photo-018 · images/photo-018.jpg · messy

- Expected — Accept device · vertical stainless steel fermentation tank · vessel · vertical\_tank / areas water\_treatment, syrup\_room, blending / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Vertical tank · vessel · vertical\_tank / radios none / ports none / visible defaults no · cloud unknown / size 150 Hls / P(type match) 0.113 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in cloud flag, device type (P(match) 0.11).

### link-outdoor-camera · www.vigi.com · links

- Expected — Accept device · ip\_camera / areas corporate\_office, visitor\_corridor, parking\_lot / size 78.5 x 188.0 x 71.5 mm / risks camera\_view, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Bullet Network Camera · camera · ip\_camera / radios none / ports RJ45 10/100M Ethernet (PoE), DC Power Port (5.5mm Coaxial), MicroSD Card Slot / visible defaults no · cloud yes / size 78.5 x 188.0 x 71.5 mm / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.

### photo-053 · images/photo-053.jpg · edge

- Expected — Reject non-device or unreadable capture.
- Baseline — Rejected
- System — Accepted / cardboard\_moving\_box · other · generic\_device / radios none / ports none / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System gate error — Accepted a negative capture. P(device) 0.29, confidence 0.71, P(readable) 0.27, route other (0.96 confidence).

### photo-012 · images/photo-012.jpg · clean

- Expected — Accept device · Honeywell 4600g wired handheld barcode imager · sensor · generic\_device / areas packaging, corporate\_office / Purdue 1, 2, 4 / forbidden filler3, washdown, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks physical\_port, transient
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / handheld\_barcode\_scanner · sensor · generic\_device / radios none / ports USB-A / visible defaults no · cloud unknown / P(type match) 0.747 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in cloud flag.

### photo-020 · images/photo-020.jpg · messy

- Expected — Accept device · Western Digital My Passport Ultra portable external hard drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / radios none / ports USB 3.0 Micro-B / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / External Hard Drive · removable\_storage · usb\_drive / radios none / ports USB 3.0 / visible defaults no · cloud unknown / P(type match) 0.475 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in ports, cloud flag, device type (P(match) 0.48).

### link-point-level · www.us.endress.com · links

- Expected — Accept device · instrument / areas water\_treatment, syrup\_room, blending, utilities, filler3, washdown / risks washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Vibronic point level switch · sensor · instrument / radios none / ports M12 connector (IO-Link / 2-wire / 3-wire) / visible defaults no · cloud unknown / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.

### photo-054 · images/photo-054.jpg · edge

- Expected — Reject non-device or unreadable capture.
- Baseline — Rejected
- System — Accepted / traffic\_cone · other · generic\_device / radios none / ports none / visible defaults no · cloud no / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System gate error — Accepted a negative capture. P(device) 0.69, confidence 0.69, P(readable) 0.87, route other (0.88 confidence).

### photo-013 · images/photo-013.jpg · clean

- Expected — Accept device · Rosemount pressure transmitter with local display · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks hazardous\_area, washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / pressure transmitter · instrument · instrument / radios none / ports threaded conduit entry (left), threaded conduit entry (right) / visible defaults no · cloud unknown / P(type match) 0.521 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in category.

### photo-022 · images/photo-022.jpg · messy

- Expected — Accept device · wired industrial electrical control cabinet · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Industrial Control Cabinet · controller · plc\_cabinet / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.676 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.

### link-serial-gateway · www.moxa.com · links

- Expected — Accept device · gateway / areas water\_treatment, syrup\_room, blending, packaging, utilities / size 22 x 52 x 80 mm / risks physical\_port, washdown
- Baseline — No gate answer / link · Could not read this product page.
- System — Accepted / Modbus TCP Gateway · gateway · gateway / radios none / ports Ethernet, Serial (1-port) / visible defaults no · cloud unknown / size 22 x 52 x 80 mm (without ears), 340 g / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — link · Could not read this product page.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in capacity or size.

### photo-014 · images/photo-014.jpg · clean

- Expected — Accept device · cabled float level switch for an open tank · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown, hazardous\_area
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / float\_switch · sensor · instrument / radios none / ports hardwired cable / visible defaults no · cloud no / P(type match) 0.482 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in ports, device type (P(match) 0.48).

### photo-023 · images/photo-023.jpg · messy

- Expected — Accept device · Siemens SIMATIC NET ESM TP80 industrial Ethernet switch · network · network\_switch / areas water\_treatment, syrup\_room, blending, packaging, utilities, control\_room / Purdue 1, 2, 3, 3.5 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RJ45, DB9 / visible defaults no / cloud no / risks physical\_port, washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / industrial\_ethernet\_switch · network · network\_switch / radios none / ports 8x RJ45 (Port 1 to Port 8), 1x DB9 (Standby), 1x DB9 (V24), 3x Terminal blocks (Inputs/Power/Fault) / visible defaults no · cloud unknown / P(type match) 0.771 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in ports, cloud flag.

### photo-015 · images/photo-015.jpg · clean

- Expected — Accept device · three-wire Pt100 RTD temperature probe · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown, hazardous\_area
- Baseline — Accepted / Pt100 RTD temperature sensor · sensor · instrument / blending / Purdue 0 / never corporate\_office, visitor\_corridor, nh3\_hazard / radios none / ports 3-wire RTD leads / visible defaults no · cloud no / size ~30 mm probe length / risks washdown / rule check passed / P(type match) 0.759
- System — Accepted / Pt100 RTD temperature sensor · sensor · instrument / radios none / ports none / visible defaults no · cloud no / size approx. 3 cm probe length / P(type match) 0.744 / reasoning · Gemini returned an invalid response twice. Try the capture again.
- Baseline perception miss — Label mismatch in ports.
- Baseline wrong zone — Recommended blending at Purdue 0, outside the labeled placements.
- Baseline risk omission — Missed hazardous\_area.
- System execution error — reasoning · Gemini returned an invalid response twice. Try the capture again.

### photo-032 · images/photo-032.jpg · messy

- Expected — Accept device · Siemens SIMATIC S7-300 wired PLC panel · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Programmable Logic Controller (PLC) Rack · controller · plc\_cabinet / radios none / ports Profibus DP / MPI, Digital/Analog I/O / visible defaults no · cloud unknown / P(type match) 0.607 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.

### photo-016 · images/photo-016.jpg · clean

- Expected — Accept device · Coriolis mass flow meter · instrument · instrument / areas water\_treatment, utilities, blending, syrup\_room / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Coriolis mass flow meter sensor assembly · instrument · instrument / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.273 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in device type (P(match) 0.27).

### photo-035 · images/photo-035.jpg · messy

- Expected — Accept device · wall-mounted fixed barcode price-check scanner · sensor · generic\_device / areas corporate\_office, packaging / Purdue 2, 4 / forbidden filler3, washdown, nh3\_hazard / visible defaults no
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Barcode price checker / kiosk scanner · other · generic\_device / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.820 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in category.

### photo-019 · images/photo-019.jpg · clean

- Expected — Accept device · SanDisk Cruzer Titanium USB flash drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, packaging, water\_treatment, syrup\_room, blending, utilities / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Accepted / USB flash drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never filler3, control\_room, visitor\_corridor / radios none / ports USB-A / visible defaults no · cloud no / size 8 GB / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.751
- System — Accepted / USB flash drive · removable\_storage · usb\_drive / radios none / ports none / visible defaults no · cloud unknown / size 8 GB / P(type match) 0.700 / reasoning · Gemini returned an invalid response twice. Try the capture again.
- Baseline risk omission — Missed transient, physical\_port.
- System execution error — reasoning · Gemini returned an invalid response twice. Try the capture again.
- System perception miss — Label mismatch in ports, cloud flag.

### photo-036 · images/photo-036.jpg · messy

- Expected — Accept device · process tank level sensor · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — Accepted / Level transmitter · instrument · instrument / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, parking\_lot / radios none / ports wired\_signal / visible defaults no · cloud no / ATT&CK T0836 / rule check passed / P(type match) 0.768
- System — Accepted / level transmitter · instrument · instrument / radios none / ports cable gland / visible defaults no · cloud unknown / P(type match) 0.762 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline perception miss — Label mismatch in category.
- Baseline risk omission — Missed washdown, hazardous\_area.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in category.

### photo-021 · images/photo-021.jpg · clean

- Expected — Accept device · industrial pushbutton operator station · hmi · hmi / areas packaging, control\_room / Purdue 2 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / industrial\_control\_cabinet · controller · plc\_cabinet / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.172 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in category, physical kind, device type (P(match) 0.17).

### photo-040 · images/photo-040.jpg · messy

- Expected — Accept device · installed refrigerant flow meter · instrument · instrument / areas utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks hazardous\_area
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / process transmitter · instrument · instrument / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.072 / reasoning · Gemini returned an invalid response twice. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System execution error — reasoning · Gemini returned an invalid response twice. Try the capture again.
- System perception miss — Label mismatch in device type (P(match) 0.07).

### photo-024 · images/photo-024.jpg · clean

- Expected — Accept device · plate-and-frame heat exchanger · machine · heat\_exchanger / areas water\_treatment, blending, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — Accepted / Plate heat exchanger · other · heat\_exchanger / utilities / Purdue 0 / never corporate\_office, visitor\_corridor, control\_room / radios none / ports none / visible defaults no · cloud no / rule check passed / P(type match) 0.708
- System — Accepted / plate\_heat\_exchanger · other · heat\_exchanger / radios none / ports 4x threaded pipe ports / visible defaults no · cloud unknown / P(type match) 0.627 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline perception miss — Label mismatch in category.
- Baseline risk omission — Missed washdown.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in category, ports, cloud flag.

### photo-047 · images/photo-047.jpg · messy

- Expected — Accept device · manual quarter-turn shutoff valve · valve · valve / areas water\_treatment, utilities, packaging / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / ball\_valve · valve · valve / radios none / ports none / visible defaults no · cloud unknown / size 1" / DN25 / P(type match) 0.885 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in cloud flag.

### photo-031 · images/photo-031.jpg · clean

- Expected — Accept device · Teltonika TRM240 and TRM250 industrial cellular modems · gateway · gateway / areas control\_room, corporate\_office / Purdue 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios cellular / ports microUSB, SMA, SIM / visible defaults no / risks wireless, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / cellular\_modem · gateway · gateway / radios none / ports antenna\_connector / visible defaults no · cloud unknown / P(type match) 0.772 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in radios, ports.

### photo-049 · images/photo-049.jpg · messy

- Expected — Accept device · Lantronix ETS32PR serial-to-Ethernet console server · gateway · gateway / areas control\_room, corporate\_office / Purdue 3, 3.5, 4 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / ports RJ45, AUI / visible defaults no / risks physical\_port, remote\_access
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Terminal server · network · gateway / radios none / ports 32x RJ45, 1x DB-style serial, 1x RJ45 uplink / visible defaults no · cloud unknown / size 1U rack-mount / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in category, ports.

### photo-033 · images/photo-033.jpg · clean

- Expected — Accept device · Siemens SIMATIC ET 200S PROFINET remote I/O station · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / cloud no / risks physical\_port, washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / plc\_cpu · controller · generic\_device / radios none / ports X1 P3 PROFINET (LAN) RJ45, X1 (Xn) PROFINET (LAN) 2xRJ45 (BA 2xRJ45), X50 memory card slot, 24VDC power terminal / visible defaults no · cloud unknown / P(type match) 0.262 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in physical kind, cloud flag, device type (P(match) 0.26).

### photo-050 · images/photo-050.jpg · messy

- Expected — Accept device · Ring video doorbell surveillance camera · camera · ip\_camera / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / visible defaults no / cloud yes / risks wireless, cloud, camera\_view
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / video doorbell · camera · ip\_camera / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.746 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in cloud flag.

### photo-034 · images/photo-034.jpg · clean

- Expected — Accept device · WAGO 750-series modular industrial I/O station · controller · plc\_cabinet / areas water\_treatment, syrup\_room, blending, packaging, utilities / Purdue 1 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / visible defaults no / risks physical\_port, washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / plc\_controller · controller · generic\_device / radios none / ports Ethernet (X1, X2 via RJ45: 2 ports observed, 10/100 Mbps inferred from standard controller layout but unconfirmed without spec sheet), Serial (X3 RS232/485 DB9), SD card slot / visible defaults no · cloud unknown / reasoning · This stage could not finish. Try the capture again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System execution error — reasoning · This stage could not finish. Try the capture again.
- System perception miss — Label mismatch in physical kind.

### text-02 · Text capture · messy

- Expected — Accept device · consumer Wi-Fi cloud surveillance camera · camera · ip\_camera / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / visible defaults yes / cloud yes / risks wireless, cloud, default\_creds, camera\_view
- Baseline — Accepted / Wi-Fi IP Camera · camera · ip\_camera / packaging / Purdue 4 / never filler3, nh3\_hazard / radios wifi / ports none / visible defaults yes · cloud yes / size little / risks wireless, default\_creds, cloud, washdown / ATT&CK T0812 / rule check passed / P(type match) 0.577
- System — Accepted / Wi-Fi camera · camera · ip\_camera / radios wifi / ports none / visible defaults yes · cloud yes / P(type match) 0.325 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline wrong zone — Recommended forbidden area packaging.
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0812.
- Baseline risk omission — Missed camera\_view.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in device type (P(match) 0.33).

### photo-037 · images/photo-037.jpg · clean

- Expected — Accept device · electrically actuated butterfly valve · valve · valve / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / motorized\_butterfly\_valve · valve · valve / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.906 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.

### text-03 · Text capture · messy

- Expected — Accept device · hygienic vibrating-fork point level switch · sensor · instrument / areas water\_treatment, syrup\_room, blending, filler3, washdown, utilities / Purdue 0 / forbidden nh3\_hazard / radios none / visible defaults no / cloud no / risks washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / hygienic vibronic level switch · sensor · instrument / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.705 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in cloud flag.

### photo-038 · images/photo-038.jpg · clean

- Expected — Accept device · SanDisk Cruzer Blade USB flash drive · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Accepted / USB flash drive · removable\_storage · usb\_drive / corporate\_office / Purdue 4 / never control\_room, filler3 / radios none / ports USB Type-A / visible defaults no · cloud no / risks removable\_media, washdown / ATT&CK T0847 / rule check passed / P(type match) 0.732
- System — Accepted / USB flash drive · removable\_storage · usb\_drive / radios none / ports USB-A / visible defaults no · cloud unknown / P(type match) 0.747 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline risk omission — Missed transient, physical\_port.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in cloud flag.

### text-06 · Text capture · messy

- Expected — Accept device · USB-A flash drive with service files · removable\_storage · usb\_drive / areas corporate\_office, control\_room / Purdue 4, 3.5 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, nh3\_hazard / radios none / ports USB-A / visible defaults no / cloud no / risks removable\_media, transient, physical\_port
- Baseline — Accepted / USB flash drive · removable\_storage · usb\_drive / control\_room / Purdue 3.5 / never packaging, filler3, visitor\_corridor / radios none / ports USB-A / visible defaults no · cloud no / risks removable\_media / ATT&CK T0847, T0843 / rule check passed / P(type match) 0.638
- System — Accepted / USB flash drive · removable\_storage · usb\_drive / radios none / ports USB-A / visible defaults no · cloud unknown / P(type match) 0.666 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline risk omission — Missed transient, physical\_port.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in cloud flag.

### photo-039 · images/photo-039.jpg · clean

- Expected — Accept device · industrial Ethernet and fibre switch · network · network\_switch / areas water\_treatment, syrup\_room, blending, packaging, utilities, control\_room / Purdue 1, 2, 3, 3.5 / forbidden filler3, washdown, nh3\_hazard, visitor\_corridor, parking\_lot / radios none / visible defaults no / risks physical\_port, washdown
- Baseline — No gate answer / baseline · This stage could not finish. Try the capture again.
- System — No gate answer / gate · This stage could not finish. Try the capture again.
- Baseline execution error — baseline · This stage could not finish. Try the capture again.
- System gate error — gate · This stage could not finish. Try the capture again.

### text-07 · Text capture · messy

- Expected — Accept device · Bluetooth handheld barcode scanner · sensor · generic\_device / areas packaging / Purdue 1, 2 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks wireless, transient, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / barcode scanner · other · generic\_device / radios bluetooth / ports USB / visible defaults no · cloud unknown / P(type match) 0.510 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in category.

### photo-041 · images/photo-041.jpg · clean

- Expected — Accept device · cable-suspended float level switch · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports none / visible defaults no / cloud no / risks washdown
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / float\_level\_switch · sensor · instrument / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.644 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in cloud flag.

### photo-042 · images/photo-042.jpg · clean

- Expected — Accept device · platinum resistance thermometer calibration probes · sensor · instrument / areas utilities, control\_room / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / radios none / ports Info-Con / visible defaults no / cloud no / risks transient, physical\_port
- Baseline — Accepted / Precision RTD Temperature Probe · sensor · instrument / blending / Purdue 0 / never nh3\_hazard, visitor\_corridor / radios none / ports LEMO-style circular connector / visible defaults no · cloud no / risks washdown / ATT&CK T0856 / rule check passed / P(type match) 0.890
- System — Accepted / temperature\_probe · sensor · instrument / radios none / ports circular push-pull connector / visible defaults no · cloud unknown / P(type match) 0.261 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline perception miss — Label mismatch in ports.
- Baseline wrong zone — Recommended blending at Purdue 0, outside the labeled placements.
- Baseline hallucinated technique — Cited unknown ATT&CK IDs T0856.
- Baseline risk omission — Missed transient, physical\_port.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in ports, cloud flag, device type (P(match) 0.26).

### photo-043 · images/photo-043.jpg · clean

- Expected — Accept device · Rotronic temperature and humidity probe · sensor · instrument / areas utilities, control\_room, corporate\_office, packaging / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / sensor probe · sensor · instrument / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.106 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in device type (P(match) 0.11).

### photo-044 · images/photo-044.jpg · clean

- Expected — Accept device · Apple iPad sixth-generation tablet · computer · phone / areas corporate\_office / Purdue 4 / forbidden water\_treatment, syrup\_room, blending, filler3, washdown, packaging, utilities, control\_room, crew\_office, nh3\_hazard / ports Lightning, 3.5 mm audio jack / visible defaults no / cloud yes / risks wireless, cloud, transient, physical\_port, camera\_view
- Baseline — Accepted / tablet computer · computer · generic\_device / corporate\_office / Purdue 4 / never filler3, nh3\_hazard, blending / radios wifi, bluetooth / ports none / visible defaults no · cloud yes / risks wireless, cloud, remote\_access, washdown / ATT&CK T0886 / rule check passed / P(type match) 0.765
- System — Accepted / tablet · computer · generic\_device / radios none / ports none / visible defaults no · cloud unknown / P(type match) 0.763 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline perception miss — Label mismatch in physical kind, ports.
- Baseline risk omission — Missed transient, physical\_port, camera\_view.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in physical kind, ports, cloud flag.

### photo-045 · images/photo-045.jpg · clean

- Expected — Accept device · Raspberry Pi 4 Model B single-board computer · computer · generic\_device / areas corporate\_office, control\_room, crew\_office / Purdue 3, 3.5, 4 / forbidden water\_treatment, syrup\_room, blending, packaging, utilities, filler3, washdown, nh3\_hazard / radios wifi, bluetooth / ports RJ45, USB-A, USB-C, micro HDMI, microSD, GPIO, MIPI CSI, MIPI DSI, 3.5 mm A/V jack / visible defaults no / risks wireless, removable\_media, physical\_port
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / single\_board\_computer · computer · generic\_device / radios none / ports Ethernet, USB 3.0, USB 2.0, 3.5mm A/V, CSI Camera, Micro-HDMI (HDMI0, HDMI1), USB-C (Power In), DSI Display, 40-pin GPIO, 4-pin PoE / visible defaults no · cloud unknown / P(type match) 0.748 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in radios, ports.

### photo-046 · images/photo-046.jpg · clean

- Expected — Accept device · Rosemount temperature transmitter and thermowell · sensor · instrument / areas water\_treatment, utilities / Purdue 0 / forbidden filler3, washdown, nh3\_hazard / visible defaults no / risks washdown, hazardous\_area
- Baseline — No gate answer / baseline response · Hydrogen returned an invalid or incomplete structured response.
- System — Accepted / Temperature Sensor / Transmitter · instrument · instrument / radios none / ports conduit\_entry / visible defaults no · cloud unknown / P(type match) 0.645 / reasoning · The reasoning stage timed out after 120 seconds. Try again.
- Baseline execution error — baseline response · Hydrogen returned an invalid or incomplete structured response.
- System timeout — reasoning · The reasoning stage timed out after 120 seconds. Try again.
- System perception miss — Label mismatch in category.

## Device type judgments

| Item | Labeled type | Baseline P(match) | System P(match) |
| --- | --- | ---: | ---: |
| photo-002 | Linksys Wireless-G broadband router | 0.907 | 0.911 |
| photo-001 | Ubiquiti UniFi AC Lite access point | — | 0.469 |
| photo-003 | AXIS 2100 network webcam | — | 0.612 |
| photo-005 | Huawei 4G+ desktop cellular modem router | — | 0.496 |
| photo-004 | outdoor Axis network surveillance camera | 0.884 | 0.524 |
| photo-025 | historic Gwynnes centrifugal waterworks pump | — | 0.570 |
| photo-006 | Siemens SIMATIC S7-1200 modular PLC assembly | — | 0.362 |
| photo-008 | Lenovo ThinkPad T480 laptop | — | 0.302 |
| photo-048 | MAXIMATOR 2500 bar mechanical pressure gauge | — | 0.596 |
| photo-007 | Siemens SIMATIC OP77B keypad operator panel | 0.446 | 0.619 |
| photo-011 | Cisco Catalyst 4006 rack-mount Ethernet switch | — | 0.685 |
| text-01 | contractor service laptop | — | 0.679 |
| photo-009 | Apple iPhone 15 smartphone | — | 0.223 |
| photo-017 | Itron OpenWay digital smart electricity meter | — | 0.677 |
| text-08 | Teltonika TRB140 industrial LTE gateway | — | 0.590 |
| photo-010 | Apple iPad first-generation Wi-Fi tablet | 0.614 | 0.881 |
| photo-018 | vertical stainless steel fermentation tank | — | 0.113 |
| photo-012 | Honeywell 4600g wired handheld barcode imager | — | 0.747 |
| photo-020 | Western Digital My Passport Ultra portable external hard drive | — | 0.475 |
| photo-013 | Rosemount pressure transmitter with local display | — | 0.521 |
| photo-022 | wired industrial electrical control cabinet | — | 0.676 |
| photo-014 | cabled float level switch for an open tank | — | 0.482 |
| photo-023 | Siemens SIMATIC NET ESM TP80 industrial Ethernet switch | — | 0.771 |
| photo-015 | three-wire Pt100 RTD temperature probe | 0.759 | 0.744 |
| photo-032 | Siemens SIMATIC S7-300 wired PLC panel | — | 0.607 |
| photo-016 | Coriolis mass flow meter | — | 0.273 |
| photo-035 | wall-mounted fixed barcode price-check scanner | — | 0.820 |
| photo-019 | SanDisk Cruzer Titanium USB flash drive | 0.751 | 0.700 |
| photo-036 | process tank level sensor | 0.768 | 0.762 |
| photo-021 | industrial pushbutton operator station | — | 0.172 |
| photo-040 | installed refrigerant flow meter | — | 0.072 |
| photo-024 | plate-and-frame heat exchanger | 0.708 | 0.627 |
| photo-047 | manual quarter-turn shutoff valve | — | 0.885 |
| photo-031 | Teltonika TRM240 and TRM250 industrial cellular modems | — | 0.772 |
| photo-049 | Lantronix ETS32PR serial-to-Ethernet console server | — | — |
| photo-033 | Siemens SIMATIC ET 200S PROFINET remote I/O station | — | 0.262 |
| photo-050 | Ring video doorbell surveillance camera | — | 0.746 |
| photo-034 | WAGO 750-series modular industrial I/O station | — | — |
| text-02 | consumer Wi-Fi cloud surveillance camera | 0.577 | 0.325 |
| photo-037 | electrically actuated butterfly valve | — | 0.906 |
| text-03 | hygienic vibrating-fork point level switch | — | 0.705 |
| photo-038 | SanDisk Cruzer Blade USB flash drive | 0.732 | 0.747 |
| text-06 | USB-A flash drive with service files | 0.638 | 0.666 |
| photo-039 | industrial Ethernet and fibre switch | — | — |
| text-07 | Bluetooth handheld barcode scanner | — | 0.510 |
| photo-041 | cable-suspended float level switch | — | 0.644 |
| photo-042 | platinum resistance thermometer calibration probes | 0.890 | 0.261 |
| photo-043 | Rotronic temperature and humidity probe | — | 0.106 |
| photo-044 | Apple iPad sixth-generation tablet | 0.765 | 0.763 |
| photo-045 | Raspberry Pi 4 Model B single-board computer | — | 0.748 |
| photo-046 | Rosemount temperature transmitter and thermowell | — | 0.645 |

## Scoring notes

- Every attempted item contributes to gate accuracy, including cases with no gate answer. False accept and reject rates use only the corresponding answered labels. A gate rejection is a valid response and can be a classification error. Provider and stage errors are counted separately. Returned stages are scored even if a later stage fails.
- Labeled category, kind, area, Purdue level, flags, sizing and risk recall include missing predictions as misses. Placement coverage counts labeled devices with a recommendation. Never-place violation uses recommendations with at least one labeled forbidden area.
- Rule consistency runs both recommendations through the same asset and placement helpers and `evaluatePlacement` against the same seed. An unresolved footprint or network reference counts as a rule-check failure. Blocking means severity 4 or 5.
- Radio and port scores are micro-averaged over known lists. Ports use case, punctuation and common connector aliases. Size match uses normalized text and units without unit conversion. Risk tags are extracted from risk titles and descriptions with the same term patterns for both sides. A tag match does not verify the risk description.
- ATT&CK validity checks distinct cited IDs per item against ICS 20.1. It measures delivered citations. System IDs flagged and removed during grounding are recorded independently, including any that prompted revision.
- Wilson 95% intervals use the displayed denominators. For F1, the Wilson interval for Jaccard overlap is transformed to F1, so n is the total matched or unmatched labels. Label-level intervals are descriptive when several labels come from one capture.
- Differences are system minus baseline on eligible paired items. The 95% percentile bootstrap recomputes each statistic on 2,000 resamples of matched items. Small groups yield unstable or degenerate intervals. Latency includes gate rejections and failed executions with a measured time, excludes the offline judge and rule scoring, and uses linear interpolation.
- Both sides receive the same text or image bytes and the same product URL. Each side uses the project link fetcher for its own retrieval, so live pages can vary. Pipeline latency includes briefing when reached.
- Gemini HTTP attempts include retries and interaction retrievals. The paired capture cost excludes the offline type judge, product-page requests and unfinished pairs. A failed or rejected capture can use fewer calls than a completed placement.
- See `eval/dataset/SOURCES.md` for collection and provenance and `FAILURES.md` for case diagnoses.
