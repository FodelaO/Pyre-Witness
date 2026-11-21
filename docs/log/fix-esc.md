# Escalation fixes

| Bug | Changed behavior | Regression |
| --- | --- | --- |
| ESC-05 | HMI-F3 and PT-401 receive review notes. Gateway removal checks the rehearsal identity at planning, confirmation and application. | limits rehearsal removal to its own gateway |
| ESC-04 | Plant-risk tiers use score and baseline change. The $94,000 PLC finding produces one call at the $45,000 threshold. | rings once for the PLC finding |
| ESC-01 | The dock keeps PLC-F3 in the Call row and shows TEST-901 queued until the handset response. | queues the test behind the active handset call |
| ESC-02 | An occupied TEST-901 tag blocks the rehearsal. Clear checks ownership. The inventory repro retained the HMI and its 46.52 risk score. | preserves inventory that occupies the rehearsal tag |
| ESC-03 | An unanswered call shows “Waiting for phone” when the relay reports a disconnect. | shows waiting when the ringing handset disconnects |

Each regression failed before its fix. Run `npx tsc --noEmit` and `npx vitest run src/escalation src/app/api/escalation`. All 61 tests passed.

The supplied Slack, ladder and inventory repros ran locally. The Slack repro captured the outgoing payload in memory. The handset repro ran against the development relay with `node --import tsx .agents/bugs/astra/pyre-find-escalation.Wbvem4/find-escalation/handset.cjs http://localhost:4119`. This exercised the handset module and the rendered dock. Physical handset audio and external Slack delivery were outside the checks.

The ladder repro explicitly resubmits the completed call after its response. The relay acknowledges a duplicate ID idempotently. The only high-tier record in the seed run was `finding:PLC-F3:SAFE-01`. No shared contract changes were required.
