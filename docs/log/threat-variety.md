# Threat watch variety

Threat watch classifies the existing CISA ICS, KEV, NCSC and openFDA feed items by keywords. It uses the publisher's KEV ransomware flag and the openFDA source identifier when available. Unclassified items retain the Advisory label. Rows expose their evidence and loss breakdown on expansion.

Live items take precedence. If a returned category has no plant matches, one live item shows “No plant match.” Missing categories receive at most one visibly labeled Drill tied to existing twin equipment and priced as conditional loss through the economic twin. Drills stay outside the feed and review pipelines. The new-network-software example is a drill. This change adds no network discovery or software inventory collection.

Verify with `npx vitest run src/watch/vulnType.test.ts`, `npx tsc --noEmit`, and Data → Threat watch at `http://localhost:4119`.

The 12 focused tests and TypeScript passed. The local feed returned 46 items across four sources. Rendering the watch with that response showed all seven requested types, five visibly badged drills, and twelve prices. Browser launch was blocked by environment permissions, so interactive verification remains open.
