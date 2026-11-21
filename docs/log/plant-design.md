# North Beverage Facility, Line 3

Fictional 36,000 bottle/h cola line on a 160 × 100 m floor. The water, syrup, blend and utility rooms occupy the north block. Bottles run west to east through filling and packaging. The south observation corridor is outside the production rooms and faces the parking lot. HMI-F3 is at the observation window on the production side. PLC-F3 is deeper inside. The ammonia machinery overlay sits within utilities, and the washdown overlay sits within Filler 3.

## Process design basis

| Stream or system | Nominal production state |
| --- | --- |
| Line output | 36,000 × 0.500 L = **18.000 m³/h**. Use 18,792 kg/h of CO₂-free beverage liquid for recipe accounting, equivalent to about 1,044 kg per cubic metre filled before counting dissolved gas mass. |
| Syrup batch, cycle average | 1,676.848 kg/h treated water + 1,961.952 kg/h dry sugar + 50.000 kg/h concentrate at 60 °Bx equivalent = **3,688.800 kg/h finished syrup at 54.0 °Bx**. The 50 kg/h concentrate contributes 30 kg/h dissolved solids and 20 kg/h water. |
| Blend | 3,688.8 kg/h syrup + 15,103.2 kg/h direct treated water = 18,792 kg/h. The 1,991.952 kg/h soluble solids give **10.6 °Bx**. At ~1,252 kg/m³ syrup and ~1,000 kg/m³ water, the input flows are 2.946 and 15.103 m³/h, about **1:5.13 by volume**. Output volume uses finished-beverage density. |
| Water treatment | 24.000 m³/h RO feed = 18.000 m³/h permeate + 6.000 m³/h reject at **75% recovery**. RO is rated for 20 m³/h permeate. Nominal treated consumption is 16.780 m³/h for the recipe plus 1.220 m³/h for bottle rinse. |
| Carbonation | At **3.7 volumes and 3 °C**, 18 m³/h beverage binds about 131 kg/h CO₂ using standard gas at 0 °C and 1 atm. The metered 135 kg/h includes about 4 kg/h for filling and purge loss. The vaporizer is rated 200 kg/h. |
| Refrigeration | Cooling 18,792 kg/h of liquid from 22 to 3 °C at approximately 3.95 kJ/(kg·K) takes ~392 kW. The loop moves ~420 kW at 78 m³/h, ~1,040 kg/m³, 3.73 kJ/(kg·K), and **−4 °C supply / +1 °C return**. Two 500 kW NH₃ compressors are duty/standby. The 680 kW evaporative condenser rejects compressor plus evaporator heat. |
| Filler CIP | 3,000 L make-up/recovery tank, ~2.0% w/w NaOH, 75–80 °C, and 22 m³/h during the cleaning phase. The production snapshot shows zero CIP flow, V-311 closed and proved, and the supply and return isolated. CT-210 retains the last final-rinse reading. |
| Packaging | 24 bottles/tray gives 1,500 trays/h. At 48 trays/pallet, nominal production is 31.25 pallets/h. |

