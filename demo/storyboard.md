# Pyre Witness demo

The cut is 58 seconds. Large captions stay at the lower left for at least three seconds. The only accelerated footage is waiting for the live assessment and it carries an `x4` label. The plant and its process readings are simulated. The photo assessment and news footage come from the running app on port 4120.

| Video time | Shot |
| --- | --- |
| 00:00–00:04 | Title card. “Snap any device. See where it belongs and what risk it brings.” |
| 00:04–00:14 | Upload a Siemens SIMATIC S7-300 photo. The location is pinned on the filler side of the packaging approach. The app returns to 3D after setting the pin. |
| 00:14–00:26 | Scout reads the real photo and the rules engine checks the placement. Show the controller dropping onto the 3D plant. |
| 00:26–00:36 | Show the checked risk and event loss in plain words. Move the controller to the checked destination and show the resulting estimate and score. |
| 00:36–00:45 | Show the running 3D plant, select the finished syrup tank and read its simulated level and temperature. |
| 00:45–00:54 | Open monitoring from the green dot. Hold on a priced CISA advisory and a priced FDA beverage recall. |
| 00:54–00:58 | End card with the model jobs and repository URL. |

The uploaded image is `eval/dataset/images/photo-032.jpg`. Run 4 and Run 5 both record `physical_kind: plc_cabinet` for that file. The photo credit appears during upload. [GiovanniLibonati, *Plcmundi clp tipical aplication.jpg*](https://commons.wikimedia.org/wiki/File:Plcmundi_clp_tipical_aplication.jpg) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0).

`demo/out/timeline.json` records frame-accurate times and speeds. `demo/out/manifest.json` records the source URL, build marker, and observed facts for each take.
