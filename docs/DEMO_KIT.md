# Pyre Witness demo kit

Use a judge’s device first. Start on **Material** with the Filler 3 pin. The kit contains capture inputs for a live run on the simulated Line 3 twin. The rehearsal observations below help the presenter pick an input.

## Photo inputs

Click **Samples** and choose a thumbnail to start analysis at the current pin. For manual upload, use **Upload**, pick the JPEG, then **Analyze**. After an assessment, use **New capture** to return to the dock. Hover over a thumbnail for its credit. [Photo credits](../public/demo/credits.json)

| Input | Load | Placement · never here | Top as-dropped rules finding | Est. change if moved | Seconds | Story beat |
| --- | --- | --- | --- | ---: | ---: | --- |
| [IP camera](../public/demo/ip-camera.jpg) | Samples → IP camera | Corporate office, L4 · Filler 3 | Camera may disclose operator information | −$31k | 25.3 | Camera sightline |
| [LTE router](../public/demo/lte-router.jpg) | Samples → LTE router | Corporate office, L4 · Filler 3 | Safety-critical asset reachable. Wireless within untrusted reach. | −$290k | 25.3 | Radio near the parking lot |
| [USB drive](../public/demo/usb-drive.jpg) | Samples → USB drive | Corporate office, L4 · Filler 3 | Removable media in OT | −$31k | 26.2 | Removable media review |
| [Access point](../public/demo/access-point.jpg) | Samples → Access point | Corporate office, L4 · Filler 3 | Washdown or food-contact design gap | −$23k | 31.8 | Physical zone fit |
| [Phone](../public/demo/phone.jpg) | Samples → Phone | Corporate office, L4 · Filler 3 | Washdown or food-contact design gap | −$31k | 18.6 | A familiar device in a plant |
| [Mug](../public/demo/mug.jpg) | Samples → Mug | Corporate office after revision · Filler 3, Syrup room | Foreign-material risk near open product | −$31k | 28.1 | Passive object and rules revision |

For the **radio** beat, use the LTE router and show modeled reach from the parking lot. For the **passive object** beat, use the mug and show the food-safety finding. Run 3 recorded one revision in these six photos when the rules engine blocked the mug’s first recommendation. The current mug rehearsal cleared Corporate office on the first recommendation in 10.0 s. It flagged Filler 3 and the food-grade washdown area and estimated a −$31k change if moved. The cloud printer below produced a live **hold**.

The Phone row is from a live tray rehearsal. The other rows use Run 3 from earlier today. Loss was re-estimated from the saved rules checks. [Run 3 manifest](../eval/runs/2026-11-21T18-15-30-504Z-5IOMF9/manifest.json)

## Product links and descriptions

Click **Product link** or **Describe device**, paste the input, then click **Analyze**. [Copyable inputs](../demo/kit/captures.json)

| Input | Load | Placement · never here | Top as-dropped rules finding | Est. change if moved | Seconds | Story beat |
| --- | --- | --- | --- | ---: | ---: | --- |
| [TP-Link VIGI C340](https://www.vigi.com/ph/business-networking/vigi-network-camera/vigi-c340/) | Product link → Analyze | Parking lot / outside wall, L5 · Filler 3 | Camera may disclose operator information | −$28k | 67.7 | Where a camera faces matters. |
| [Teltonika TRB140](https://teltonika.gnshk.com/en/shop/trb140/) | Product link → Analyze | Control room, OT DMZ · Filler 3 | Wireless within untrusted reach. Default credentials remained flagged at the recommended location. | −$28k | 25.7 | Radio near the parking lot and factory-default credentials. |
| [Endress+Hauser Cerabar PMP23](https://www.us.endress.com/en/field-instruments-overview/pressure/Absolute-gauge-Cerabar-PMP23) | Product link → Analyze | Blending & carbonation, L0 · Filler 3 | Washdown or food-contact design gap | −$15k | 30.2 | A process instrument still has installation constraints. |
| A contractor's service laptop with a USB 4G dongle still on its factory-default admin password, brought in to diagnose Filler 3. | Describe device → Analyze | Control room, OT DMZ · Filler 3 | Wireless within untrusted reach. Default credentials remained flagged at the recommended location. | −$28k | 22.4 | Rotate the default password before connection. |
| A battery-powered wireless vibration sensor for the Filler 3 motor, with its washdown and enclosure ratings unverified. | Describe device → Analyze | Filler 3, L0 · Food-grade washdown area | Washdown or food-contact design gap remained at the recommended point. | $0 | 20.1 | A dry mounting point and washdown rating require separate checks. |
| A cloud-connected Wi-Fi label printer for Packaging that receives print jobs from its vendor's hosted service. | Describe device → Analyze | **Hold.** Control room, OT DMZ is a review option · Filler 3 | Safety-critical asset reachable as dropped. Wireless reach blocked the Packaging proposal. | — (held) | 97.6 | Cloud access and a genuine rules-engine hold. |

Seconds measure time to checked placement. The dollar figures are estimated changes in single-event loss if moved, using assumed (simulated plant) figures.

## Model the twin

Open **Model the twin** and drop a source. Review the cited additions and any unplaced items before approving.

- Five-asset CSV for inventory ingest. The live run proposed all five additions with citations to lines 2–6 in 27.3 seconds. [Inventory CSV](../demo/kit/new-assets.csv)
- [Site-walk notes](../demo/kit/site-walk-notes.txt) for room and tag evidence.
- [One-page datasheet](../demo/kit/datasheet.pdf) for the Filler 3 remote I/O adapter.

The inventory and installation details are assumed (simulated plant).

## When a judge hands you anything

| Input | Presenter move |
| --- | --- |
| Their device | **Phone QR** → scan on the same Wi-Fi → choose or take 1–3 device photos → **Send to laptop**. An empty, idle desktop draft starts automatically. If the photos arrive in a draft, click **Analyze**. Use **Camera** if the laptop camera has a clearer view. |
| A face | Frame the device on its own. A people-only capture should stop at the gate or Scout and ask for an identifiable object. |
| A blank wall | Expect the same retake or description prompt. Give Scout a clear object against the wall. |
| A mug | Use Filler 3 to surface food safety. A readable mug gets a physical assessment and can be moved outside production. |
| A laptop sticker | Take the whole-device shot first and a readable label or port close-up second. Treat a visible model label as evidence. Hidden interfaces remain unknown. |

## Presenter pre-flight

- [ ] Open the Gemini health chip. Confirm **Gemini OK** and target **10/10** with the on-demand services included.
- [ ] Start on **Material** and confirm the intended Filler 3 pin.
- [ ] Open **Watch**, confirm today’s run is **Complete**, and use **Run now** before the demo if needed.
- [ ] Pair the phone on the venue Wi-Fi and confirm the laptop receives a photo.
- [ ] Turn up speakers and check Chief audio playback.