The filler uses cold counter-pressure filling. V-311 is a fail-closed mixproof valve. Its hardwired position feedback is part of the product/CIP permissive. The secondary glycol circuit confines NH₃ to the utility block. The NH₃ detector and shutdown outputs use hardwired safety I/O. Electrical equipment in the modeled NH₃ overlay is specified to Class I, Division 2, Group D. The model uses nominal instrument readings and operating bands as a production snapshot. [GEA mixer and carbonator](https://www.gea.com/en/products/liquid-processing/carbonating/dimix-mixer-carbonator/) · [DuPont RO recovery technical note](https://www.dupont.com/content/dam/water/amer/us/en/water/public/documents/en/RO-FilmTec-Additional-Information-TechFact-45-D04931-en.pdf) · [Tetra Pak CIP unit](https://www.tetrapak.com/content/dam/tetrapak/media-box/global/en/processing/technology-area-general/cip/documents/cip-unit-pd-leaflet.pdf) · [OSHA ammonia refrigeration standards](https://www.osha.gov/ammonia-refrigeration/standards)

## Equipment register

| Area | Assets | Tags |
| --- | ---: | --- |
| Water treatment | 14 | TK-101, P-101, RO-101, UV-101, TK-102, P-102, V-103, LT-101, PT-102, FT-101, CT-101, LT-102, PLC-WT, SW-WT |
| Syrup room | 11 | TK-201, P-201, TK-202, P-202, TK-203, P-203, TT-201, LT-203, DT-203, PLC-SY, SW-SY |
| Blending and carbonation | 15 | BL-301, CC-301, P-301, DT-301, QT-301, TT-301, PT-301, TK-311, P-311, V-311, ZSC-311, CT-210, TT-311, PLC-BL, SW-BL |
| Filler 3 | 12 | CV-301, FIL-3, CV-302, VIS-F3, CV-303, PLC-F3, HMI-F3, SW-F3, PT-401, TT-402, FT-403, LT-404 |
| Packaging | 10 | CV-P1, LBL-3, CV-P2, TPK-3, CV-P3, PAL-3, GW-PK, PLC-PK, HMI-PK, SW-PK |
| Utilities outside the NH₃ overlay | 8 | TK-401, HX-401, PT-405, TK-402, P-402, TT-401, PLC-UT, SW-UT |
| NH₃ overlay | 6 | C-1, C-2, EC-401, R-401, EV-401, GT-401 |
| Restricted control room | 10 | SCADA-03, HIST-03, OPS-01, OPS-02, ENG-03, SW-OT, FW-DMZ, SW-DMZ, HIST-DMZ, JMP-DMZ |
| Corporate office | 6 | FW-EDGE, SW-IT, ERP-01, IT-WS1, IT-WS2, AP-IT |

There are **92 assets, 13 floor areas and six entry points**. The 75 connections comprise 8 water, 6 syrup, 3 product, 2 CO₂, 4 glycol, 6 ammonia, 5 CIP, and 41 Ethernet cables. Power is outside the seed's connection scope. In plan view, separate pipes may cross on different elevations of the same rack. The route tests distinguish those crossings from pipes through unrelated equipment.

## Purdue zones and conduits

| Boundary | Enforcement and permitted use |
| --- | --- |
| Internet / Cloud (L5) ↔ Enterprise (L4) | `C-WAN-ENT` through `FW-EDGE`. Outbound HTTPS and the managed vendor VPN. L5 is represented by entry points. |
| Enterprise ↔ OT DMZ (L3.5) | `C-ENT-DMZ` through `FW-DMZ`. HTTPS from ERP to the historian replica and approved VPN sessions to the MFA jump portal. |
| OT DMZ ↔ Site operations (L3 and supervisory consoles at L2) | `C-DMZ-OPS` through the same three-interface firewall. Read-only OPC UA historian replication, signed patch pull, and approved time-limited engineering sessions. |
| Site operations ↔ Cell Water, Cell Syrup, Cell Blend, Cell F3, Cell Pack, Cell Utilities (L0–L2) | `C-OPS-WATER`, `C-OPS-SYRUP`, `C-OPS-BLEND`, `C-OPS-F3`, `C-OPS-PACK`, and `C-OPS-UTIL` through routed `SW-OT` ACLs. SCADA uses named endpoints over OPC UA or EtherNet/IP. Cell-local Modbus TCP and PROFINET stay on their respective production networks. |
| Cell F3 ↔ Cell Pack | `C-F3-PACK`. The legacy Layer 2 cable bridges the access VLANs. The core still routes separate IP subnets. |

Asset profiles distinguish Ethernet endpoints, local analog/discrete instruments, and passive equipment. A null asset conduit means the inventory assigns no boundary crossing to that asset. [NIST SP 800-82 Rev. 3](https://csrc.nist.gov/pubs/sp/800/82/r3/final)

The three deliberately modeled weaknesses are:

- `C-F3-PACK` bypasses the routed intercell ACL.
- `GW-PK` is the palletizer OEM's cellular maintenance modem outside the managed DMZ.
- `HMI-F3` accepts removable service media on its exposed floor-side USB port at the observation window.

## Verification and scope

`npm run typecheck` passed. `npx vitest run src/twin` passed all seven seed checks, covering uniqueness, references, symbol and tag clearance, orthogonal and unobstructed piping, mass balance, and production CIP isolation. The full test run passed 19 tests. The current Inspector evaluates this seed at **46.09/100 (elevated)**. The app route on port 4119 returned HTTP 200. The bootstrap floor renderer still needs to apply asset scale and display pipe routes. The browser interaction check was blocked by the local Chrome launcher.

The seed is a schematic inventory. Bottle transfers and hardwired signals appear in asset descriptions. Off-sheet systems include RO reject, bottle-rinse discharge, CIP rinse/drain services, and syrup-jacket utilities. Equipment capacities and setpoints are fictional design assumptions. No shared-contract changes were requested.
