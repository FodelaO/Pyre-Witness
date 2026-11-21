<!-- Two-person run of the Pyre Witness on-call demonstration. -->
# On-call demo

## Before the demo

1. Put the laptop and the collaborator’s phone on the same Wi-Fi. Leave Pyre Witness open on the laptop.
2. Open the escalation bell and select **Pair phone**. Scan the QR with the collaborator’s phone and wait for **Phone paired** on the laptop. Leave the phone page in the foreground. Its link lasts 45 minutes.
3. On the phone, tap **Enable ringer**, raise media volume, and open **On-call contact**. Enter the destination engineer’s name and number, then tap **Save on this phone**. The number appears masked. Optionally save a **Paired responder label** in the laptop’s bell settings so its approval receipt identifies the collaborator.
4. Rehearse the threshold you’ll use. The untouched defaults are $100,000 per event and plant risk 60, with an additional trigger at eight points over baseline. The camera rehearsal below uses $25,000. Use the estimate the app displays on the day.

## Run of show

| Time | Laptop operator | Paired-phone collaborator |
| --- | --- | --- |
| 0–15 s | In **Describe**, enter “Indoor Wi-Fi IP camera. The vendor default password is enabled. Brittle plastic enclosure, IP20, explicitly non-food-grade.” Set the floor drop point inside Filler 3, then run the capture. | Keep the call page open. |
| When the camera appears | Set the loss threshold to **25000** in the bell popover. Call out the resulting **CAM-901** tag, room, and **est.** amount on the card. Tap **Call on-call**. | Let the incoming screen ring and tap **Answer**. |
| Next 10–25 s | Point to **Answered** on the laptop as the Chief reads the finding, loss, and proposed action. | Let the Chief speak, or read the displayed script aloud. Tap **Approve action** to apply the displayed change to the twin, or **Acknowledge** to record receipt. |
| Optional cellular take | Wait for **Calling on-call...**, then answer on the destination handset. | Tap **Call [engineer’s name]** and confirm dialing in the handset’s Phone app. Read the displayed script or use speaker audio if the handset supports it. |

Wait for the card before starting the voice timing. In a deterministic rehearsal of that camera description, the largest camera finding was about **$31k est.** The estimate depends on the detected specifications and drop point. The **Call placed from the paired phone · no carrier integration** label identifies who opens the dialer. The desktop records the tap. The seed rehearsal generated a **14.2-second** Chief briefing.

For the handoff, the laptop operator can say “CAM-901 at Filler 3. The estimate is [read the card]. I’m calling on-call.” After the briefing, the collaborator can say “I’ve received the alert. I’m approving [read the action] in the twin,” then tap the button.

## Fallbacks

- **No shared Wi-Fi.** Open **Read call script** on the laptop. The collaborator calls the engineer from their normal Phone app and reads it.
- **No audio.** Tap **Answer** and read the call script. The approval and acknowledgment buttons still work.
- **Threshold stays armed.** Check the selected device’s per-event estimate, then lower **Loss threshold (USD)** below it. For a repeatable run without a capture-model call, set it to **90000** on the seed twin. PLC-F3 in Filler 3 raises a roughly **$94k est.** alert. It can be acknowledged on the phone.
