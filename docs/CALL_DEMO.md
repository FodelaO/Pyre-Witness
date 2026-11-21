<!-- Two-person run of the Pyre Witness on-call demonstration. -->
# On-call demo

## Two-person test alert

1. **Presenter** — On the laptop, open the escalation bell, select **Add your phone**, and save your own international number. The collaborator will dial this number from their phone.
2. **Presenter and collaborator** — On the same Wi-Fi, the presenter clicks **Pair phone** and the collaborator scans the QR. Keep the phone page open and tap **Enable ringer**. The QR lasts 45 minutes.
3. **Presenter** — In the bell menu, click **Run test alert**. The default loss threshold is $100,000 per event. **TEST-901** raises a **TEST SCENARIO** card with a **$290k** estimated loss for the modeled path to **FIL-3**. If the phone is still unpaired, click **Pair a phone to call you** and let the collaborator scan that QR. Pairing delivers the waiting alert.
4. **Collaborator** — On **Incoming call**, tap **Call [name] · [masked number]**. The phone opens its dialer. Confirm the call if the OS prompts. The laptop shows **Calling on-call from the paired phone** when it receives the tap receipt.
5. **Presenter** — Answer on your own handset. After the demo, use **Clear test** in the bell menu if the gateway is still present.

**Answer** on the collaborator’s browser plays the optional Chief briefing. **Approve action** confirms the displayed twin update. The one-tap dialer flow runs without a model request.

## Optional camera rehearsal

| Time | Laptop operator | Paired-phone collaborator |
| --- | --- | --- |
| 0–15 s | In **Describe**, enter “Indoor Wi-Fi IP camera. The vendor default password is enabled. Brittle plastic enclosure, IP20, explicitly non-food-grade.” Set the floor drop point inside Filler 3, then run the capture. | Keep the call page open. |
| When the camera appears | Keep the default **$100,000** threshold. The panel showed **$290k** estimated loss in rehearsal. Read the current **CAM-901** estimate from the card. | Let the incoming screen ring. Tap **Call [name]** for a cellular call, or **Answer** for the Chief briefing. |
| Next 10–25 s | Point to **Answered** on the laptop as the Chief reads the finding, loss, and proposed action. | Let the Chief speak, or read the displayed script aloud. Tap **Approve action** to apply the displayed change to the twin, or **Acknowledge** to record receipt. |

Wait for the card before starting the voice timing. The estimate depends on the detected specifications and drop point. The seed rehearsal generated a **14.2-second** Chief briefing.

For the handoff, the laptop operator can say “CAM-901 at Filler 3. The estimate is [read the card]. I’m calling on-call.” After the briefing, the collaborator can say “I’ve received the alert. I’m approving [read the action] in the twin,” then tap the button.

## Fallbacks

- **Alternate destination** — **Call from this device** uses the laptop’s dialer or iPhone call relay. Use it when the saved number belongs to someone else.
- **No shared Wi-Fi.** Open **Read call script** on the laptop. The collaborator calls the engineer from their normal Phone app and reads it.
- **No audio.** Tap **Answer** and read the call script. The approval and acknowledgment buttons still work.
- **Threshold stays armed.** Check the selected device’s per-event estimate, then lower **Loss threshold (USD)** below it. For a repeatable run without a capture-model call, set it to **90000** on the seed twin. PLC-F3 in Filler 3 raises a roughly **$94k est.** alert. It can be acknowledged on the phone.

## Automatic calls

The paired-phone demo uses the collaborator’s cellular service. For optional automatic calling, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and a voice-enabled `TWILIO_FROM_NUMBER` in the server’s `.env`. Save a destination you own and select **Call this number when a threshold is crossed** before running the test. Twilio trial accounts require a verified destination and play a trial notice first. [Twilio trial limits](https://help.twilio.com/articles/360036052753)
