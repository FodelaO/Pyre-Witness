<!-- Implementation and verification record for paired-phone dialing. -->
# Telephony

The desktop escalation settings collect an optional name and international number, store them locally, and display the number masked. The first active alert offers the form once. **Run test alert** also opens the form while the contact is missing.

The desktop uses the LAN pairing to ring a connected handset automatically. A waiting alert offers **Pair a phone to call you** and rings when the handset joins. The desktop sends the contact in the private, validated destination field on the ring POST. Only the authenticated handset can retrieve the dial link through a POST response. The event stream carries an opaque destination version. The handset displays a masked label and drops its link after the tap. The relay clears the destination on handoff, revocation, resolution, acknowledgment, approval, or expiry.

One tap on the handset requests the system dialer. The desktop records the tap and displays **Calling on-call from the paired phone**. Chief **Answer** and **Approve action** are available on the same handset. **Call from this device** provides the desktop dialer option. The carrier service remains dormant without server configuration.

## Seed evidence

**TEST-901** adds a labeled gateway alongside **PLC-F3** in the simulated twin. A rules-engine path to **FIL-3** has an underlying modeled mean loss of $274,573 and a rounded ledger total of **$290,000 est. per event**. Both cross the default $100,000 loss threshold. Plant risk goes from **46.09** to **50.54**. **Clear test** removes the gateway, restores the baseline risk, and resolves the alert. The test script begins with **This is a Pyre Witness test.**

## Verification

- **TypeScript** — npx tsc --noEmit passed for the repository.
- **Vitest** — 41 tests passed across the 11 escalation and relay test files. Coverage includes number masking, the allowed ring field, role checks, dial-before-answer, expiry and revocation, the seed threshold and clear, and the dormant provider path.
- **Running app** — At port 4119, two authenticated HTTP clients and a DOM harness using the served handset module verified late pairing, the exact fake tel URI, the masked control, the receipt, removal of the link after the intercepted tap, and the resolved state. curl verified the masked device-mode response. The dialer rehearsal made zero model or carrier requests.
- **Browser verification pending** — Installed Chrome aborted at launch. Cached Chromium builds failed at macOS Mach-port registration, and the native Chrome fallback timed out. The two-viewport Playwright run and screenshots remain pending. A physical cellular connection also remains unverified.

The live card and handset display **TEST SCENARIO**. The exact drawing-label edits for the floor, Purdue, and 3D views are in [Mounting](../../src/escalation/MOUNTING.md). [Two-person demo steps](../CALL_DEMO.md)
