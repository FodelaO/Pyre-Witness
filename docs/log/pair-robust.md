# Phone pairing recovery

The pairing card defaults to an iPhone hotspot in `172.20.10.0/28`. Otherwise it keeps the first discovered address. The picker labels Wi-Fi, Tailscale, iPhone hotspot, and other networks. Reopening the card refreshes the Mac’s current addresses. Changing the selection updates the QR and full copyable link together.

The relay atomically renames a private, mode-0600 JSON file under `os.tmpdir()`, scoped to the OS user and listening port. It saves the pairing code, desk key, handset key, and original expiry. Contact details, dial targets, calls, and messages stay in memory. Startup and expiry timers remove expired entries. Reloading the same desk tab can restore its credential from session storage.

When the relay loses a previously paired handset, the desk shows **Phone not connected · Pair again**. The button opens a fresh link and discovers the current network. The original handset can also reconnect automatically while its pairing is valid.

## Files

- `src/app/api/escalation/info/route.ts` identifies Wi-Fi interfaces.
- `src/escalation/PairingCard.tsx`, `pairingAddresses.ts`, and `escalation.css` implement the picker, QR, link, and hint.
- `src/escalation/EscalationCall.tsx`, `AlertLadder.tsx`, `useCallPairing.ts`, `deskPairing.ts`, and `connection.mjs` handle dock status, address refresh, and reconnection.
- `src/escalation/relay.ts`, `pairingPersistence.ts`, and `protocol.ts` implement credential recovery and live presence.
- `src/escalation/PairingCard.test.ts`, `pairingAddresses.test.ts`, `pairingPersistence.test.ts`, and `AlertLadder.test.ts` cover the rendered card, address boundaries, restart recovery, expiry, and disconnects.

## Verification

- Run `npx tsc --noEmit` and `npx vitest run src/escalation`.
- Two separate Node processes using an isolated temporary directory recovered both original credentials and rejected a different handset.
- On port 4119, a live HTTP check registered a desk, loaded the handset page, joined both event streams, and observed the desktop receive the handset disconnect.
- The release on port 4120 still served the earlier address-info response at verification. Physical iPhone scanning and interactive browser verification remain outstanding. The sandbox blocked the local Chrome launch and the browser host was unavailable.

No shared-contract change requests.
