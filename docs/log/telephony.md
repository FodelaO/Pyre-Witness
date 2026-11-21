<!-- Implementation and verification record for paired-phone dialing. -->
# Telephony

The desktop escalation settings collect an optional name and international number, store them locally, and display the number masked. The form uses a telephone input with autocomplete off and masks the digits on blur. The first active alert offers the form once. **Run test alert** also opens the form while the contact is missing.

The desktop uses the LAN pairing to ring a connected handset automatically. A waiting alert offers **Pair a phone to call you** and rings when the handset joins. The desktop sends the contact in the private, validated destination field on the ring POST. Only the authenticated handset can retrieve the dial link through a POST response. The event stream carries an opaque destination version. The handset displays a masked label and drops its link after the tap. The relay clears the destination on handoff, revocation, resolution, acknowledgment, approval, or expiry.

One tap on the handset requests the system dialer. The handset shows **Dialer opened** and **Call placed from the paired phone · no carrier integration**. The desktop records the tap and displays **Calling on-call from the paired phone**. One selector keeps the desktop card and the paired ring on the same record. The active paired alert stays in view until it ends. Chief **Answer** and **Approve action** are available on the same handset. **Call from this device** provides the desktop dialer option. The carrier service remains dormant without server configuration.

## Seed evidence

**TEST-901** adds a labeled gateway alongside **PLC-F3** in the simulated twin. The desktop and handset label the estimate with the rules-engine path to **FIL-3**. That path has an underlying modeled mean loss of $274,573 and a rounded ledger total of **$290,000 est. per event**. Both cross the default $100,000 loss threshold. Plant risk goes from **46.09** to **50.54**. **Clear test** removes the gateway, restores the baseline risk, and resolves the alert. The test script begins with **This is a Pyre Witness test.** The script reads a path title as its entry and target, **Attack path from Nearby RF (parking lot) to FIL-3**, followed by the estimate. The script doesn't cut the path partway through.

## Verification

- **TypeScript** — npx tsc --noEmit passed for the repository on the Opus correction pass.
- **Vitest** — 44 tests passed across 12 escalation and relay test files. Coverage includes alerts raised together, shared selection while a call is active, path titles and their spoken form, number masking, role checks, dial-before-answer, expiry and revocation, and the seed threshold and clear.
- **Running app** — At port 4119, two authenticated HTTP clients and a DOM harness using the served handset module verified late pairing, the priced path title, the exact fake tel URI, the masked control, the restored receipt, removal of the link after the intercepted tap, and the resolved state. curl verified the masked device-mode response and the retired roster asset returned 404. The dialer rehearsal made zero model or carrier requests.
- **Browser (Opus correction pass)** — Playwright ran the installed Chrome with a 1440x900 laptop and a 390x844 phone, using the fake number **+1 555 0100**, with `tel:` intercepted and the watch run blocked. Checks passed for the following:
  - The telephone input renders as discs on blur.
  - The test card and the ringing phone show the same **$290k** path to **FIL-3**.
  - One tap produces `tel:+15550100`, **Dialer opened**, the restored receipt, and **Calling on-call from the paired phone**.
  - **Clear test** resolves both screens.
  - With the threshold lowered to $25,000, the card and the ring stayed on the same alert. After the threshold was restored, the queued test alert moved to the phone.
  - No request URL and no visible text carried the number.

  Screenshots are in `.agents/qa/opus-correct/telephony-review-fixes/`. A physical cellular connection remains unverified.

The live card and handset display **TEST SCENARIO**. The exact drawing-label edits for the floor, Purdue, and 3D views are in [Mounting](../../src/escalation/MOUNTING.md). [Two-person demo steps](../CALL_DEMO.md)
