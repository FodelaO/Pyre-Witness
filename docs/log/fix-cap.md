# Capture regressions

**CAP-01.** The serial-console PLC previously qualified for an estimated $4,462/year from turning off Wi-Fi. The same repro now produces no radio-off candidate and no Carbon change. Both use the same check for a documented wired network port and stated radio requirements. The existing wired-camera test fixture now identifies its RJ45 port as Ethernet.

**CAP-05.** Asset projection and final risk enrichment share one removable-media evidence check. Both negated flash descriptions in the audit now project to `false` and produce no USB-01 finding. A documented SD slot or removable-storage device still supplies positive evidence.

The colocated regressions failed before the fixes. To verify, run `npx tsc --noEmit` and `npm run test -- src/alternatives src/pipeline`. Run the audit's `profile-evidence.cjs` with `node --require tsx/cjs` for each of `wifi` and `storage`. Verification covers the deterministic production paths. These checks interpret captured profile text. They do not verify physical wiring. No contract changes.
