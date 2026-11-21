# To-do engine

`src/todo/useTodos.ts` exposes one ranked list for the right pane. The shared mitigation queue carries pending ordinary, simulation, and admitted threat-watch proposals. The current capture adds “Move there” only after its recommendation passes the rules-engine placement check. The move uses the checked wiring and placement and revalidates them at approval.

Each row projects the live plant configuration with the existing effects, rules engine, and annual loss model. Both deltas are after minus before. Sort by risk reduction, then annual loss reduction. The rules engine proposes defensive controls from current findings and routes, including site boundary enforcement, limiting exposed access, and adding safeguards. Approvals update the twin immediately and keep queued decisions in the mitigation ledger.

Run `npx vitest run src/todo` and `npx tsc --noEmit`. The focused suite checks the ranking, source admission, approval, and prediction parity for the highest-impact control and a capture move. In the running app, selecting the top approval changed the dial from 46 to 24. The underlying score changed from 46.09 to 24.34, and estimated annual exposure fell by about $77,829.

Advisories without modeled effects show zero change. The economics are modeled plant exposure. The existing effect contract supports applying safeguards to existing assets, and this engine currently emits no purchase rows. No shared contract changes were needed.
