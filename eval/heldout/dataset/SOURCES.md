# Held-out evaluation data sources

The curator collected this held-out set on 2026-11-21 after the final Run 5 pipeline changes. All labels were fixed from the photos, Commons file descriptions, manufacturer documentation and the plant placement rules before any system run on these items. The set has never been used for tuning. The prior use of these public sources in model pretraining is unknown.

The images are existing third-party photographs from Wikimedia Commons. The Wikimedia Commons API supplied the source file page, author or required credit, and licence for each capture. The local JPEGs keep their original framing and were proportionally resized and converted or re-encoded as needed. Re-encoding and resizing retain the source licence. The harness sends photo bytes only.

| Local file | Commons file page | Author or required credit | Licence | Licence URL |
| --- | --- | --- | --- | --- |
| `images/ho-photo-01.jpg` | [Rut240 4G router.png](https://commons.wikimedia.org/wiki/File:Rut240_4G_router.png) | Sandra | CC BY-SA 4.0 | [Terms](https://creativecommons.org/licenses/by-sa/4.0) |
| `images/ho-photo-02.jpg` | [ABB ESB 20-20.JPG](https://commons.wikimedia.org/wiki/File:ABB_ESB_20-20.JPG) | Dmitry G | CC BY-SA 3.0 | [Terms](https://creativecommons.org/licenses/by-sa/3.0) |
| `images/ho-photo-03.jpg` | [Variable-Frequency-Inverter.jpg](https://commons.wikimedia.org/wiki/File:Variable-Frequency-Inverter.jpg) | Projuktiponno | CC BY-SA 4.0 | [Terms](https://creativecommons.org/licenses/by-sa/4.0) |
| `images/ho-photo-04.jpg` | [Flir E8-Thermal imaging camera-Thermographic camera-03ASD.jpg](https://commons.wikimedia.org/wiki/File:Flir_E8-Thermal_imaging_camera-Thermographic_camera-03ASD.jpg) | Asurnipal | CC BY-SA 4.0 | [Terms](https://creativecommons.org/licenses/by-sa/4.0) |
| `images/ho-photo-05.jpg` | [Yellow hard hat.jpg](https://commons.wikimedia.org/wiki/File:Yellow_hard_hat.jpg) | רנדום | CC BY-SA 3.0 | [Terms](https://creativecommons.org/licenses/by-sa/3.0) |
| `images/ho-photo-06.jpg` | [Irrigation valve assembly.JPG](https://commons.wikimedia.org/wiki/File:Irrigation_valve_assembly.JPG) | Nick Birse | CC BY-SA 4.0 | [Terms](https://creativecommons.org/licenses/by-sa/4.0) |
| `images/ho-photo-07.jpg` | [Working in analytical chemistry 6.jpg](https://commons.wikimedia.org/wiki/File:Working_in_analytical_chemistry_6.jpg) | Martin Schaier | CC BY 4.0 | [Terms](https://creativecommons.org/licenses/by/4.0) |
| `images/ho-photo-08.jpg` | [Netgear GS108 switch in tangled cables.jpg](https://commons.wikimedia.org/wiki/File:Netgear_GS108_switch_in_tangled_cables.jpg) | William Hook | CC BY-SA 2.0 | [Terms](https://creativecommons.org/licenses/by-sa/2.0) |
| `images/ho-photo-09.jpg` | [AC motor reverse without auxilary contacts - easy automatics for everyone.JPG](https://commons.wikimedia.org/wiki/File:AC_motor_reverse_without_auxilary_contacts_-_easy_automatics_for_everyone.JPG) | Dmitry G | CC BY-SA 3.0 | [Terms](https://creativecommons.org/licenses/by-sa/3.0) |
| `images/ho-photo-10.jpg` | [Amazon Echo Dot (RS03QR)-0479.jpg](https://commons.wikimedia.org/wiki/File:Amazon_Echo_Dot_(RS03QR)-0479.jpg) | © Raimond Spekking / CC BY-SA 4.0 (via Wikimedia Commons) | CC BY-SA 4.0 | [Terms](https://creativecommons.org/licenses/by-sa/4.0) |
| `images/ho-photo-11.jpg` | [Safety Goggles.jpg](https://commons.wikimedia.org/wiki/File:Safety_Goggles.jpg) | DJSparky | CC BY-SA 4.0 | [Terms](https://creativecommons.org/licenses/by-sa/4.0) |
| `images/ho-photo-12.jpg` | [DJI - Drohne Mavic Air 2.JPG](https://commons.wikimedia.org/wiki/File:DJI_-_Drohne_Mavic_Air_2.JPG) | C.Stadler/Bwag | CC BY-SA 4.0 | [Terms](https://creativecommons.org/licenses/by-sa/4.0) |
| `images/ho-photo-13.jpg` | [USB hub Gembird.jpg](https://commons.wikimedia.org/wiki/File:USB_hub_Gembird.jpg) | А. Кабанов | CC0 | [Terms](http://creativecommons.org/publicdomain/zero/1.0/deed.en) |

## Collector-authored text captures

The three descriptions are original project-authored text modeled on hurried engineering notes. They are part of this benchmark and may be redistributed with it.

- `ho-text-01` concerns a short temperature and humidity logging job. [Onset HOBO MX1101](https://www.hobodataloggers.com/products/data-loggers/mx1101).
- `ho-text-02` concerns a carton-counting photoeye. [Omron E3Z specifications](https://www.ia.omron.com/products/family/407/specification.html).
- `ho-text-03` concerns diagnostics on a 24 V loop. [Fluke 28 II Ex](https://www.fluke.com/en-us/product/intrinsically-safe/fluke-28-ii-ex).

## Product links

All four manufacturer URLs returned HTTP 200 with product facts in the HTML before JavaScript execution. The CSV republishes public URLs and original factual annotations. The linked page content, product imagery and documents remain with their publishers.

| Item | Publisher and product page | Materials represented in the dataset |
| --- | --- | --- |
| `ho-link-01` | [AXIS M2035-LE outdoor bullet camera](https://www.axis.com/products/axis-m2035-le) | URL and factual annotations only |
| `ho-link-02` | [Milesight UG65 LoRaWAN gateway](https://www.milesight.com/iot/product/lorawan-gateway/ug65) | URL and factual annotations only |
| `ho-link-03` | [KROHNE OPTIFLUX 6300 electromagnetic flow meter](https://www.krohne.com/en-us/products/flow-measurement/flowmeters/electromagnetic-flowmeters/optiflux-6300) | URL and factual annotations only |
| `ho-link-04` | [Shelly Plus Plug US smart outlet](https://kb.shelly.cloud/knowledge-base/shelly-plus-plug-us) | URL and factual annotations only |

## Device specification references

- `ho-link-01` [Axis product datasheet](https://www.axis.com/dam/public/cc/31/2a/datasheet-axis-m2035-le-bullet-camera-en-US-555402.pdf).

- `ho-photo-01` [Teltonika RUT240 product specifications](https://www.teltonika-networks.com/products/routers/rut240) and [Teltonika RUT240 quick start guide](https://wiki.teltonika-networks.com/view/QSG_RUT240).
- `ho-photo-02` [ABB ESB20 catalogue](https://library.e.abb.com/public/3ebde4646a954b979ce8fa711d8088a4/2CDC103023C0201.pdf).
- `ho-photo-03` [Mitsubishi Electric FR-D700 installation manual](https://dl.mitsubishielectric.com/dl/fa/document/manual/inv/en_231344/231344_ENG.pdf).
- `ho-photo-04` [FLIR product data collection](https://support.flir.com/DSDownload/Assets/T810226-en-US_A4-lr.pdf).
- `ho-photo-08` [NETGEAR GS108 specifications](https://www.netgear.com/business/wired/switches/unmanaged/gs108/).
- `ho-photo-10` [Amazon Echo Dot RS03QR specifications](https://digprjsurvey.amazon.co.uk/csad/help/node/G202084590).
- `ho-photo-12` [DJI Mavic Air 2 specifications](https://www.dji.com/support/product/mavic-air-2) and [DJI user manual](https://dl.djicdn.com/downloads/Mavic_Air_2/20240528UM/Mavic_Air_2_User_Manual_v1.6_EN.pdf).

## Label review before the first run

Before any system saw these items, the orchestrator compared the labels with dev-set conventions and changed two things. `ho-photo-02`, `ho-photo-03` and `ho-photo-09` (contactor, drive and reversing-contactor panels) now accept Purdue `0;1`, matching the dev set's pump-and-drive label. `ho-photo-12` (camera drone) moved from Purdue `5` to `4` and also accepts `corporate_office` for storage, matching how the dev set labels portable wireless devices. No other label changed.
